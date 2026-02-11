import type { ReactNode } from "react";

import { Check } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInventoryExpiry, formatInventoryItemName, formatQuantityWithUnit } from "@/lib/formatting/inventory";
import { formatDietBadgeLabel } from "@/lib/ingredients/badges";
import { getIngredientFallbackIcon } from "@/lib/ingredients/icon";
import { cn } from "@/lib/supabase/utils";

type InventoryIngredientCardProps = {
  name: string;
  imageUrl: string | null;
  aisle?: string | null;
  dietBadges?: string[];
  quantity: number;
  unit: string | null;
  expiresAt: string | null;
  selected?: boolean;
  badgeContent?: ReactNode;
  footer?: ReactNode;
  className?: string;
  imageClassName?: string;
  imageObjectClassName?: string;
  contentClassName?: string;
};

export function InventoryIngredientCard({
  name,
  imageUrl,
  aisle,
  dietBadges = [],
  quantity,
  unit,
  expiresAt,
  selected = false,
  badgeContent,
  footer,
  className,
  imageClassName,
  imageObjectClassName,
  contentClassName,
}: InventoryIngredientCardProps) {
  const displayName = formatInventoryItemName(name);
  const PlaceholderIcon = getIngredientFallbackIcon({ name, aisle: aisle ?? null });

  return (
    <Card
      className={cn(
        "relative w-full max-w-[240px] overflow-hidden",
        selected && "border-emerald-500 bg-emerald-500/10",
        className,
      )}
    >
      <div className={cn("relative h-40 w-full bg-muted", imageClassName)}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={displayName}
            className={cn("h-full w-full object-cover", imageObjectClassName)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PlaceholderIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        {badgeContent}
        {selected && !badgeContent && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border bg-background/90 px-2 py-1 text-xs font-medium text-emerald-700 shadow-sm dark:text-emerald-200">
            <Check className="h-3 w-3" />
            Selected
          </span>
        )}
      </div>
      <CardContent className={cn("flex h-full flex-col gap-2 p-4", contentClassName)}>
        <div className="space-y-1">
          <p className="line-clamp-2 text-sm font-semibold">{displayName}</p>
          {dietBadges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dietBadges.slice(0, 2).map((badge) => (
                <Badge key={`${displayName}-${badge}`} variant="outline" className="text-[10px]">
                  {formatDietBadgeLabel(badge)}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{formatQuantityWithUnit(quantity, unit)}</p>
          <p className="text-xs text-muted-foreground">Expires {formatInventoryExpiry(expiresAt)}</p>
        </div>
        {footer && <div className="mt-auto flex items-center justify-end gap-2">{footer}</div>}
      </CardContent>
    </Card>
  );
}
