import type { LucideIcon } from "lucide-react";
import { Egg, Fish, Leaf, Milk, Nut, Wheat } from "lucide-react";

export type RecipeTagMeta = {
  key: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  alsoFits: string[];
  note: string | null;
};

const TAG_ALIASES: Record<string, string> = {
  "lacto-ovo vegetarian": "lacto ovo vegetarian",
  "lacto ovo vegetarian": "lacto ovo vegetarian",
  "lacto vegetarian": "lacto vegetarian",
  "ovo vegetarian": "ovo vegetarian",
  pescatarian: "pescetarian",
  "low fodmap": "low fodmap",
};

const TAG_META: Record<string, Omit<RecipeTagMeta, "key">> = {
  "gluten free": {
    label: "Gluten Free",
    description: "Made without gluten-containing grains like wheat, barley, or rye.",
    Icon: Wheat,
    alsoFits: [],
    note: null,
  },
  ketogenic: {
    label: "Ketogenic",
    description: "Very low carb, high fat pattern intended to support ketosis.",
    Icon: Leaf,
    alsoFits: [],
    note: null,
  },
  vegetarian: {
    label: "Vegetarian",
    description: "No meat, poultry, or seafood.",
    Icon: Leaf,
    alsoFits: [],
    note: "Does not include fish. Pescetarian is separate.",
  },
  "lacto vegetarian": {
    label: "Lacto Vegetarian",
    description: "Vegetarian pattern that includes dairy but excludes eggs.",
    Icon: Milk,
    alsoFits: ["Vegetarian"],
    note: null,
  },
  "ovo vegetarian": {
    label: "Ovo Vegetarian",
    description: "Vegetarian pattern that includes eggs but excludes dairy.",
    Icon: Egg,
    alsoFits: ["Vegetarian"],
    note: null,
  },
  "lacto ovo vegetarian": {
    label: "Lacto Ovo Vegetarian",
    description: "Vegetarian pattern that allows both dairy and eggs.",
    Icon: Leaf,
    alsoFits: ["Vegetarian"],
    note: null,
  },
  vegan: {
    label: "Vegan",
    description: "No animal products, including meat, dairy, eggs, or honey.",
    Icon: Leaf,
    alsoFits: ["Vegetarian"],
    note: null,
  },
  pescetarian: {
    label: "Pescetarian",
    description: "No meat or poultry; includes seafood, and often dairy and eggs.",
    Icon: Fish,
    alsoFits: [],
    note: "Not vegetarian because fish is included.",
  },
  paleo: {
    label: "Paleo",
    description: "Focuses on minimally processed foods, excluding grains and legumes.",
    Icon: Leaf,
    alsoFits: [],
    note: null,
  },
  primal: {
    label: "Primal",
    description: "Similar to paleo, but can include some dairy.",
    Icon: Leaf,
    alsoFits: [],
    note: null,
  },
  "low fodmap": {
    label: "Low FODMAP",
    description: "Limits fermentable carbs that can trigger digestive symptoms.",
    Icon: Leaf,
    alsoFits: [],
    note: null,
  },
  whole30: {
    label: "Whole30",
    description: "30-day elimination style excluding sugar, grains, dairy, and legumes.",
    Icon: Leaf,
    alsoFits: [],
    note: null,
  },
  "dairy free": {
    label: "Dairy Free",
    description: "Contains no milk-based ingredients.",
    Icon: Milk,
    alsoFits: [],
    note: null,
  },
  "egg free": {
    label: "Egg Free",
    description: "Contains no egg ingredients.",
    Icon: Egg,
    alsoFits: [],
    note: null,
  },
  "nut free": {
    label: "Nut Free",
    description: "Contains no tree nuts or peanuts.",
    Icon: Nut,
    alsoFits: [],
    note: null,
  },
  "peanut free": {
    label: "Peanut Free",
    description: "Contains no peanut ingredients.",
    Icon: Nut,
    alsoFits: [],
    note: null,
  },
  "tree nut free": {
    label: "Tree Nut Free",
    description: "Contains no tree nut ingredients.",
    Icon: Nut,
    alsoFits: [],
    note: null,
  },
  "soy free": {
    label: "Soy Free",
    description: "Contains no soy ingredients.",
    Icon: Leaf,
    alsoFits: [],
    note: null,
  },
  "shellfish free": {
    label: "Shellfish Free",
    description: "Contains no shellfish ingredients.",
    Icon: Fish,
    alsoFits: [],
    note: null,
  },
  "fish free": {
    label: "Fish Free",
    description: "Contains no fish ingredients.",
    Icon: Fish,
    alsoFits: [],
    note: null,
  },
};

export function formatRecipeTagLabel(value: string): string {
  const normalized = normalizeTag(value);
  if (!normalized) return "";
  return normalized.replace(/\b([a-z0-9])([a-z0-9']*)/g, (_match, first, rest) => {
    return `${String(first).toUpperCase()}${rest}`;
  });
}

export function getRecipeTagMeta(value: string): RecipeTagMeta {
  const normalized = normalizeTag(value);
  const canonical = TAG_ALIASES[normalized] ?? normalized;
  const known = TAG_META[canonical];

  if (known) {
    return {
      key: canonical,
      label: known.label,
      description: known.description,
      Icon: known.Icon,
      alsoFits: known.alsoFits,
      note: known.note,
    };
  }

  if (canonical.endsWith("free")) {
    const subject = canonical.replace(/\s*free$/, "").trim();
    const subjectLabel = formatRecipeTagLabel(subject);
    return {
      key: canonical,
      label: formatRecipeTagLabel(canonical),
      description: `Contains no ${subjectLabel.toLowerCase()} ingredients.`,
      Icon: inferTagIcon(canonical),
      alsoFits: [],
      note: null,
    };
  }

  return {
    key: canonical || "diet",
    label: formatRecipeTagLabel(canonical || value),
    description: "Dietary classification provided by Spoonacular.",
    Icon: inferTagIcon(canonical),
    alsoFits: [],
    note: null,
  };
}

export function getRecipeTagIcon(value: string): LucideIcon {
  return getRecipeTagMeta(value).Icon;
}

function normalizeTag(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function inferTagIcon(normalizedTag: string): LucideIcon {
  const normalized = normalizeTag(normalizedTag);
  if (!normalized) return Leaf;

  if (normalized.includes("dairy")) return Milk;
  if (normalized.includes("gluten") || normalized.includes("wheat")) return Wheat;
  if (normalized.includes("egg")) return Egg;
  if (normalized.includes("nut")) return Nut;
  if (normalized.includes("fish") || normalized.includes("pesc")) return Fish;
  if (
    normalized.includes("vegan") ||
    normalized.includes("vegetarian") ||
    normalized.includes("primal") ||
    normalized.includes("paleo") ||
    normalized.includes("whole30") ||
    normalized.includes("keto")
  ) {
    return Leaf;
  }

  return Leaf;
}
