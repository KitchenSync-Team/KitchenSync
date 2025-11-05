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
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

type DietaryPreferencesCardProps = {
  dietaryPreferences: string[]
  allergens: string[]
  dietaryOptions: Record<string, string>
  allergenOptions: Record<string, string>
  onChangeAction?: (payload: { dietaryPreferences: string[]; allergens: string[] }) => void
}

export function DietaryPreferencesCard({
  dietaryPreferences,
  allergens,
  dietaryOptions,
  allergenOptions,
  onChangeAction,
}: DietaryPreferencesCardProps) {
  const [dietarySelections, setDietarySelections] = useState<Set<string>>(new Set(dietaryPreferences))
  const [allergenSelections, setAllergenSelections] = useState<Set<string>>(new Set(allergens))

  const sortedDietaryOptions = useMemo(
    () => Object.entries(dietaryOptions).sort((a, b) => a[1].localeCompare(b[1])),
    [dietaryOptions],
  )
  const sortedAllergenOptions = useMemo(
    () => Object.entries(allergenOptions).sort((a, b) => a[1].localeCompare(b[1])),
    [allergenOptions],
  )

  const hasChanges =
    !setEquals(dietarySelections, new Set(dietaryPreferences)) ||
    !setEquals(allergenSelections, new Set(allergens))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dietary &amp; allergens</CardTitle>
        <CardDescription>
          Select eating styles you follow and ingredients you need us to flag.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Dietary styles</p>
            <p className="text-xs text-muted-foreground">
              Helps tailor recommendations and ingredient swap suggestions.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {sortedDietaryOptions.map(([value, label]) => {
              const checked = dietarySelections.has(value)
              return (
                <label
                  key={value}
                  htmlFor={`diet-${value}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border bg-background/70 p-3 text-sm transition hover:border-emerald-500",
                    checked && "border-emerald-500 bg-emerald-500/5",
                  )}
                >
                  <Checkbox
                    id={`diet-${value}`}
                    checked={checked}
                    onCheckedChange={(isChecked) =>
                      setDietarySelections((previous) => toggle(previous, value, isChecked === true))
                    }
                  />
                  <span className="font-medium">{label}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Allergens to avoid</p>
            <p className="text-xs text-muted-foreground">
              We’ll flag ingredients and recipes containing anything listed here.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {sortedAllergenOptions.map(([value, label]) => {
              const checked = allergenSelections.has(value)
              return (
                <label
                  key={value}
                  htmlFor={`allergen-${value}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border bg-background/70 p-3 text-sm transition hover:border-rose-500",
                    checked && "border-rose-500 bg-rose-500/5",
                  )}
                >
                  <Checkbox
                    id={`allergen-${value}`}
                    checked={checked}
                    checkedClassName="data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:text-white"
                    focusRingClassName="focus-visible:ring-red-500"
                    indicatorClassName="text-white"
                    indicatorIcon={X}
                    onCheckedChange={(isChecked) =>
                      setAllergenSelections((previous) => toggle(previous, value, isChecked === true))
                    }
                  />
                  <span className={cn("font-medium", checked && "text-red-700 dark:text-red-200")}>{label}</span>
                </label>
              )
            })}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasChanges}
          onClick={() => {
            setDietarySelections(new Set(dietaryPreferences))
            setAllergenSelections(new Set(allergens))
          }}
        >
          Reset
        </Button>
        <Button
          size="sm"
          disabled={!hasChanges}
          onClick={() => {
            if (onChangeAction) {
              onChangeAction({
                dietaryPreferences: Array.from(dietarySelections).sort(),
                allergens: Array.from(allergenSelections).sort(),
              })
            } else {
              console.info("TODO: save dietary profile", {
                dietaryPreferences: Array.from(dietarySelections).sort(),
                allergens: Array.from(allergenSelections).sort(),
              })
            }
          }}
        >
          Save dietary profile
        </Button>
      </CardFooter>
    </Card>
  )
}

function toggle(set: Set<string>, value: string, shouldAdd: boolean) {
  const next = new Set(set)
  if (shouldAdd) {
    next.add(value)
  } else {
    next.delete(value)
  }
  return next
}

function setEquals(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false
  for (const value of a) {
    if (!b.has(value)) return false
  }
  return true
}
