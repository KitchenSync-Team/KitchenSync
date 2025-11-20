import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RecipeCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video w-full">
        <Skeleton className="h-full w-full" />
      </div>
      <CardHeader className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}
