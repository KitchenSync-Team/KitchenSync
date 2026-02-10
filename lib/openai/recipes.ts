import OpenAI from "openai";

import type { NormalizedRecipe } from "@/lib/recipes/types";
import {
  standardizedRecipeSchema,
  type StandardizedRecipeDetails,
} from "@/lib/recipes/standardized";

type StandardizeInput = {
  recipeId: number;
  normalized: NormalizedRecipe;
  sourcePayload: unknown;
};

const PREFERRED_MODEL = process.env.OPENAI_RECIPE_MODEL ?? "gpt-5.1";
const FALLBACK_MODEL = process.env.OPENAI_RECIPE_FALLBACK_MODEL ?? "gpt-4.1-mini";
const PROMPT_VERSION = "2025-02-15";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const openAiApiKey = process.env.OPENAI_API_KEY;
const openaiClient = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null;

const cache = new Map<
  string,
  { data: StandardizedRecipeDetails; expiresAt: number }
>();
const inflightRequests = new Map<string, Promise<StandardizedRecipeDetails>>();
const rateLimiterQueue: Array<() => void> = [];
let currentConcurrentRequests = 0;
const MAX_CONCURRENT_REQUESTS = Number(process.env.OPENAI_CONCURRENCY ?? 2);

const SYSTEM_PROMPT = `You are a culinary data normalization specialist for KitchenSync.
Return ONLY valid JSON matching the required schema. No markdown, no prose.

Primary goals:
1) Preserve meaning from source ingredients/instructions exactly.
2) Normalize for readability without losing substitutions, alternatives, or dietary notes.
3) Prevent punctuation artifacts and malformed display text.

Output requirements:

INGREDIENTS
- Keep "name" as the core ingredient only, in Title Case, with no trailing punctuation.
- Put numeric amount in "quantity" (number only) and unit in "unit" (short readable text).
- Put preparation details in "preparation" (e.g., minced, chopped, softened).
- Put substitutions, alternatives, dietary notes, and parenthetical hints in "notes".
- Never drop meaningful source qualifiers if they affect diet/allergen suitability.

TEXT CLEANUP RULES (critical)
- Do not include trailing commas, dangling punctuation, or duplicate punctuation in any field.
- No ingredient line should end with comma-only artifacts (e.g., "1 cup of milk,").
- Use plain ASCII punctuation.
- Remove formatting noise while preserving meaning.

UNITS / QUANTITIES
- Convert fractions to decimals where possible (1/3 -> 0.33, 1/2 -> 0.5).
- Keep unit labels consistent and neutral in "unit" (e.g., "cup", "tsp", "lb").
- If quantity is unknown, use quantity: null and keep context in "notes".

STEPS
- Keep each step concise and imperative.
- Preserve safety or dietary-relevant tips.
- If source includes a substitution tip, include it in either step "tips" or ingredient "notes" (prefer ingredient "notes" when ingredient-specific).

METADATA
- Preserve diets/tags from source when present.
- Do not infer unsupported diets beyond source data.

QUALITY CHECK BEFORE RETURN
- Every string is trimmed.
- No value ends with "," or ";".
- No empty placeholder text.
- JSON parses and conforms to schema exactly.`;

export async function standardizeRecipeDetails(
  input: StandardizeInput,
): Promise<StandardizedRecipeDetails | null> {
  if (!openaiClient || !openAiApiKey) {
    return null;
  }

  const modelsToTry = [PREFERRED_MODEL];
  if (FALLBACK_MODEL && !modelsToTry.includes(FALLBACK_MODEL)) {
    modelsToTry.push(FALLBACK_MODEL);
  }

  for (const model of modelsToTry) {
    const cacheKey = `${input.recipeId}:${model}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const inflightKey = `${cacheKey}:inflight`;
    const inflight = inflightRequests.get(inflightKey);
    if (inflight) {
      try {
        return await inflight;
      } catch {
        inflightRequests.delete(inflightKey);
      }
    }

    try {
      const promise = requestStandardization({
        model,
        input,
      });
      inflightRequests.set(inflightKey, promise);
      const standardized = await promise;

      cache.set(cacheKey, {
        data: standardized,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      inflightRequests.delete(inflightKey);

      return standardized;
    } catch (err) {
      inflightRequests.delete(`${cacheKey}:inflight`);
      console.error(`OpenAI standardization error (model ${model}):`, err);
      if (!isModelMissingError(err)) {
        return null;
      }
      // try next model
    }
  }

  return null;
}

export function buildFallbackStandardized(
  input: StandardizeInput,
): StandardizedRecipeDetails | null {
  const instructions =
    normalizeAnalyzedInstructions(input.sourcePayload) ??
    normalizeInstructionText(input.normalized.instructions);

  const ingredients = normalizeIngredients(input.normalized);

  const metadata: StandardizedRecipeDetails["metadata"] = {
    title: input.normalized.title,
    summary: null,
    servings: toOptionalNumber((input.sourcePayload as { servings?: unknown })?.servings),
    prepMinutes: null,
    cookMinutes: null,
    totalMinutes: input.normalized.readyInMinutes ?? null,
    cuisines: [],
    diets: input.normalized.diets ?? [],
    tags: [],
  };

  if (!ingredients && !instructions) {
    return null;
  }

  return {
    metadata,
    ingredients: ingredients ?? [],
    steps: instructions ?? [],
    equipment: [],
    nutrition: undefined,
    notes: [],
    source: {
      id: input.recipeId,
      url: input.normalized.sourceUrl ?? undefined,
      provider: "spoonacular",
    },
    model: {
      name: "fallback",
      promptVersion: PROMPT_VERSION,
    },
  };
}

function safeStringify(value: unknown, maxLength = 12000) {
  const raw = JSON.stringify(value ?? {});
  if (raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength)}...(truncated)`;
}

async function requestStandardization({
  model,
  input,
}: {
  model: string;
  input: StandardizeInput;
}): Promise<StandardizedRecipeDetails> {
  if (!openaiClient) {
    throw new Error("OpenAI client not configured");
  }

  await acquireRateLimiterSlot();

  try {
    const completion = await executeWithBackoff(() =>
      openaiClient.responses.create({
        model,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) },
        ],
        max_output_tokens: 2000,
        text: { verbosity: "low" },
      }),
    );

  const message = normalizeResponseText(completion.output_text);
  if (!message) {
    throw new Error("OpenAI did not return content");
  }

  const parsed = JSON.parse(message) as unknown;
  const parsedObject = isRecord(parsed) ? parsed : {};
  const normalizedParsed = ensureSchemaDefaults(parsedObject, input);
  const parsedSource = isRecord(parsedObject.source) ? parsedObject.source : {};
  const parsedModel = isRecord(parsedObject.model) ? parsedObject.model : {};

  const parsedOutput = standardizedRecipeSchema.parse({
    ...normalizedParsed,
    source: {
      provider: "spoonacular",
      id: input.recipeId,
      url: input.normalized.sourceUrl,
      ...parsedSource,
    },
    model: {
      name: model,
      promptVersion: PROMPT_VERSION,
      ...parsedModel,
    },
  });

  return enhanceStandardizedResult(parsedOutput);
  } finally {
    releaseRateLimiterSlot();
  }
}

async function acquireRateLimiterSlot() {
  if (currentConcurrentRequests < MAX_CONCURRENT_REQUESTS) {
    currentConcurrentRequests += 1;
    return;
  }
  await new Promise<void>((resolve) => {
    rateLimiterQueue.push(() => {
      currentConcurrentRequests += 1;
      resolve();
    });
  });
}

function releaseRateLimiterSlot() {
  currentConcurrentRequests = Math.max(0, currentConcurrentRequests - 1);
  const next = rateLimiterQueue.shift();
  if (next) next();
}

function buildUserPrompt({
  normalized,
  sourcePayload,
}: {
  normalized: NormalizedRecipe;
  sourcePayload: unknown;
}) {
  const normalizedSummary = {
    id: normalized.id,
    title: normalized.title,
    readyInMinutes: normalized.readyInMinutes ?? null,
    diets: normalized.diets ?? [],
    usedIngredients: normalized.usedIngredients ?? [],
    missedIngredients: normalized.missedIngredients ?? [],
    extendedIngredients: normalized.extendedIngredients ?? [],
    instructions: normalized.instructions ?? null,
    sourceUrl: normalized.sourceUrl ?? null,
  };
  return [
    "Standardize this recipe using the KitchenSync schema.",
    "Normalized summary:",
    safeStringify(normalizedSummary, 4000),
    "Original provider payload (may contain extra hints like nutrition):",
    safeStringify(sourcePayload, 8000),
    "Respond with JSON only.",
  ].join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isModelMissingError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const status = "status" in err ? (err as { status?: number }).status : undefined;
  const code = "code" in err ? (err as { code?: string }).code : undefined;
  const message =
    (err as { message?: string }).message ?? (err instanceof Error ? err.message : "");

  return (
    code === "model_not_found" ||
    status === 404 ||
    /does not exist|have access/i.test(message ?? "")
  );
}

function isRateLimitError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const status = "status" in err ? (err as { status?: number }).status : undefined;
  const code = "code" in err ? (err as { code?: string }).code : undefined;
  return status === 429 || code === "rate_limit_exceeded";
}

async function executeWithBackoff<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRateLimitError(err)) {
        throw err;
      }
      const delayMs = 500 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError ?? new Error("Failed to execute request");
}

function normalizeInstructionText(raw: unknown): StandardizedRecipeDetails["steps"] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const cleaned = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const parts = cleaned
    .split(/(?<=[.?!])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return (parts.length > 0 ? parts : [cleaned]).map((instruction, idx) => ({
    number: idx + 1,
    instruction,
  }));
}

function normalizeAnalyzedInstructions(raw: unknown): StandardizedRecipeDetails["steps"] | null {
  if (!Array.isArray(raw)) return null;
  const first = raw[0];
  if (!first || typeof first !== "object") return null;
  const steps = Array.isArray((first as { steps?: unknown }).steps)
    ? ((first as { steps?: unknown }).steps as unknown[])
    : [];
  const normalized = steps
    .map((step, idx) => {
      if (!step || typeof step !== "object") return null;
      const text = (step as { step?: unknown }).step;
      if (typeof text !== "string" || !text.trim()) return null;
      const n = (step as { number?: unknown }).number;
      return {
        number: Number.isFinite(n) ? (n as number) : idx + 1,
        instruction: text.trim(),
      };
    })
    .filter(Boolean) as { number: number; instruction: string }[];
  return normalized.length > 0 ? normalized : null;
}

function normalizeIngredients(
  normalized: NormalizedRecipe,
): StandardizedRecipeDetails["ingredients"] | null {
  const ingredients =
    normalized.extendedIngredients ??
    normalized.usedIngredients ??
    normalized.missedIngredients ??
    null;
  if (!ingredients || ingredients.length === 0) return null;
  return ingredients
    .map((ing) => ({
      name: ing.name,
      quantity: null,
      unit: null,
      preparation: null,
      notes: ing.original !== ing.name ? ing.original : null,
      pantryCategory: null,
    }))
    .filter((ing) => ing.name && ing.name.trim().length > 0);
}

function toOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeResponseText(value: string | string[] | null | undefined) {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.join("\n").trim();
  }
  return value.trim();
}

function ensureSchemaDefaults(
  parsed: Record<string, unknown>,
  input: StandardizeInput,
): Record<string, unknown> {
  const metadata =
    isRecord(parsed.metadata) && typeof parsed.metadata.title === "string"
      ? parsed.metadata
      : { title: input.normalized.title ?? "Recipe" };
  return {
    ...parsed,
    metadata,
  };
}

function enhanceStandardizedResult(
  data: StandardizedRecipeDetails,
): StandardizedRecipeDetails {
  const ingredients = (data.ingredients ?? []).map((ing) => {
    const trimmedName = cleanupText(titleCase(ing.name));
    const quantity =
      typeof ing.quantity === "number" && ing.quantity > 0
        ? Number(ing.quantity)
        : null;
    const unit = cleanupText(ing.unit?.trim() ?? "") || null;
    const preparation = cleanupText(ing.preparation?.trim() ?? "") || null;
    const notes = cleanupText(ing.notes?.trim() ?? "") || null;
    const pantryCategory = cleanupText(ing.pantryCategory?.trim() ?? "") || null;
    return {
      ...ing,
      name: trimmedName,
      quantity,
      unit: unit && unit.length > 0 ? unit : null,
      preparation,
      notes,
      pantryCategory,
    };
  });

  const steps = normalizeSteps(data.steps ?? []);

  return {
    ...data,
    ingredients,
    steps,
  };
}

function normalizeSteps(steps: StandardizedRecipeDetails["steps"]) {
  const expanded: typeof steps = [];

  steps?.forEach((step) => {
    if (!step) return;
    const trimmed = step.instruction.trim();
    if (!trimmed) return;

    const parts = splitSentences(trimmed);
    parts.forEach((part) => {
      expanded.push({
        ...step,
        instruction: part,
      });
    });
  });

  if (expanded.length === 0) return [];

  return expanded.map((step, idx) => ({
    ...step,
    number: idx + 1,
    instruction: cleanupText(capitalize(step.instruction)),
    tips: cleanupText(step.tips ?? "") || null,
    equipment: Array.isArray(step.equipment)
      ? step.equipment.map((item) => cleanupText(item)).filter(Boolean)
      : step.equipment,
    ingredients: Array.isArray(step.ingredients)
      ? step.ingredients.map((item) => cleanupText(item)).filter(Boolean)
      : step.ingredients,
  }));
}

function splitSentences(value: string) {
  const normalized = value.replace(/\s+/g, " ").replace(/:\s+/g, ". ").trim();
  if (!normalized) return [];
  const punctuationParts = normalized.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);
  if (punctuationParts.length > 1) {
    return punctuationParts.map(capitalize);
  }
  const newlineParts = value
    .split(/\r?\n+/)
    .map((part) => part.replace(/:\s+/g, ". ").trim())
    .filter(Boolean);
  if (newlineParts.length > 0) {
    return newlineParts.map(capitalize);
  }
  return [capitalize(normalized)];
}

function capitalize(value: string) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function titleCase(value: string) {
  if (!value) return "";
  return value
    .split(/\s+/)
    .map((part) => {
      if (part.length === 0) return "";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ")
    .trim();
}

function cleanupText(value: string) {
  if (!value) return "";
  return value
    .replace(/\s+/g, " ")
    .replace(/[;,]+\s*$/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}
