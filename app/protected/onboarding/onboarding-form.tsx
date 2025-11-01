"use client";

import type { FormEvent } from "react";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTheme } from "next-themes";

import { LocationPlanner } from "@/components/onboarding/location-planner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { toast } from "sonner";
import {
  ALLERGEN_OPTIONS,
  DIETARY_OPTIONS,
  LOCATION_REQUIRED_ERROR_MESSAGE,
  PERSONALIZATION_DEFAULT,
  SEX_OPTIONS,
} from "./constants";
import { completeOnboarding } from "./actions";
import { defaultOnboardingState } from "./action-state";
import { X } from "lucide-react";

const ONBOARDING_ERROR_TOAST_ID = "onboarding-error";

type OnboardingErrorMessage = {
  title: string;
  description: string;
};

const LOCATION_REQUIRED_ERROR: OnboardingErrorMessage = {
  title: "Add a storage location",
  description: LOCATION_REQUIRED_ERROR_MESSAGE,
};

const UNIT_SYSTEM_OPTIONS = [
  { value: "imperial", label: "Imperial (°F, lbs, gallons)" },
  { value: "metric", label: "Metric (°C, kg, liters)" },
];

const THEME_OPTIONS: Array<{ value: "system" | "light" | "dark"; label: string }> = [
  { value: "system", label: "Match system" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
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

type OnboardingFormProps = {
  kitchenId: string;
  kitchenName: string;
  userName: string | null;
  defaultOptions: DefaultOption[];
  initialCustomLocations: CustomLocation[];
  initialProfile: {
    firstName: string | null;
    lastName: string | null;
    sex: string | null;
  };
  initialPreferences: {
    dietaryPreferences: string[];
    allergens: string[];
    personalizationOptIn: boolean | null;
    unitsSystem: string | null;
    locale: string | null;
    emailOptIn: boolean | null;
    pushOptIn: boolean | null;
  };
  onProfilePreviewChangeAction?: (preview: {
    firstName: string;
    lastName: string;
    sex: string | undefined;
  }) => void;
};

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="px-6 bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
      aria-disabled={disabled || undefined}
      disabled={pending || disabled}
    >
      {pending ? "Saving…" : label}
    </Button>
  );
}

const STEP_DETAILS = [
  {
    title: "Introduce yourself",
    description: "Share your name so invites and notifications feel personal.",
  },
  {
    title: "Personalize KitchenSync",
    description: "Tell us about your diet and allergens to tailor suggestions.",
  },
  {
    title: "Set up your kitchen",
    description: "Name your kitchen and pick the storage areas you want to track first.",
  },
] as const;

export function OnboardingForm({
  kitchenId,
  kitchenName,
  userName,
  defaultOptions,
  initialCustomLocations,
  initialProfile,
  initialPreferences,
  onProfilePreviewChangeAction,
}: OnboardingFormProps) {
  const [state, dispatchOnboarding] = useActionState(completeOnboarding, defaultOnboardingState);
  const [activeError, setActiveError] = useState<OnboardingErrorMessage | null>(null);
  const parseOnboardingError = useCallback((rawError?: string): OnboardingErrorMessage => {
    const normalized = rawError?.trim();

    if (normalized === LOCATION_REQUIRED_ERROR_MESSAGE) {
      return LOCATION_REQUIRED_ERROR;
    }

    if (normalized && /add at least (one|1) location to your kitchen/i.test(normalized)) {
      return LOCATION_REQUIRED_ERROR;
    }

    if (normalized && /choose at least one storage location/i.test(normalized)) {
      return LOCATION_REQUIRED_ERROR;
    }

    if (normalized && /couldn't determine which kitchen to configure/i.test(normalized)) {
      return {
        title: "Kitchen not found",
        description:
          "We lost track of the kitchen you're configuring. Refresh the page or sign out and back in, then try again.",
      };
    }

    if (normalized && normalized.length > 0) {
      return {
        title: "We couldn't finish that just yet.",
        description: normalized,
      };
    }

    return {
      title: "We couldn't finish that just yet.",
      description:
        "We hit an unexpected issue saving your setup. Try again in a moment or contact support if it continues.",
    };
  }, []);
  const clearError = useCallback(() => {
    setActiveError(null);
    toast.dismiss(ONBOARDING_ERROR_TOAST_ID);
  }, []);

  const raiseError = useCallback((message: OnboardingErrorMessage) => {
    toast.dismiss(ONBOARDING_ERROR_TOAST_ID);

    toast.error(message.title, {
      id: ONBOARDING_ERROR_TOAST_ID,
      description: message.description,
      duration: 6000,
    });

    setActiveError(message);
  }, []);

  const [stepIndex, setStepIndex] = useState(0);
  const totalSteps = STEP_DETAILS.length;

  const [firstName, setFirstName] = useState(initialProfile.firstName ?? "");
  const [lastName, setLastName] = useState(initialProfile.lastName ?? "");
  const [sex, setSex] = useState<string | undefined>(initialProfile.sex ?? undefined);
  const [formKitchenName, setFormKitchenName] = useState(kitchenName);

  const [dietarySelections, setDietarySelections] = useState<Set<string>>(
    () => new Set(initialPreferences.dietaryPreferences),
  );
  const [allergenSelections, setAllergenSelections] = useState<Set<string>>(
    () => new Set(initialPreferences.allergens),
  );
  const [personalizationOptIn, setPersonalizationOptIn] = useState(
    initialPreferences.personalizationOptIn ?? PERSONALIZATION_DEFAULT,
  );
  const [unitsSystem, setUnitsSystem] = useState<"imperial" | "metric">(
    initialPreferences.unitsSystem === "metric" ? "metric" : "imperial",
  );
  const [emailOptIn, setEmailOptIn] = useState(initialPreferences.emailOptIn ?? true);
  const { theme: currentTheme = "system", setTheme } = useTheme();
  const initialLocale = initialPreferences.locale ?? "en-US";
  const initialPushOptIn = initialPreferences.pushOptIn ?? false;
  const [locationSummary, setLocationSummary] = useState({ total: 0, defaults: 0, customs: 0 });

  const handleLocationSummaryChange = useCallback(
    (summary: { total: number; defaults: number; customs: number }) => {
      setLocationSummary((previous) => {
        if (
          previous.total === summary.total &&
          previous.defaults === summary.defaults &&
          previous.customs === summary.customs
        ) {
          return previous;
        }
        return summary;
      });
    },
    [],
  );

  useEffect(() => {
    if (onProfilePreviewChangeAction) {
      onProfilePreviewChangeAction({
        firstName,
        lastName,
        sex,
      });
    }
  }, [firstName, lastName, sex, onProfilePreviewChangeAction]);
  useEffect(() => {
    if (state.status !== "error") {
      return;
    }

    const nextError = parseOnboardingError(state.error);
    if (
      activeError &&
      activeError.title === nextError.title &&
      activeError.description === nextError.description
    ) {
      return;
    }

    raiseError(nextError);
  }, [state.status, state.error, parseOnboardingError, raiseError, activeError]);
  useEffect(() => {
    if (state.status === "idle" && activeError && activeError !== LOCATION_REQUIRED_ERROR) {
      clearError();
    }
  }, [state.status, activeError, clearError]);
  useEffect(() => {
    if (locationSummary.total > 0 && activeError === LOCATION_REQUIRED_ERROR) {
      clearError();
    }
  }, [locationSummary.total, activeError, clearError]);

  const handleContinue = () => {
    setStepIndex((current) => Math.min(current + 1, totalSteps - 1));
  };

  const handleBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const toggleSelection = (current: Set<string>, value: string, shouldSelect: boolean) => {
    const next = new Set(current);
    if (shouldSelect) {
      next.add(value);
    } else {
      next.delete(value);
    }
    return next;
  };

  const dietaryOptions = useMemo(() => Array.from(dietarySelections), [dietarySelections]);
  const allergenOptions = useMemo(() => Array.from(allergenSelections), [allergenSelections]);
  const reorderColumnMajor = useCallback(<T extends { label: string; value: string }>(items: T[]) => {
    const mid = Math.ceil(items.length / 2);
    const columnOne = items.slice(0, mid);
    const columnTwo = items.slice(mid);
    const result: T[] = [];
    for (let index = 0; index < mid; index += 1) {
      if (columnOne[index]) {
        result.push(columnOne[index]);
      }
      if (columnTwo[index]) {
        result.push(columnTwo[index]);
      }
    }
    return result;
  }, []);

  const sortedDietaryOptions = useMemo(() => {
    const alphabetical = [...DIETARY_OPTIONS].sort((a, b) => a.label.localeCompare(b.label));
    return reorderColumnMajor(alphabetical);
  }, [reorderColumnMajor]);

  const sortedAllergenOptions = useMemo(() => {
    const alphabetical = [...ALLERGEN_OPTIONS].sort((a, b) => a.label.localeCompare(b.label));
    return reorderColumnMajor(alphabetical);
  }, [reorderColumnMajor]);

  const handleFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (locationSummary.total === 0) {
        event.preventDefault();
        return;
      }

      if (activeError) {
        clearError();
      }
    },
    [locationSummary.total, activeError, clearError],
  );

  const submitDisabled = locationSummary.total === 0;
  const themeValue = currentTheme ?? "system";

  return (
    <form action={dispatchOnboarding} method="POST" onSubmit={handleFormSubmit} className="space-y-6">
      <input type="hidden" name="kitchenId" value={kitchenId} />
      <input type="hidden" name="firstName" value={firstName} />
      <input type="hidden" name="lastName" value={lastName} />
      <input type="hidden" name="sex" value={sex ?? ""} />
      <input type="hidden" name="kitchenName" value={formKitchenName} />
      <input
        type="hidden"
        name="personalizationOptIn"
        value={personalizationOptIn ? "true" : "false"}
      />
      <input type="hidden" name="unitsSystem" value={unitsSystem} />
      <input type="hidden" name="locale" value={initialLocale} />
      <input type="hidden" name="emailOptIn" value={emailOptIn ? "true" : "false"} />
      <input type="hidden" name="pushOptIn" value={initialPushOptIn ? "true" : "false"} />
      {dietaryOptions.map((preference) => (
        <input key={preference} type="hidden" name="dietaryPreferences" value={preference} />
      ))}
      {allergenOptions.map((allergen) => (
        <input key={allergen} type="hidden" name="allergens" value={allergen} />
      ))}

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Step {stepIndex + 1} of {totalSteps}
        </p>
        <h2 className="text-xl font-semibold tracking-tight">{STEP_DETAILS[stepIndex].title}</h2>
        <p className="text-sm text-muted-foreground">{STEP_DETAILS[stepIndex].description}</p>
      </div>

      <div
        className={cn("space-y-6", stepIndex === 0 ? "block" : "hidden")}
        aria-hidden={stepIndex !== 0}
      >
        <Card>
          <CardHeader>
            <CardTitle>About you</CardTitle>
            <CardDescription>
              {userName
                ? `Welcome, ${userName}! Update anything we should know about you.`
                : "Let your collaborators know who they’re cooking with."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName-controlled"
                  placeholder="Jordan"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  maxLength={120}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName-controlled"
                  placeholder="Morgan"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  maxLength={120}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sex">How do you describe yourself?</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger
                  id="sex"
                  name="sex-controlled"
                  className="focus-visible:border-emerald-500 focus-visible:ring-emerald-500/40"
                >
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {SEX_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="data-[state=checked]:bg-emerald-500/10 data-[state=checked]:text-emerald-700 dark:data-[state=checked]:bg-emerald-500/20 dark:data-[state=checked]:text-emerald-200"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Optional. We use it in greetings and wellness insights.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your preferences</CardTitle>
            <CardDescription>
              Decide how KitchenSync looks and how we keep in touch. KitchenSync currently supports English (US).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="themePreference">Theme</Label>
              <Select
                value={themeValue}
                onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
              >
                <SelectTrigger
                  id="themePreference"
                  className="focus-visible:border-emerald-500 focus-visible:ring-emerald-500/40"
                >
                  <SelectValue placeholder="Choose theme" />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Instantly switch between light, dark, or match your device setting. You can update this anytime in settings.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitsSystem">Measurement units</Label>
              <Select
                value={unitsSystem}
                onValueChange={(value) => setUnitsSystem(value as "imperial" | "metric")}
              >
                <SelectTrigger
                  id="unitsSystem"
                  className="focus-visible:border-emerald-500 focus-visible:ring-emerald-500/40"
                >
                  <SelectValue placeholder="Choose units" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_SYSTEM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-background/70 p-4">
              <div className="flex items-center justify-between">
                <div className="max-w-[75%] space-y-1">
                  <p className="text-sm font-medium">Email updates</p>
                  <p className="text-xs text-muted-foreground">
                    Receive helpful tips, release notes, and important notices in your inbox. You can unsubscribe at any time.
                  </p>
                </div>
                <Switch
                  id="emailOptIn"
                  aria-label="Toggle email updates"
                  checked={emailOptIn}
                  onCheckedChange={(value) => setEmailOptIn(Boolean(value))}
                />
              </div>

              <div className="h-px bg-border" />

              <div className="flex items-center justify-between">
                <div className="max-w-[75%] space-y-1">
                  <p className="text-sm font-medium">Personalized tips</p>
                  <p className="text-xs text-muted-foreground">
                    Use your profile and preferences to tailor recipe ideas, alerts, and messages. Turn this off for more generic suggestions.
                  </p>
                </div>
                <Switch
                  id="personalizationOptIn"
                  aria-label="Toggle personalization"
                  checked={personalizationOptIn}
                  onCheckedChange={(value) => setPersonalizationOptIn(Boolean(value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        className={cn("space-y-6", stepIndex === 1 ? "block" : "hidden")}
        aria-hidden={stepIndex !== 1}
      >
        <Card>
          <CardHeader>
            <CardTitle>Dietary preferences</CardTitle>
            <CardDescription>
              Select any eating styles you follow, or leave blank if none apply.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {sortedDietaryOptions.map((option) => {
                const checked = dietarySelections.has(option.value);
                return (
                  <label
                    key={option.value}
                    htmlFor={`diet-${option.value}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-border bg-background/70 p-3 text-sm transition hover:border-emerald-500",
                      checked && "border-emerald-500 bg-emerald-500/5",
                    )}
                  >
                    <Checkbox
                      id={`diet-${option.value}`}
                      checked={checked}
                      onCheckedChange={(isChecked) =>
                        setDietarySelections((previous) =>
                          toggleSelection(previous, option.value, isChecked === true),
                        )
                      }
                    />
                    <span className="font-medium">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Allergens to avoid</CardTitle>
            <CardDescription>
              Let us know which ingredients KitchenSync should flag or avoid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {sortedAllergenOptions.map((option) => {
                const checked = allergenSelections.has(option.value);
                return (
                  <label
                    key={option.value}
                    htmlFor={`allergen-${option.value}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-border bg-background/70 p-3 text-sm transition hover:border-red-500",
                      checked &&
                        "border-red-500 bg-red-500/5 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                    )}
                  >
                    <Checkbox
                      id={`allergen-${option.value}`}
                      checked={checked}
                      checkedClassName="data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:text-white"
                      focusRingClassName="focus-visible:ring-red-500"
                      indicatorClassName="text-white"
                      indicatorIcon={X}
                      onCheckedChange={(isChecked) =>
                        setAllergenSelections((previous) =>
                          toggleSelection(previous, option.value, isChecked === true),
                        )
                      }
                    />
                    <span
                      className={cn(
                        "font-medium",
                        checked && "text-red-700 dark:text-red-200",
                      )}
                    >
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        className={cn("space-y-6", stepIndex === 2 ? "block" : "hidden")}
        aria-hidden={stepIndex !== 2}
      >
        <Card className="border-emerald-900/10 shadow-sm">
          <CardHeader>
            <CardTitle>Kitchen details</CardTitle>
            <CardDescription>
              It appears in the dashboard header and on invitations you send. You can always rename it later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="kitchenName-input">Kitchen name</Label>
            <Input
              id="kitchenName-input"
              name="kitchenName-controlled"
              placeholder="The Swartz Kitchen"
              value={formKitchenName}
              onChange={(event) => setFormKitchenName(event.target.value)}
              maxLength={120}
            />
          </CardContent>
        </Card>

        <Card
          className={cn(
            "border-emerald-900/10 shadow-sm transition-colors",
            locationSummary.total === 0 &&
              "border-red-400 dark:border-red-500",
          )}
        >
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Storage locations</CardTitle>
              <CardDescription>
                Choose the areas you want to manage first. Select at least one to continue.
              </CardDescription>
            </div>
            <div
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                locationSummary.total === 0
                  ? "border-red-400 bg-red-500/10 text-red-600 dark:border-red-500 dark:bg-red-500/15 dark:text-red-200"
                  : "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
              )}
            >
              {locationSummary.total === 0
                ? "None selected"
                : `${locationSummary.total} selected`}
            </div>
          </CardHeader>
          <CardContent>
            <LocationPlanner
              defaultOptions={defaultOptions}
              initialCustomLocations={initialCustomLocations}
              onSelectionChange={handleLocationSummaryChange}
            />
          </CardContent>
        </Card>
      </div>

      <span aria-live="assertive" className="sr-only">
        {activeError ? `${activeError.title}. ${activeError.description}` : ""}
      </span>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {stepIndex === 2 ? (
          <p className="text-sm text-muted-foreground sm:mr-auto sm:text-left">
            All set? Start using KitchenSync once you&apos;ve named your kitchen and picked at least one location.
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          {stepIndex > 0 ? (
            <Button type="button" variant="ghost" onClick={handleBack}>
              Back
            </Button>
          ) : null}

          {stepIndex < totalSteps - 1 ? (
            <Button
              type="button"
              onClick={handleContinue}
              className="bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              disabled={stepIndex === 2 && locationSummary.total === 0}
            >
              Continue
            </Button>
          ) : (
            <SubmitButton label="Start using KitchenSync" disabled={submitDisabled} />
          )}
        </div>
      </div>
    </form>
  );
}
