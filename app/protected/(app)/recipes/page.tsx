import { resolveKitchen } from "@/app/protected/_lib/resolve-kitchen";
import { RecipeClient } from "./recipe-client";

export default async function RecipesPage() {
  const kitchenSnapshot = await resolveKitchen();
  const { preferences } = kitchenSnapshot;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Recipes</p>
        <h1 className="text-2xl font-semibold tracking-tight">Cook with what you have</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Search by keyword, adjust filters on the left, or hit “I’m feeling hungry” for something fast. We use your
          dietary profile, allergens, and likes/dislikes by default, and you can change them anytime.
        </p>
      </div>

      <RecipeClient
        preferences={{
          dietaryPreferences: preferences.dietaryPreferences,
          allergens: preferences.allergens,
          cuisineLikes: preferences.cuisineLikes,
          cuisineDislikes: preferences.cuisineDislikes,
          personalizationOptIn: preferences.personalizationOptIn,
        }}
      />
    </section>
  );
}
