'use client';

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Apple,
  ArchiveRestore,
  Boxes,
  Carrot,
  Drumstick,
  Fish,
  Home,
  Milk,
  Refrigerator,
  ShoppingBasket,
  Snowflake,
  Sprout,
  Table,
  Utensils,
  Warehouse,
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

const STORAGE_ICON_CHOICES: IconChoice[] = [
  { value: "boxes", label: "Pantry", Icon: Boxes },
  { value: "archive-restore", label: "Cabinets", Icon: ArchiveRestore },
  { value: "home", label: "Kitchen", Icon: Home },
  { value: "refrigerator", label: "Fridge", Icon: Refrigerator },
  { value: "snowflake", label: "Freezer", Icon: Snowflake },
  { value: "table", label: "Counter", Icon: Table },
  { value: "warehouse", label: "Garage", Icon: Warehouse },
  { value: "shopping-basket", label: "Supplies", Icon: ShoppingBasket },
  { value: "utensils", label: "Serveware", Icon: Utensils },
];

const FOOD_ICON_CHOICES: IconChoice[] = [
  { value: "apple", label: "Fruits", Icon: Apple },
  { value: "carrot", label: "Vegetables", Icon: Carrot },
  { value: "milk", label: "Dairy", Icon: Milk },
  { value: "drumstick", label: "Proteins", Icon: Drumstick },
  { value: "fish", label: "Seafoods", Icon: Fish },
  { value: "sprout", label: "Herbs", Icon: Sprout },
];

type IconSection = {
  id: string;
  label: string;
  choices: IconChoice[];
};

const DEFAULT_ICON_SECTIONS: IconSection[] = [
  { id: "storage", label: "Storage icons", choices: STORAGE_ICON_CHOICES },
  { id: "food", label: "Food icons", choices: FOOD_ICON_CHOICES },
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
  iconSections?: IconSection[];
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
  iconSections = DEFAULT_ICON_SECTIONS,
  onSelectionChange,
}: LocationPlannerProps & {
  onSelectionChange?: (summary: { total: number; defaults: number; customs: number }) => void;
}) {
  const allIconChoices = useMemo(
    () => iconSections.flatMap((section) => section.choices),
    [iconSections],
  );
  const defaultIcon = allIconChoices[0]?.value ?? "boxes";

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
  const [newLocationIcon, setNewLocationIcon] = useState(defaultIcon);
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
          icon: option.icon ?? defaultIcon,
          source: "default",
        }),
      );

    const customs = customLocations.map(
      (location): FinalLocation => ({
        name: location.name,
        icon: location.icon ?? defaultIcon,
        source: "custom",
      }),
    );

    return [...defaults, ...customs];
  }, [customLocations, defaultOptions, defaultIcon, selectedDefaults]);

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
    setNewLocationIcon(defaultIcon);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setFormError(null);
    setNewLocationName("");
    setNewLocationIcon(defaultIcon);
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
      { id, name: trimmed, icon: newLocationIcon ?? defaultIcon },
    ]);
    setIsAdding(false);
    setNewLocationName("");
    setFormError(null);
  };

  useEffect(() => {
    onSelectionChange?.({
      total: finalLocations.length,
      defaults: finalLocations.filter((location) => location.source === "default").length,
      customs: finalLocations.filter((location) => location.source === "custom").length,
    });
  }, [finalLocations, onSelectionChange]);

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
            const Icon = getIconComponent(option.icon, allIconChoices);
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
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 aspect-square">
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
              Add unique zones like a coffee bar, appliance nook, or baking corner.
            </p>
          </div>
          {!isAdding ? (
            <Button
              variant="outline"
              type="button"
              onClick={startAdd}
              size="sm"
              className="border-emerald-500 hover:bg-emerald-500/10 focus-visible:ring-emerald-500 dark:border-emerald-400 dark:hover:bg-emerald-500/20"
            >
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
            const Icon = getIconComponent(location.icon, allIconChoices);
            const iconLabel = getIconLabel(location.icon, allIconChoices);

            return (
              <div
                key={location.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background/70 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 aspect-square">
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
                  className="hover:bg-red-500/10 focus-visible:ring-red-500 dark:hover:bg-red-500/20"
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
                <div className="flex flex-col gap-3">
                  {iconSections.map((section) => (
                    <div key={section.id} className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {section.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {section.choices.map((choice) => {
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
                  ))}
                </div>
              </div>

              {formError ? <p className="text-xs text-destructive">{formError}</p> : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelAdd}
                  className="hover:bg-emerald-500/10 focus-visible:ring-emerald-500 dark:hover:bg-emerald-500/20"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustom}
                  className="bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
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
