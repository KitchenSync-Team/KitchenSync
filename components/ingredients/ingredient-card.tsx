import Image from "next/image";
import { Plus } from "lucide-react";

import type { IngredientSearchResult } from "@/lib/ingredients/types";
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
            alt={ingredient.name}
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
      </div>
      <CardHeader className="space-y-2">
        <CardTitle className="line-clamp-2 text-base capitalize">{ingredient.name}</CardTitle>
        <div className="flex flex-wrap gap-2 text-xs">
          {ingredient.aisle && <Badge variant="outline">{ingredient.aisle}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex justify-end pb-4">
        <Button size="sm" onClick={onAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add to kitchen
        </Button>
      </CardContent>
    </Card>
  );
}
