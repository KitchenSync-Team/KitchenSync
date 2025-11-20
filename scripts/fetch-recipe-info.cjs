#!/usr/bin/env node
/* eslint-disable */
/**
 * Fetch a single recipe by ID or Spoonacular URL and print key details as text.
 *
 * Usage:
 *   SPOONACULAR_API_KEY=... node scripts/fetch-recipe-info.cjs 716429
 *   SPOONACULAR_API_KEY=... node scripts/fetch-recipe-info.cjs "https://spoonacular.com/recipes/pasta-with-garlic-716429"
 *
 * Reads SPOONACULAR_API_KEY from env or .env.local.
 */

const fs = require("node:fs");
const path = require("node:path");

const API_KEY =
  process.env.SPOONACULAR_API_KEY || loadDotenvKey("SPOONACULAR_API_KEY", [process.cwd()]);

if (!API_KEY) {
  console.error("Missing SPOONACULAR_API_KEY in env (.env.local or process env).");
  process.exit(1);
}

const input = process.argv[2];
if (!input) {
  console.error("Pass a recipe ID or Spoonacular recipe URL.");
  process.exit(1);
}

const recipeId = parseRecipeId(input);
if (!recipeId) {
  console.error("Could not parse a numeric recipe id from input:", input);
  process.exit(1);
}

void run();

function parseRecipeId(value) {
  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) return asNumber;

  try {
    const url = new URL(value);
    const match = url.pathname.match(/-(\d+)\/?$/);
    if (match) return Number(match[1]);
  } catch {
    // ignore URL parse failures
  }
  return null;
}

async function run() {
  const url = `https://api.spoonacular.com/recipes/${recipeId}/information?includeNutrition=true&apiKey=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    console.error("Spoonacular error:", typeof data === "object" ? JSON.stringify(data, null, 2) : data);
    process.exit(1);
  }

  printRecipe(data);
}

function printRecipe(recipe) {
  const lines = [];
  lines.push(`# ${recipe.title || "Recipe"}`);
  lines.push(`ID: ${recipe.id}`);
  lines.push(`Ready in: ${recipe.readyInMinutes ?? "n/a"} minutes`);
  lines.push(`Servings: ${recipe.servings ?? "n/a"}`);
  if (Array.isArray(recipe.diets) && recipe.diets.length > 0) {
    lines.push(`Diets: ${recipe.diets.join(", ")}`);
  }
  if (Array.isArray(recipe.cuisines) && recipe.cuisines.length > 0) {
    lines.push(`Cuisines: ${recipe.cuisines.join(", ")}`);
  }
  if (typeof recipe.healthScore === "number") {
    lines.push(`Health score: ${recipe.healthScore}`);
  }
  lines.push(`Source: ${recipe.sourceUrl || recipe.spoonacularSourceUrl || "n/a"}`);

  lines.push("");
  lines.push("Ingredients:");
  if (Array.isArray(recipe.extendedIngredients) && recipe.extendedIngredients.length > 0) {
    for (const ing of recipe.extendedIngredients) {
      const name = ing.original || ing.name || "ingredient";
      lines.push(`- ${name}`);
    }
  } else {
    lines.push("- none listed");
  }

  lines.push("");
  lines.push("Instructions:");
  if (recipe.instructions) {
    lines.push(stripHtml(recipe.instructions).trim());
  } else if (Array.isArray(recipe.analyzedInstructions) && recipe.analyzedInstructions.length > 0) {
    const steps = recipe.analyzedInstructions[0]?.steps ?? [];
    if (steps.length > 0) {
      for (const step of steps) {
        lines.push(`${step.number}. ${step.step}`);
      }
    } else {
      lines.push("No steps provided.");
    }
  } else {
    lines.push("No instructions provided.");
  }

  console.log(lines.join("\n"));
}

function stripHtml(value) {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, "");
}

function loadDotenvKey(key, roots) {
  for (const root of roots) {
    try {
      const envPath = path.join(root, ".env.local");
      if (!fs.existsSync(envPath)) continue;
      const lines = fs.readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...rest] = trimmed.split("=");
        if (k === key) {
          return rest.join("=").trim();
        }
      }
    } catch {
      // ignore and try next root
    }
  }
  return null;
}
