import { redirect } from "next/navigation";

import { MissingKitchenError, loadKitchenData } from "@/lib/domain/kitchen";
import { createClient } from "@/lib/supabase/server";

import { deriveLocationPlannerState } from "@/app/protected/_lib/location-presets";
import { OnboardingExperience } from "./onboarding-experience";

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
  const { defaultOptions, initialCustomLocations } = deriveLocationPlannerState(
    kitchen.locations,
  );

  const initialProfile = {
    firstName: kitchenData.user.firstName ?? "",
    lastName: kitchenData.user.lastName ?? "",
    sex: kitchenData.user.sex ?? "",
    avatarUrl: kitchenData.user.avatarUrl ?? null,
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
