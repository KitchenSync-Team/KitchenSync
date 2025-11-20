import Image from "next/image";
import { ExternalLink, Leaf, Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NormalizedRecipe } from "@/lib/recipes/types";
import { cn } from "@/lib/supabase/utils";

type Props = {
  recipe: NormalizedRecipe;
  onViewDetails?: (recipe: NormalizedRecipe) => void;
};

export function RecipeCard({ recipe, onViewDetails }: Props) {
  const usedCount = recipe.usedIngredientCount ?? recipe.usedIngredients?.length ?? 0;
  const missedCount = recipe.missedIngredientCount ?? recipe.missedIngredients?.length ?? 0;
  const diets = recipe.diets ?? [];

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {recipe.image ? (
          <Image
            src={recipe.image}
            alt={recipe.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
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
          {diets.slice(0, 2).map((diet) => (
            <Badge key={diet} variant="secondary" className="gap-1">
              <Leaf className="h-3 w-3" />
              {diet}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pb-4">
        {(usedCount > 0 || missedCount > 0) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {usedCount > 0 && <Badge variant="outline">Uses {usedCount}</Badge>}
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
              Details
            </Button>
          )}
          {recipe.sourceUrl && (
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
                View recipe
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
