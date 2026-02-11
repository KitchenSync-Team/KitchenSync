const DIET_LABELS: Record<string, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
  keto: "Keto",
  paleo: "Paleo",
  gluten_free: "Gluten-free",
  low_carb: "Low carb",
  low_sodium: "Low sodium",
};

const DIET_SYNONYMS: Record<string, string> = {
  vegetarian: "vegetarian",
  vegan: "vegan",
  pescatarian: "pescatarian",
  pescetarian: "pescatarian",
  keto: "keto",
  ketogenic: "keto",
  paleo: "paleo",
  "gluten free": "gluten_free",
  gluten_free: "gluten_free",
  gf: "gluten_free",
  "low carb": "low_carb",
  low_carb: "low_carb",
  "low sodium": "low_sodium",
  low_sodium: "low_sodium",
};

export function normalizeDietFilterKeys(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const token = normalizeToken(value);
    const mapped = DIET_SYNONYMS[token] ?? null;
    if (!mapped || seen.has(mapped)) continue;
    seen.add(mapped);
    out.push(mapped);
  }

  return out;
}

export function deriveIngredientDietBadges({
  name,
  aisle,
}: {
  name: string;
  aisle?: string | null;
}): string[] {
  const haystack = normalizeToken(`${name} ${aisle ?? ""}`);
  const out = new Set<string>();

  if (
    hasToken(haystack, "gluten free") ||
    hasToken(haystack, "gf") ||
    hasToken(haystack, "certified gluten free")
  ) {
    out.add("gluten_free");
  }

  if (hasToken(haystack, "vegan")) out.add("vegan");
  if (hasToken(haystack, "vegetarian")) out.add("vegetarian");
  if (hasToken(haystack, "pescatarian") || hasToken(haystack, "pescetarian")) out.add("pescatarian");
  if (hasToken(haystack, "keto") || hasToken(haystack, "ketogenic")) out.add("keto");
  if (hasToken(haystack, "paleo")) out.add("paleo");
  if (hasToken(haystack, "low carb")) out.add("low_carb");
  if (hasToken(haystack, "low sodium")) out.add("low_sodium");

  return Array.from(out);
}

export function formatDietBadgeLabel(value: string): string {
  return DIET_LABELS[value] ?? value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function dietFilterToSearchHint(value: string): string {
  const normalized = normalizeDietFilterKeys([value])[0];
  if (!normalized) return "";
  switch (normalized) {
    case "gluten_free":
      return "gluten free";
    case "low_carb":
      return "low carb";
    case "low_sodium":
      return "low sodium";
    default:
      return normalized.replace(/[_-]+/g, " ");
  }
}

export function buildIngredientBadgePayload(dietBadges: string[]): Record<string, unknown> {
  return {
    diet: normalizeDietFilterKeys(dietBadges),
    source: "derived",
    version: 1,
  };
}

export function readDietBadgesFromUnknown(badges: unknown): string[] {
  if (!badges || typeof badges !== "object") return [];
  const diet = (badges as { diet?: unknown }).diet;
  if (!Array.isArray(diet)) return [];
  return normalizeDietFilterKeys(diet.filter((value): value is string => typeof value === "string"));
}

export function hasStrictDietMatch(dietBadges: string[], selectedDietFilters: string[]): boolean {
  const normalizedBadges = new Set(normalizeDietFilterKeys(dietBadges));
  const normalizedFilters = normalizeDietFilterKeys(selectedDietFilters);
  if (normalizedFilters.length === 0) return true;
  return normalizedFilters.every((filter) => normalizedBadges.has(filter));
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function hasToken(value: string, token: string): boolean {
  const normalizedToken = normalizeToken(token);
  return value.includes(normalizedToken);
}
