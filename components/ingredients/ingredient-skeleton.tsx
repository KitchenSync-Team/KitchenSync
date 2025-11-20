import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function IngredientCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-40 w-full">
        <Skeleton className="h-full w-full" />
      </div>
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </CardHeader>
      <CardContent className="flex justify-end pb-4">
        <Skeleton className="h-9 w-28" />
      </CardContent>
    </Card>
  );
}
