import { redirect } from "next/navigation";

import {
  MissingKitchenError,
  loadKitchenData,
  type LocationSummary,
} from "@/lib/kitchen";
import { createClient } from "@/lib/supabase/server";

import { OnboardingExperience } from "./onboarding-experience";

const LOCATION_SUGGESTIONS = [
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

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function filterRealLocations(locations: LocationSummary[]) {
  return locations.filter((location) => location.id !== "__unassigned");
}

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  let kitchenData = null;

  try {
    kitchenData = await loadKitchenData(supabase, user.id);
  } catch (err) {
    if (err instanceof MissingKitchenError) {
      kitchenData = null;
    } else {
      throw err;
    }
  }

  if (!kitchenData) {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">We need a kitchen to continue</h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find a kitchen associated with your account. Try signing out and back in.
          If the problem continues, reach out to support so we can get you set up.
        </p>
      </section>
    );
  }

  if (kitchenData.user.onboardingComplete) {
    redirect("/protected");
  }

  const kitchen = kitchenData.kitchen;
  const realLocations = filterRealLocations(kitchen.locations);
  const normalizedExisting = new Map(
    realLocations.map((location) => [normalize(location.name), location] as const),
  );

  const defaultOptions = LOCATION_SUGGESTIONS.map((option) => ({
    value: option.value,
    description: option.description,
    icon: option.icon,
    selected: normalizedExisting.has(normalize(option.value)),
  }));

  if (!defaultOptions.some((option) => option.selected)) {
    for (const option of defaultOptions.slice(0, 3)) {
      option.selected = true;
    }
  }

  const defaultNames = new Set(defaultOptions.map((option) => normalize(option.value)));
  const initialCustomLocations = realLocations
    .filter((location) => !defaultNames.has(normalize(location.name)))
    .map((location) => ({
      id: location.id,
      name: location.name,
      icon: location.icon,
    }));

  const initialProfile = {
    firstName: kitchenData.user.firstName ?? "",
    lastName: kitchenData.user.lastName ?? "",
    sex: kitchenData.user.sex ?? "",
  };

  const initialPreferences = {
    dietaryPreferences: kitchenData.preferences.dietaryPreferences,
    allergens: kitchenData.preferences.allergens,
    cuisineLikes: kitchenData.preferences.cuisineLikes,
    cuisineDislikes: kitchenData.preferences.cuisineDislikes,
    personalizationOptIn: kitchenData.preferences.personalizationOptIn,
    unitsSystem: kitchenData.preferences.unitsSystem,
    locale: kitchenData.preferences.locale,
    emailOptIn: kitchenData.preferences.emailOptIn,
    pushOptIn: kitchenData.preferences.pushOptIn,
  };

  return (
    <OnboardingExperience
      kitchenId={kitchen.id}
      initialKitchenName={kitchen.name}
      userDisplayName={kitchenData.user.fullName ?? kitchenData.user.firstName ?? null}
      defaultOptions={defaultOptions}
      initialCustomLocations={initialCustomLocations}
      initialProfile={initialProfile}
      initialPreferences={initialPreferences}
      userNameForCard={kitchenData.user.fullName ?? kitchenData.user.firstName ?? null}
    />
  );
}
