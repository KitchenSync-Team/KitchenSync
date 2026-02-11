import Image from "next/image";
import { Plus } from "lucide-react";

import type { IngredientSearchResult } from "@/lib/ingredients/types";
import { formatInventoryItemName } from "@/lib/formatting/inventory";
import { formatDietBadgeLabel } from "@/lib/ingredients/badges";
import { getIngredientFallbackIcon } from "@/lib/ingredients/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IngredientCard({
  ingredient,
  onAdd,
}: {
  ingredient: IngredientSearchResult;
  onAdd: () => void;
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative h-40 w-full bg-muted">
        {ingredient.image ? (
          <Image
            src={ingredient.image}
            alt={formatInventoryItemName(ingredient.name)}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {(() => {
              const PlaceholderIcon = getIngredientFallbackIcon({
                name: ingredient.name,
                aisle: ingredient.aisle,
              });
              return <PlaceholderIcon className="h-6 w-6" />;
            })()}
          </div>
        )}
      </div>
      <CardHeader className="space-y-2">
        <CardTitle className="line-clamp-2 text-base">{formatInventoryItemName(ingredient.name)}</CardTitle>
        <div className="flex flex-wrap gap-2 text-xs">
          {ingredient.aisle && <Badge variant="outline">{ingredient.aisle}</Badge>}
          {(ingredient.dietBadges ?? []).slice(0, 2).map((badge) => (
            <Badge key={`${ingredient.id}-${badge}`} variant="outline">
              {formatDietBadgeLabel(badge)}
            </Badge>
          ))}
          {ingredient.dietMatch && (
            <Badge
              variant={ingredient.dietMatch === "match" ? "secondary" : "outline"}
              className={ingredient.dietMatch === "match" ? "border-emerald-300 text-emerald-800" : ""}
            >
              {ingredient.dietMatch === "match" ? "Diet match" : "Unverified"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex justify-end pb-4">
        <Button size="sm" onClick={onAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </CardContent>
    </Card>
  );
}
