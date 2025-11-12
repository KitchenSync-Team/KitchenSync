"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateCuisinePreferencesClient } from "@/components/profile/profile-mutations"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/supabase/utils"

type CuisinePreferencesCardProps = {
  likes: string[]
  dislikes: string[]
  cuisineOptions: Record<string, string>
}

export function CuisinePreferencesCard({ likes, dislikes, cuisineOptions }: CuisinePreferencesCardProps) {
  const router = useRouter()
  const [likeSelections, setLikeSelections] = useState<Set<string>>(new Set(likes))
  const [dislikeSelections, setDislikeSelections] = useState<Set<string>>(new Set(dislikes))
  const [saving, setSaving] = useState(false)

  const sortedCuisineOptions = useMemo(
    () => Object.entries(cuisineOptions).sort((a, b) => a[1].localeCompare(b[1])),
    [cuisineOptions],
  )

  const hasChanges =
    !setEquals(likeSelections, new Set(likes)) || !setEquals(dislikeSelections, new Set(dislikes))

  const handleSave = async () => {
    if (!hasChanges) return
    setSaving(true)
    try {
      const nextLikes = Array.from(likeSelections).sort()
      const nextDislikes = Array.from(dislikeSelections).sort()
      const result = await updateCuisinePreferencesClient({ likes: nextLikes, dislikes: nextDislikes })
      if (!result.success) {
        toast.error("Couldn’t save cuisine preferences", {
          description: result.error ?? "Please try again.",
        })
        return
      }
      toast.success("Cuisine preferences saved", {
        description: "We’ll highlight and hide cuisines accordingly.",
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

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
          disabled={!hasChanges || saving}
          onClick={() => {
            setLikeSelections(new Set(likes))
            setDislikeSelections(new Set(dislikes))
          }}
        >
          Reset
        </Button>
        <Button
          size="sm"
          disabled={!hasChanges || saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save preferences"}
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
