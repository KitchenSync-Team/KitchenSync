import Image from "next/image";
import { Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecipeTagReferenceBadge } from "@/components/recipes/recipe-tag-reference-badge";
import { getGlutenSafetyWarning } from "@/lib/recipes/gluten-safety";
import type { NormalizedRecipe } from "@/lib/recipes/types";
import { cn } from "@/lib/supabase/utils";

type Props = {
  recipe: NormalizedRecipe;
  onViewDetails?: (recipe: NormalizedRecipe) => void;
  onHover?: (recipe: NormalizedRecipe) => void;
};

export function RecipeCard({ recipe, onViewDetails, onHover }: Props) {
  const usedCount =
    recipe.ingredientMatch?.haveCount ??
    recipe.usedIngredientCount ??
    recipe.usedIngredients?.length ??
    0;
  const missedCount =
    recipe.ingredientMatch?.missingCount ??
    recipe.missedIngredientCount ??
    recipe.missedIngredients?.length ??
    0;
  const diets = (recipe.diets ?? []).slice(0, 2);
  const glutenSafetyWarning = getGlutenSafetyWarning(recipe);

  return (
    <Card
      className="flex h-full flex-col overflow-hidden"
      onMouseEnter={() => onHover?.(recipe)}
      onFocus={() => onHover?.(recipe)}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {recipe.image ? (
          <Image
            src={recipe.image}
            alt={recipe.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain p-2"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
        {recipe.readyInMinutes && (
          <Badge className="absolute left-2 top-2 flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {recipe.readyInMinutes} min
          </Badge>
        )}
      </div>
      <CardHeader className="space-y-3">
        <CardTitle className="line-clamp-2 text-base">{recipe.title}</CardTitle>
        <div className="flex flex-wrap gap-2">
          {diets.map((diet) => (
            <RecipeTagReferenceBadge
              key={diet}
              tag={diet}
              variant="secondary"
              warningTitle={
                diet.toLowerCase() === "gluten free" && glutenSafetyWarning.shouldWarn
                  ? "Gluten caution"
                  : null
              }
              warningItems={
                diet.toLowerCase() === "gluten free" && glutenSafetyWarning.shouldWarn
                  ? glutenSafetyWarning.matches
                  : []
              }
              warningNote={
                diet.toLowerCase() === "gluten free" && glutenSafetyWarning.shouldWarn
                  ? "Verify product labels for certified gluten-free versions."
                  : null
              }
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pb-4">
        {(usedCount > 0 || missedCount > 0) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {recipe.ingredientMatch?.canMakeAll && <Badge>Can make now</Badge>}
            {usedCount > 0 && <Badge variant="outline">On hand {usedCount}</Badge>}
            {missedCount > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  missedCount > 0 &&
                    "border-amber-300 text-amber-900 dark:border-amber-800 dark:text-amber-200",
                )}
              >
                Missing {missedCount}
              </Badge>
            )}
          </div>
        )}
        <div className="mt-auto flex items-center justify-end gap-2 pt-2">
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={() => onViewDetails(recipe)}>
              View recipe
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
