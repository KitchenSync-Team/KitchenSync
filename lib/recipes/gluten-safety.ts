import type { NormalizedIngredient, NormalizedRecipe } from "@/lib/recipes/types";

export type GlutenSafetyWarning = {
  shouldWarn: boolean;
  matches: string[];
};

const RISKY_GLUTEN_TERMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bsoy sauce\b/i, label: "soy sauce" },
  { pattern: /\bhoisin sauce\b/i, label: "hoisin sauce" },
  { pattern: /\bworcestershire sauce\b/i, label: "worcestershire sauce" },
  { pattern: /\bbarbecue sauce\b/i, label: "barbecue sauce" },
  { pattern: /\bteriyaki sauce\b/i, label: "teriyaki sauce" },
  { pattern: /\boyster sauce\b/i, label: "oyster sauce" },
  { pattern: /\bmalt vinegar\b/i, label: "malt vinegar" },
  { pattern: /\bbeer\b/i, label: "beer" },
  { pattern: /\ball purpose flour\b/i, label: "all-purpose flour" },
  { pattern: /\bwheat flour\b/i, label: "wheat flour" },
];

export function getGlutenSafetyWarning(
  recipe: Pick<NormalizedRecipe, "diets" | "extendedIngredients">,
): GlutenSafetyWarning {
  const diets = recipe.diets ?? [];
  const markedGlutenFree = diets.some((diet) => normalize(diet) === "gluten free");
  if (!markedGlutenFree) {
    return { shouldWarn: false, matches: [] };
  }

  const ingredients = Array.isArray(recipe.extendedIngredients) ? recipe.extendedIngredients : [];
  if (ingredients.length === 0) {
    return { shouldWarn: false, matches: [] };
  }

  const hits = new Set<string>();
  for (const ingredient of ingredients) {
    const blob = buildIngredientBlob(ingredient);
    for (const term of RISKY_GLUTEN_TERMS) {
      if (term.pattern.test(blob)) hits.add(term.label);
    }
  }

  return {
    shouldWarn: hits.size > 0,
    matches: Array.from(hits),
  };
}

function buildIngredientBlob(ingredient: NormalizedIngredient): string {
  const name = normalize(ingredient.name);
  const original = normalize(ingredient.original);
  return `${name} ${original}`.trim();
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}
