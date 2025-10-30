'use client';

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  ChefHat,
  CupSoda,
  IceCream,
  Snowflake,
  Utensils,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type IconChoice = {
  value: string;
  label: string;
  Icon: LucideIcon;
};

const DEFAULT_ICON_CHOICES: IconChoice[] = [
  { value: "boxes", label: "Pantry shelves", Icon: Boxes },
  { value: "snowflake", label: "Cold storage", Icon: Snowflake },
  { value: "ice-cream", label: "Freezer goods", Icon: IceCream },
  { value: "chef-hat", label: "Prep zone", Icon: ChefHat },
  { value: "utensils", label: "Serving area", Icon: Utensils },
  { value: "cup-soda", label: "Beverages", Icon: CupSoda },
];

type DefaultOption = {
  value: string;
  description: string;
  icon?: string | null;
  selected?: boolean;
};

type CustomLocation = {
  id: string;
  name: string;
  icon?: string | null;
};

type FinalLocation = {
  name: string;
  icon: string | null;
  source: "default" | "custom";
};

type LocationPlannerProps = {
  defaultOptions: DefaultOption[];
  initialCustomLocations?: CustomLocation[];
  iconChoices?: IconChoice[];
};

function getIconComponent(value: string | null | undefined, choices: IconChoice[]): LucideIcon {
  const found = choices.find((choice) => choice.value === value);
  return (found?.Icon ?? choices[0]?.Icon) ?? Boxes;
}

function getIconLabel(value: string | null | undefined, choices: IconChoice[]): string {
  return choices.find((choice) => choice.value === value)?.label ?? "Custom area";
}

export function LocationPlanner({
  defaultOptions,
  initialCustomLocations = [],
  iconChoices = DEFAULT_ICON_CHOICES,
}: LocationPlannerProps) {
  const defaultSelections = useMemo(
    () =>
      new Set(
        defaultOptions
          .filter((option) => option.selected)
          .map((option) => option.value.toLowerCase()),
      ),
    [defaultOptions],
  );

  const [selectedDefaults, setSelectedDefaults] = useState<Set<string>>(defaultSelections);
  const [customLocations, setCustomLocations] = useState<CustomLocation[]>(initialCustomLocations);
  const [isAdding, setIsAdding] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationIcon, setNewLocationIcon] = useState(iconChoices[0]?.value ?? "boxes");
  const [formError, setFormError] = useState<string | null>(null);

  const defaultOptionLookup = useMemo(
    () => new Map(defaultOptions.map((option) => [option.value.toLowerCase(), option])),
    [defaultOptions],
  );

  const finalLocations: FinalLocation[] = useMemo(() => {
    const defaults = defaultOptions
      .filter((option) => selectedDefaults.has(option.value.toLowerCase()))
      .map(
        (option): FinalLocation => ({
          name: option.value,
          icon: option.icon ?? iconChoices[0]?.value ?? null,
          source: "default",
        }),
      );

    const customs = customLocations.map(
      (location): FinalLocation => ({
        name: location.name,
        icon: location.icon ?? iconChoices[0]?.value ?? null,
        source: "custom",
      }),
    );

    if (defaults.length === 0 && customs.length === 0 && defaultOptions.length > 0) {
      return [
        {
          name: defaultOptions[0].value,
          icon: defaultOptions[0].icon ?? iconChoices[0]?.value ?? null,
          source: "default",
        },
      ];
    }

    return [...defaults, ...customs];
  }, [customLocations, defaultOptions, iconChoices, selectedDefaults]);

  const toggleDefaultSelection = (value: string) => {
    setSelectedDefaults((previous) => {
      const next = new Set(previous);
      const normalized = value.toLowerCase();
      if (next.has(normalized)) {
        next.delete(normalized);
      } else {
        next.add(normalized);
      }
      return next;
    });
  };

  const handleRemoveCustom = (id: string) => {
    setCustomLocations((previous) => previous.filter((location) => location.id !== id));
  };

  const startAdd = () => {
    setIsAdding(true);
    setFormError(null);
    setNewLocationName("");
    setNewLocationIcon(iconChoices[0]?.value ?? "boxes");
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setFormError(null);
    setNewLocationName("");
    setNewLocationIcon(iconChoices[0]?.value ?? "boxes");
  };

  const handleAddCustom = () => {
    const trimmed = newLocationName.trim();
    if (!trimmed) {
      setFormError("Give this location a name before adding it.");
      return;
    }

    const normalized = trimmed.toLowerCase();
    if (selectedDefaults.has(normalized) && defaultOptionLookup.has(normalized)) {
      setFormError("That location is already selected above.");
      return;
    }

    if (customLocations.some((location) => location.name.trim().toLowerCase() === normalized)) {
      setFormError("That location is already on your list.");
      return;
    }

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    setCustomLocations((previous) => [
      ...previous,
      { id, name: trimmed, icon: newLocationIcon ?? iconChoices[0]?.value ?? "boxes" },
    ]);
    setIsAdding(false);
    setNewLocationName("");
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-left">
        <p className="text-sm font-medium">Storage locations</p>
        <p className="text-xs text-muted-foreground">
          Choose which areas you want to manage from day one. You can fine-tune them later in
          settings.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {defaultOptions.map((option) => {
            const Icon = getIconComponent(option.icon, iconChoices);
            const normalized = option.value.toLowerCase();
            const isChecked = selectedDefaults.has(normalized);

            return (
              <label
                key={option.value}
                htmlFor={`default-location-${option.value}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background/70 p-3 text-sm transition hover:border-emerald-500",
                  isChecked && "border-emerald-500 bg-emerald-500/5",
                )}
              >
                <Checkbox
                  id={`default-location-${option.value}`}
                  name={`default-location-${option.value}`}
                  checked={isChecked}
                  onCheckedChange={() => toggleDefaultSelection(option.value)}
                />
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium">{option.value}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 text-left">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Custom locations</p>
            <p className="text-xs text-muted-foreground">
              Add unique zones like a spice rack, coffee bar, or baking corner.
            </p>
          </div>
          {!isAdding ? (
            <Button variant="outline" type="button" onClick={startAdd} size="sm">
              Add location
            </Button>
          ) : null}
        </div>

        {customLocations.length === 0 && !isAdding ? (
          <p className="text-xs text-muted-foreground">
            No custom locations yet. Add one to make your kitchen feel personal.
          </p>
        ) : null}

        <div className="space-y-2">
          {customLocations.map((location) => {
            const Icon = getIconComponent(location.icon, iconChoices);
            const iconLabel = getIconLabel(location.icon, iconChoices);

            return (
              <div
                key={location.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background/70 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium">{location.name}</span>
                    <span className="text-xs text-muted-foreground">{iconLabel}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveCustom(location.id)}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>

        {isAdding ? (
          <div className="rounded-lg border border-emerald-500/30 bg-background/80 p-4 shadow-sm">
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="newLocationName" className="text-sm font-medium">
                  Location name
                </label>
                <Input
                  id="newLocationName"
                  value={newLocationName}
                  onChange={(event) => setNewLocationName(event.target.value)}
                  placeholder="Spice Rack"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">Icon</p>
                <div className="flex flex-wrap gap-2">
                  {iconChoices.map((choice) => {
                    const Icon = choice.Icon;
                    const isSelected = newLocationIcon === choice.value;
                    return (
                      <button
                        key={choice.value}
                        type="button"
                        onClick={() => setNewLocationIcon(choice.value)}
                        className={cn(
                          "flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium transition hover:border-emerald-500",
                          isSelected && "border-emerald-500 bg-emerald-500/10 text-emerald-700",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        {choice.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formError ? <p className="text-xs text-destructive">{formError}</p> : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={cancelAdd}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleAddCustom}>
                  Add location
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {finalLocations.map((location, index) => (
        <input
          key={`${location.source}-${location.name}-${index}`}
          type="hidden"
          name="locationsPayload"
          value={JSON.stringify({
            name: location.name,
            icon: location.icon,
            order: index,
            source: location.source,
          })}
        />
      ))}
    </div>
  );
}
