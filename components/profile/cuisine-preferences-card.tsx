"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type CuisinePreferencesCardProps = {
  likes: string[]
  dislikes: string[]
  cuisineOptions: Record<string, string>
  onChangeAction?: (payload: { likes: string[]; dislikes: string[] }) => void
}

export function CuisinePreferencesCard({ likes, dislikes, cuisineOptions, onChangeAction }: CuisinePreferencesCardProps) {
  const [likeSelections, setLikeSelections] = useState<Set<string>>(new Set(likes))
  const [dislikeSelections, setDislikeSelections] = useState<Set<string>>(new Set(dislikes))

  const sortedCuisineOptions = useMemo(
    () => Object.entries(cuisineOptions).sort((a, b) => a[1].localeCompare(b[1])),
    [cuisineOptions],
  )

  const hasChanges =
    !setEquals(likeSelections, new Set(likes)) || !setEquals(dislikeSelections, new Set(dislikes))

  const toggleLike = (value: string) => {
    setLikeSelections((previous) => {
      const next = new Set(previous)
      if (next.has(value)) {
        next.delete(value)
        return next
      }
      next.add(value)
      setDislikeSelections((currentDislikes) => {
        if (!currentDislikes.has(value)) return currentDislikes
        const updated = new Set(currentDislikes)
        updated.delete(value)
        return updated
      })
      return next
    })
  }

  const toggleDislike = (value: string) => {
    setDislikeSelections((previous) => {
      const next = new Set(previous)
      if (next.has(value)) {
        next.delete(value)
        return next
      }
      next.add(value)
      setLikeSelections((currentLikes) => {
        if (!currentLikes.has(value)) return currentLikes
        const updated = new Set(currentLikes)
        updated.delete(value)
        return updated
      })
      return next
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuisine preferences</CardTitle>
        <CardDescription>
          Pin cuisines you love and the ones you’d rather skip so suggestions stay relevant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Favourites</p>
            <p className="text-xs text-muted-foreground">
              We’ll spotlight recipes and meal ideas from these cuisines.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {sortedCuisineOptions.map(([value, label]) => {
              const isSelected = likeSelections.has(value)
              return (
                <button
                  key={`like-${value}`}
                  type="button"
                  onClick={() => toggleLike(value)}
                  className={cn(
                    "rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium shadow-xs transition",
                    "hover:border-emerald-500 hover:text-emerald-600",
                    isSelected && "border-emerald-500 bg-emerald-500/10 text-emerald-700 shadow-sm dark:text-emerald-200",
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Skip these</p>
            <p className="text-xs text-muted-foreground">
              We’ll downplay dishes highlighting these cuisines in your feed.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {sortedCuisineOptions.map(([value, label]) => {
              const isSelected = dislikeSelections.has(value)
              return (
                <button
                  key={`dislike-${value}`}
                  type="button"
                  onClick={() => toggleDislike(value)}
                  className={cn(
                    "rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium shadow-xs transition",
                    "hover:border-red-500 hover:text-red-600",
                    isSelected && "border-red-500 bg-red-500/10 text-red-700 shadow-sm dark:text-red-200",
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          Marking a cuisine as a favourite automatically removes it from the skip list to avoid conflicts.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasChanges}
          onClick={() => {
            setLikeSelections(new Set(likes))
            setDislikeSelections(new Set(dislikes))
          }}
        >
          Reset
        </Button>
        <Button
          size="sm"
          disabled={!hasChanges}
          onClick={() => {
            const nextLikes = Array.from(likeSelections).sort()
            const nextDislikes = Array.from(dislikeSelections).sort()
            if (onChangeAction) {
              onChangeAction({ likes: nextLikes, dislikes: nextDislikes })
            } else {
              console.info("TODO: save cuisine preferences", { likes: nextLikes, dislikes: nextDislikes })
            }
          }}
        >
          Save preferences
        </Button>
      </CardFooter>
    </Card>
  )
}

function setEquals(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false
  for (const value of a) {
    if (!b.has(value)) return false
  }
  return true
}
