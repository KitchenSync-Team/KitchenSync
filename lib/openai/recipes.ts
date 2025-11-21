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

const SYSTEM_PROMPT = `You are a culinary data specialist that converts noisy recipe payloads into clean JSON that exactly matches a schema. Assume all measurements are in US cups/teaspoons/tablespoons or grams if units are unclear. Convert fractional quantities to decimal numbers (0.5, 1.25, etc.). Always include at least three instruction steps when directions exist and keep only one action per step. Format every ingredient name in Title Case and return amounts separately via the quantity + unit fields (do not embed units inside the name). Return the steps array as a list of sequential objects where each "instruction" field is a single, concise, imperative sentence (no paragraphs). Omit marketing fluff or HTML. Never wrap the JSON in backticks or prose.`;

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

  if (code === "model_not_found") return true;
  if (status === 404) return true;
  if (/does not exist|have access/i.test(message ?? "")) {
    return true;
  }
  return false;
}

function isRateLimitError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const status = "status" in err ? (err as { status?: number }).status : undefined;
  const code = "code" in err ? (err as { code?: string }).code : undefined;
  if (status === 429) return true;
  if (code === "rate_limit_exceeded") return true;
  return false;
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
    const trimmedName = titleCase(ing.name);
    const quantity =
      typeof ing.quantity === "number" && ing.quantity > 0
        ? Number(ing.quantity)
        : null;
    const unit = ing.unit?.trim() ?? null;
    return {
      ...ing,
      name: trimmedName,
      quantity,
      unit: unit && unit.length > 0 ? unit : null,
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
    instruction: capitalize(step.instruction),
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
