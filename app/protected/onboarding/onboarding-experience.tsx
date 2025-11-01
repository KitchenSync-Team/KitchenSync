"use client";

import { useMemo, useState } from "react";

import { OnboardingForm } from "@/app/protected/onboarding/onboarding-form";

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

type ProfileSnapshot = {
  firstName: string | null;
  lastName: string | null;
  sex: string | null;
};

type PreferenceSnapshot = {
  dietaryPreferences: string[];
  allergens: string[];
  personalizationOptIn: boolean | null;
  unitsSystem: string | null;
  locale: string | null;
  emailOptIn: boolean | null;
  pushOptIn: boolean | null;
};

type OnboardingExperienceProps = {
  kitchenId: string;
  initialKitchenName: string;
  userDisplayName: string | null;
  defaultOptions: DefaultOption[];
  initialCustomLocations: CustomLocation[];
  initialProfile: ProfileSnapshot;
  initialPreferences: PreferenceSnapshot;
  userNameForCard: string | null;
};

function deriveFirstNameFallback(initialProfile: ProfileSnapshot, userDisplayName: string | null) {
  if (initialProfile.firstName && initialProfile.firstName.trim().length > 0) {
    return initialProfile.firstName.trim();
  }
  if (userDisplayName && userDisplayName.trim().length > 0) {
    const [first] = userDisplayName.trim().split(/\s+/);
    return first ?? userDisplayName.trim();
  }
  return "";
}

export function OnboardingExperience({
  kitchenId,
  initialKitchenName,
  userDisplayName,
  defaultOptions,
  initialCustomLocations,
  initialProfile,
  initialPreferences,
  userNameForCard,
}: OnboardingExperienceProps) {
  const fallbackFirstName = useMemo(
    () => deriveFirstNameFallback(initialProfile, userDisplayName),
    [initialProfile, userDisplayName],
  );

  const [previewFirstName, setPreviewFirstName] = useState(fallbackFirstName);

  const effectiveFirstName = previewFirstName.trim().length > 0
    ? previewFirstName.trim()
    : fallbackFirstName.trim();
  const greetingName = effectiveFirstName.length > 0 ? effectiveFirstName : null;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-10 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Let&apos;s get your kitchen ready</h1>
        <p className="text-sm text-muted-foreground">
          {greetingName ? `Hi ${greetingName}!` : "Hi there!"} In the next few steps we&apos;ll confirm your profile,
          preferences, and kitchen setup so KitchenSync feels like yours.
        </p>
      </header>

      <OnboardingForm
        kitchenId={kitchenId}
        kitchenName={initialKitchenName}
        userName={userNameForCard}
        defaultOptions={defaultOptions}
        initialCustomLocations={initialCustomLocations}
        initialProfile={initialProfile}
        initialPreferences={initialPreferences}
        onProfilePreviewChangeAction={({ firstName }) => {
          setPreviewFirstName(firstName);
        }}
      />
    </section>
  );
}
