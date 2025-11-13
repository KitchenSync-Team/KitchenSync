import type { LocationSummary } from "@/lib/domain/kitchen";

export type LocationSuggestion = {
  value: string;
  description: string;
  icon: string;
};

export type DefaultLocationOption = LocationSuggestion & {
  selected?: boolean;
};

export type CustomPlannerLocation = {
  id: string;
  name: string;
  icon?: string | null;
};

export type LocationPlannerState = {
  defaultOptions: DefaultLocationOption[];
  initialCustomLocations: CustomPlannerLocation[];
};

export const LOCATION_SUGGESTIONS: readonly LocationSuggestion[] = [
  {
    value: "Pantry",
    description: "Dry goods, snacks, and shelf-stable staples.",
    icon: "boxes",
  },
  {
    value: "Fridge",
    description: "Fresh produce, dairy, and leftovers that need chilling.",
    icon: "refrigerator",
  },
  {
    value: "Freezer",
    description: "Frozen meals, vegetables, and long-term storage.",
    icon: "snowflake",
  },
  {
    value: "Spice Rack",
    description: "Seasonings, oils, and small jars you reach for often.",
    icon: "sprout",
  },
] as const;

export function normalizeLocationName(value: string) {
  return value.trim().toLowerCase();
}

export function filterRealLocations(locations: LocationSummary[]) {
  return locations.filter((location) => location.id !== "__unassigned");
}

export function deriveLocationPlannerState(
  locations: LocationSummary[],
): LocationPlannerState {
  const realLocations = filterRealLocations(locations);
  const normalizedExisting = new Map(
    realLocations.map((location) => [normalizeLocationName(location.name), location] as const),
  );

  const defaultOptions: DefaultLocationOption[] = LOCATION_SUGGESTIONS.map((option) => ({
    value: option.value,
    description: option.description,
    icon: option.icon,
    selected: normalizedExisting.has(normalizeLocationName(option.value)),
  }));

  if (!defaultOptions.some((option) => option.selected)) {
    for (const option of defaultOptions.slice(0, 3)) {
      option.selected = true;
    }
  }

  const defaultNames = new Set(defaultOptions.map((option) => normalizeLocationName(option.value)));
  const initialCustomLocations: CustomPlannerLocation[] = realLocations
    .filter((location) => !defaultNames.has(normalizeLocationName(location.name)))
    .map((location) => ({
      id: location.id,
      name: location.name,
      icon: location.icon,
    }));

  return {
    defaultOptions,
    initialCustomLocations,
  };
}
