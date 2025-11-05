"use client"

import { useState } from "react"

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

type MeasurementUnitsCardProps = {
  unitsSystem: "imperial" | "metric"
  onChangeAction?: (units: "imperial" | "metric") => void
}

const unitOptions = [
  {
    value: "imperial" as const,
    title: "Imperial",
    description: "Cups, ounces, pounds",
  },
  {
    value: "metric" as const,
    title: "Metric",
    description: "Litres, grams, kilograms",
  },
]

export function MeasurementUnitsCard({ unitsSystem, onChangeAction }: MeasurementUnitsCardProps) {
  const [selection, setSelection] = useState<"imperial" | "metric">(unitsSystem)

  const isDirty = selection !== unitsSystem

  return (
    <Card>
      <CardHeader>
        <CardTitle>Measurement units</CardTitle>
        <CardDescription>
          Choose the measurement system you prefer across recipes and inventory.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {unitOptions.map((option) => {
            const isSelected = selection === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelection(option.value)}
                className={cn(
                  "rounded-lg border border-border bg-background px-4 py-4 text-left transition",
                  "hover:border-primary/60 hover:bg-primary/5",
                  isSelected && "border-primary bg-primary/10 shadow-sm",
                )}
              >
                <span className="text-sm font-semibold text-foreground">{option.title}</span>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </button>
            )
          })}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!isDirty}
          onClick={() => setSelection(unitsSystem)}
        >
          Reset
        </Button>
        <Button
          size="sm"
          disabled={!isDirty}
          onClick={() => {
            if (onChangeAction) {
              onChangeAction(selection)
            } else {
              console.info("TODO: save measurement units", selection)
            }
          }}
        >
          Save units
        </Button>
      </CardFooter>
    </Card>
  )
}
