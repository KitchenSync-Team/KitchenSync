import type { NormalizedRecipe } from "./types";

type PantryItem = {
  name: string;
  normalizedName: string;
  spoonacularIngredientId: number | null;
  quantity: number;
};

export function attachIngredientMatch(
  recipes: NormalizedRecipe[],
  pantryItems: PantryItem[],
): NormalizedRecipe[] {
  if (!Array.isArray(recipes) || recipes.length === 0) return [];

  const pantryIdToNames = new Map<number, Set<string>>();
  const pantryNameSet = new Set<string>();
  for (const item of pantryItems) {
    const itemName = normalizeIngredientName(item.normalizedName || item.name || "");
    const itemNameCandidates = expandNameCandidates(itemName);
    if (typeof item.spoonacularIngredientId === "number" && Number.isFinite(item.spoonacularIngredientId)) {
      const current = pantryIdToNames.get(item.spoonacularIngredientId) ?? new Set<string>();
      for (const candidate of itemNameCandidates) {
        if (candidate) current.add(candidate);
      }
      pantryIdToNames.set(item.spoonacularIngredientId, current);
    }
    if (itemName) {
      pantryNameSet.add(itemName);
      for (const candidate of itemNameCandidates) {
        pantryNameSet.add(candidate);
      }
    }
  }

  return recipes.map((recipe) => {
    const required = Array.isArray(recipe.extendedIngredients)
      ? recipe.extendedIngredients
      : [];

    if (required.length === 0) {
      return recipe;
    }

    const have: { id?: number; name: string; original: string }[] = [];
    const missing: { id?: number; name: string; original: string }[] = [];

    for (const ingredient of required) {
      const name = normalizeIngredientName(ingredient.name);
      const ingredientNameCandidates = expandNameCandidates(name);
      const hasId = hasIngredientIdMatch(ingredient.id, ingredientNameCandidates, pantryIdToNames);
      const hasName = ingredientNameCandidates.some((candidate) => pantryNameSet.has(candidate));
      if (hasId || hasName) {
        have.push(ingredient);
      } else {
        missing.push(ingredient);
      }
    }

    const totalRequired = required.length;
    const haveCount = have.length;
    const missingCount = missing.length;
    const coverage = totalRequired > 0 ? Number((haveCount / totalRequired).toFixed(3)) : 0;

    return {
      ...recipe,
      ingredientMatch: {
        haveCount,
        missingCount,
        totalRequired,
        coverage,
        canMakeAll: totalRequired > 0 && missingCount === 0,
        have,
        missing,
      },
    };
  });
}

export function sortRecipesByPantryMatch(recipes: NormalizedRecipe[]): NormalizedRecipe[] {
  return [...recipes].sort((a, b) => compareRecipes(a, b));
}

function compareRecipes(a: NormalizedRecipe, b: NormalizedRecipe): number {
  const aCanMake = getCanMake(a);
  const bCanMake = getCanMake(b);
  if (aCanMake !== bCanMake) return aCanMake ? -1 : 1;

  const aCoverage = getCoverage(a);
  const bCoverage = getCoverage(b);
  if (aCoverage !== bCoverage) return bCoverage - aCoverage;

  const aMissing = getMissingCount(a);
  const bMissing = getMissingCount(b);
  if (aMissing !== bMissing) return aMissing - bMissing;

  const aUsed = getUsedCount(a);
  const bUsed = getUsedCount(b);
  if (aUsed !== bUsed) return bUsed - aUsed;

  const aLikes = typeof a.aggregateLikes === "number" ? a.aggregateLikes : 0;
  const bLikes = typeof b.aggregateLikes === "number" ? b.aggregateLikes : 0;
  return bLikes - aLikes;
}

function getCanMake(recipe: NormalizedRecipe): boolean {
  if (recipe.ingredientMatch) return recipe.ingredientMatch.canMakeAll;
  const used = getUsedCount(recipe);
  const missing = getMissingCount(recipe);
  return used > 0 && missing === 0;
}

function getCoverage(recipe: NormalizedRecipe): number {
  if (recipe.ingredientMatch) return recipe.ingredientMatch.coverage;
  const used = getUsedCount(recipe);
  const missing = getMissingCount(recipe);
  const total = used + missing;
  return total > 0 ? used / total : 0;
}

function getMissingCount(recipe: NormalizedRecipe): number {
  if (recipe.ingredientMatch) return recipe.ingredientMatch.missingCount;
  return recipe.missedIngredientCount ?? recipe.missedIngredients?.length ?? 0;
}

function getUsedCount(recipe: NormalizedRecipe): number {
  if (recipe.ingredientMatch) return recipe.ingredientMatch.haveCount;
  return recipe.usedIngredientCount ?? recipe.usedIngredients?.length ?? 0;
}

function normalizeIngredientName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function hasIngredientIdMatch(
  ingredientId: number | undefined,
  ingredientNameCandidates: string[],
  pantryIdToNames: Map<number, Set<string>>,
) {
  if (typeof ingredientId !== "number" || !Number.isFinite(ingredientId)) return false;
  const idsToCheck = buildVariantIdCandidates(ingredientId);
  for (const id of idsToCheck) {
    const pantryNames = pantryIdToNames.get(id);
    if (!pantryNames) continue;
    // Exact id match is always valid.
    if (id === ingredientId) return true;
    // Variant id match needs loose lexical overlap to avoid false positives.
    if (ingredientNameCandidates.some((candidate) => hasNameOverlap(candidate, pantryNames))) {
      return true;
    }
  }
  return false;
}

function buildVariantIdCandidates(id: number): number[] {
  const normalized = Math.trunc(id);
  const raw = String(normalized);
  const candidates = new Set<number>([normalized]);
  // Spoonacular variant ids are often prefixed (e.g. 10111549 -> 11549, 1045062 -> 5062).
  if (raw.length > 6 && raw.startsWith("10")) {
    const stripThree = Number(raw.slice(3));
    if (Number.isFinite(stripThree) && stripThree > 0) candidates.add(stripThree);
  }
  return Array.from(candidates);
}

function hasNameOverlap(candidate: string, pantryNames: Set<string>) {
  if (pantryNames.has(candidate)) return true;
  for (const pantryName of pantryNames) {
    if (!candidate || !pantryName) continue;
    if (candidate.includes(pantryName) || pantryName.includes(candidate)) return true;
  }
  return false;
}

function expandNameCandidates(name: string): string[] {
  const candidates = new Set<string>([name]);

  // Explicit high-signal aliases.
  addAlias(candidates, name, /\bmarinara\b/g, "marinara sauce");
  addAlias(candidates, name, /\bmarinara sauce\b/g, "pasta sauce");
  addAlias(candidates, name, /\bmarinara sauce\b/g, "tomato sauce");
  addAlias(candidates, name, /\bpasta sauce\b/g, "marinara sauce");
  addAlias(candidates, name, /\bpasta sauce\b/g, "tomato sauce");
  addAlias(candidates, name, /\btomato sauce\b/g, "pasta sauce");
  addAlias(candidates, name, /\btomato sauce\b/g, "marinara sauce");
  addAlias(candidates, name, /\bspaghetti sauce\b/g, "pasta sauce");
  addAlias(candidates, name, /\bjarred pasta sauce\b/g, "pasta sauce");
  addAlias(candidates, name, /\bjar pasta sauce\b/g, "pasta sauce");
  addAlias(candidates, name, /\bjar marinara sauce\b/g, "marinara sauce");

  addAlias(candidates, name, /\begg whites\b/g, "egg");
  addAlias(candidates, name, /\begg white\b/g, "egg");
  addAlias(candidates, name, /\bwhole egg\b/g, "egg");
  addAlias(candidates, name, /\beggs\b/g, "egg");

  addAlias(candidates, name, /\bskim milk\b/g, "milk");
  addAlias(candidates, name, /\bpart skim milk\b/g, "milk");
  addAlias(candidates, name, /\blow fat milk\b/g, "milk");
  addAlias(candidates, name, /\bwhole milk\b/g, "milk");
  addAlias(candidates, name, /\b2 milk\b/g, "milk");
  addAlias(candidates, name, /\b2 percent milk\b/g, "milk");

  addAlias(candidates, name, /\bchicken breast halves\b/g, "chicken breast");
  addAlias(candidates, name, /\bboneless skinless chicken breast\b/g, "chicken breast");
  addAlias(candidates, name, /\bskinless boneless chicken breast halves\b/g, "chicken breast");
  addAlias(candidates, name, /\bchicken breast half\b/g, "chicken breast");
  addAlias(candidates, name, /\bchicken breasts?\b/g, "chicken breast");
  addAlias(candidates, name, /\bground chicken\b/g, "chicken");
  addAlias(candidates, name, /\bchicken thighs?\b/g, "chicken");

  addAlias(candidates, name, /\bmozzarella cheese\b/g, "mozzarella");
  addAlias(candidates, name, /\bpart skim mozzarella cheese\b/g, "mozzarella");
  addAlias(candidates, name, /\bshredded mozzarella cheese\b/g, "mozzarella");
  addAlias(candidates, name, /\bpart skim mozzarella\b/g, "mozzarella");
  addAlias(candidates, name, /\bparmesan cheese\b/g, "parmesan");
  addAlias(candidates, name, /\bshredded parmesan cheese\b/g, "parmesan");
  addAlias(candidates, name, /\bgrated parmesan cheese\b/g, "parmesan");
  addAlias(candidates, name, /\bparmigiano reggiano\b/g, "parmesan");

  addAlias(candidates, name, /\bcanned tomatoes?\b/g, "tomato");
  addAlias(candidates, name, /\bcanned whole tomatoes?\b/g, "canned tomatoes");
  addAlias(candidates, name, /\bcanned diced tomatoes?\b/g, "canned tomatoes");
  addAlias(candidates, name, /\bcrushed tomatoes?\b/g, "canned tomatoes");
  addAlias(candidates, name, /\bplum tomatoes?\b/g, "canned tomatoes");
  addAlias(candidates, name, /\bsan marzano tomatoes?\b/g, "canned tomatoes");
  addAlias(candidates, name, /\broma tomatoes?\b/g, "tomato");

  addAlias(candidates, name, /\bvegetable broth\b/g, "vegetable stock");
  addAlias(candidates, name, /\bvegetable stock\b/g, "vegetable broth");
  addAlias(candidates, name, /\bchicken broth\b/g, "chicken stock");
  addAlias(candidates, name, /\bchicken stock\b/g, "chicken broth");
  addAlias(candidates, name, /\bbroth\b/g, "stock");
  addAlias(candidates, name, /\bstock\b/g, "broth");

  addAlias(candidates, name, /\bsalt and pepper\b/g, "salt");
  addAlias(candidates, name, /\bsalt and pepper\b/g, "pepper");
  addAlias(candidates, name, /\bground pepper\b/g, "pepper");
  addAlias(candidates, name, /\bground black pepper\b/g, "black pepper");
  addAlias(candidates, name, /\bblack pepper\b/g, "pepper");

  addAlias(candidates, name, /\bextra virgin olive oil\b/g, "olive oil");
  addAlias(candidates, name, /\bcooking oil\b/g, "oil");
  addAlias(candidates, name, /\bvegetable oil\b/g, "oil");

  addAlias(candidates, name, /\ball purpose flour\b/g, "flour");
  addAlias(candidates, name, /\ball purpose\b/g, "all purpose flour");
  addAlias(candidates, name, /\bplain flour\b/g, "flour");
  addAlias(candidates, name, /\bself rising flour\b/g, "flour");

  addAlias(candidates, name, /\byellow onion\b/g, "onion");
  addAlias(candidates, name, /\bred onion\b/g, "onion");
  addAlias(candidates, name, /\bwhite onion\b/g, "onion");
  addAlias(candidates, name, /\bgreen onions?\b/g, "scallion");
  addAlias(candidates, name, /\bscallions?\b/g, "green onion");
  addAlias(candidates, name, /\bgarlic cloves?\b/g, "garlic");

  // Remove common preparation/modifier words to get a simpler core ingredient phrase.
  const simplified = collapseSpaces(
    name.replace(
      /\b(fresh|dried|shredded|grated|minced|chopped|ground|whole|boneless|skinless|part skim|low fat|nonfat|extra virgin|halves|skinless boneless|fat free|reduced sodium|low sodium)\b/g,
      "",
    ),
  );
  if (simplified) candidates.add(simplified);

  // Singularize plural words very conservatively.
  const singularized = collapseSpaces(
    simplified
      .split(" ")
      .map((word) => singularizeWord(word))
      .join(" "),
  );
  if (singularized) candidates.add(singularized);

  // Clean leftovers after phrase-level removals.
  candidates.add(collapseSpaces(name.replace(/\bhalves\b/g, "")));

  return Array.from(candidates).filter(Boolean);
}

function addAlias(
  candidates: Set<string>,
  source: string,
  pattern: RegExp,
  replacement: string,
) {
  if (!pattern.test(source)) return;
  pattern.lastIndex = 0;
  candidates.add(collapseSpaces(source.replace(pattern, replacement)));
}

function singularizeWord(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("sses") || word.endsWith("ss")) return word;
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
