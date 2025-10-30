import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  MissingKitchenError,
  fetchDashboardData,
  type KitchenMember,
} from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LocationPlanner } from "@/components/onboarding/location-planner";

const sexOptions = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Another identity" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const defaultLocationOptions = [
  { value: "Pantry", description: "Shelf-stable staples", icon: "boxes" },
  { value: "Fridge", description: "Fresh ingredients and leftovers", icon: "snowflake" },
  { value: "Freezer", description: "Long-term frozen storage", icon: "ice-cream" },
] as const;

const defaultLocationOrder = defaultLocationOptions.map((option) => option.value);
const defaultLocationSet = new Set(defaultLocationOrder.map((value) => value.toLowerCase()));

type AwaitedDashboard = Awaited<ReturnType<typeof fetchDashboardData>>;

const dietaryRestrictionOptions = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten_free", label: "Gluten free" },
  { value: "dairy_free", label: "Dairy free" },
  { value: "nut_allergy", label: "Nut allergy" },
  { value: "no_restrictions", label: "No restrictions" },
] as const;

const cuisinePreferenceOptions = [
  { value: "american", label: "American" },
  { value: "mexican", label: "Mexican" },
  { value: "italian", label: "Italian" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "asian", label: "Asian" },
  { value: "comfort_food", label: "Comfort food" },
  { value: "healthy", label: "Healthy" },
] as const;

const sexOptionValues = new Set(sexOptions.map((option) => option.value));

type Step = "profile" | "preferences" | "kitchen";

function splitName(fullName?: string | null) {
  if (!fullName) return { first: undefined, last: undefined };
  const parts = fullName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { first: undefined, last: undefined };
  if (parts.length === 1) {
    return { first: parts[0], last: undefined };
  }
  return {
    first: parts[0],
    last: parts.slice(1).join(" ") || undefined,
  };
}

function parseDietaryPayload(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        return parsed as { restrictions?: string[]; cuisines?: string[] };
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return value as { restrictions?: string[]; cuisines?: string[] };
  }
  return null;
}

function formatKitchenNameFromFirstName(firstName?: string | null) {
  if (!firstName) return null;
  const trimmed = firstName.trim();
  if (!trimmed) return null;
  const possessive = trimmed.endsWith("s") || trimmed.endsWith("S") ? "'" : "'s";
  return `${trimmed}${possessive} Kitchen`;
}

async function ensureUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return { supabase, userId: user.id, email: user.email ?? undefined, user };
}

async function saveProfileBasics(formData: FormData) {
  "use server";

  const firstName = String((formData.get("firstName") ?? "").toString().trim());
  const lastName = String((formData.get("lastName") ?? "").toString().trim());
  const submittedSex = String((formData.get("sex") ?? "").toString().trim());
  const sex = sexOptionValues.has(submittedSex as (typeof sexOptions)[number]["value"])
    ? (submittedSex as (typeof sexOptions)[number]["value"])
    : "prefer_not_to_say";

  if (!firstName || !lastName) {
    throw new Error("First and last name are required");
  }

  const { supabase, userId } = await ensureUser();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      sex,
    })
    .eq("id", userId);

  if (profileError) {
    throw profileError;
  }

  await supabase
    .from("user_preferences")
    .upsert({ user_id: userId }, { onConflict: "user_id" });

  redirect("/protected/onboarding?step=preferences");
}

async function saveDietaryPreferences(formData: FormData) {
  "use server";

  const { userId } = await ensureUser();
  const admin = createServiceRoleClient();

  const restrictions = formData.getAll("dietaryRestrictions").map((value) => String(value));
  const cuisines = formData.getAll("preferredCuisines").map((value) => String(value));

  const payload = {
    restrictions,
    cuisines,
  };

  const { error: prefsError } = await admin
    .from("user_preferences")
    .upsert({ user_id: userId, dietary: payload }, { onConflict: "user_id" });

  if (prefsError) {
    throw prefsError;
  }

  redirect("/protected/onboarding?step=kitchen");
}

async function completeOnboarding(formData: FormData) {
  "use server";

  let kitchenName = String((formData.get("kitchenName") ?? "").toString().trim());
  const existingKitchenId = formData.get("kitchenId")
    ? String(formData.get("kitchenId"))
    : null;

  const { userId } = await ensureUser();
  const admin = createServiceRoleClient();

  const rawLocationPayloads = formData.getAll("locationsPayload");
  const parsedLocationPayloads = rawLocationPayloads
    .map((value) => {
      try {
        const payload = JSON.parse(String(value));
        const rawName = typeof payload?.name === "string" ? payload.name.trim() : "";
        if (!rawName) {
          return null;
        }
        const icon =
          typeof payload?.icon === "string" && payload.icon.trim().length > 0
            ? payload.icon.trim()
            : null;
        return { name: rawName, icon };
      } catch {
        return null;
      }
    })
    .filter((payload): payload is { name: string; icon: string | null } => payload !== null);

  const dedupedLocations: { name: string; icon: string | null }[] = [];
  const seenLocationNames = new Set<string>();
  for (const location of parsedLocationPayloads) {
    const normalized = location.name.toLowerCase();
    if (seenLocationNames.has(normalized)) continue;
    dedupedLocations.push(location);
    seenLocationNames.add(normalized);
  }

  const locationsToPersist =
    dedupedLocations.length > 0
      ? dedupedLocations
      : defaultLocationOptions.map((option) => ({
          name: option.value,
          icon: option.icon ?? null,
        }));

  if (!kitchenName) {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("first_name")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    kitchenName =
      formatKitchenNameFromFirstName(profile?.first_name) ??
      "My Kitchen";
  }

  let kitchenId = existingKitchenId ?? "";

  if (kitchenId) {
    const { data: updateData, error: updateError } = await admin
      .from("kitchens")
      .update({
        name: kitchenName,
        owner_id: userId,
      })
      .eq("id", kitchenId)
      .select("id")
      .single();

    if (updateError) {
      throw updateError;
    }

    kitchenId = updateData.id;
  } else {
    const { data: kitchen, error: kitchenError } = await admin
      .from("kitchens")
      .insert({
        name: kitchenName,
        created_by: userId,
        owner_id: userId,
      })
      .select("id")
      .single();

    if (kitchenError) {
      throw kitchenError;
    }

    kitchenId = kitchen.id;
  }

  if (!kitchenId) {
    throw new Error("Kitchen identifier could not be resolved during onboarding");
  }

  if (!existingKitchenId) {
    const locationRows = locationsToPersist.map((location, index) => ({
      kitchen_id: kitchenId,
      name: location.name,
      icon: location.icon,
      sort_order: index + 1,
      is_default: index === 0,
    }));

    const { error: locationError } = await admin.from("locations").insert(locationRows);
    if (locationError) {
      throw locationError;
    }
  }

  const { error: membershipError } = await admin
    .from("kitchen_members")
    .upsert(
      {
        kitchen_id: kitchenId,
        user_id: userId,
        role: "owner",
        created_by: userId,
      },
      { onConflict: "kitchen_id,user_id" },
    );

  if (membershipError) {
    throw membershipError;
  }

  const { error: prefsError } = await admin
    .from("user_preferences")
    .upsert({
      user_id: userId,
      default_kitchen_id: kitchenId,
    });

  if (prefsError) {
    throw prefsError;
  }

  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({ onboarding_complete: true })
    .eq("id", userId);

  if (profileUpdateError) {
    throw profileUpdateError;
  }

  await admin.rpc("set_default_kitchen_if_missing", {
    p_kitchen_id: kitchenId,
    p_user_id: userId,
  });

  revalidatePath("/protected");
  redirect("/protected");
}

type OnboardingSearchParams = {
  step?: string;
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<OnboardingSearchParams> | OnboardingSearchParams;
}) {
  const { supabase, userId, email, user } = await ensureUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, full_name, sex, onboarding_complete",
    )
    .eq("id", userId)
    .single();

  if (profileError) {
    throw profileError;
  }

  const { data: supabasePreferences } = await supabase
    .from("user_preferences")
    .select("dietary")
    .eq("user_id", userId)
    .maybeSingle();

  let preferencesRecord = supabasePreferences ?? null;

  if (!preferencesRecord) {
    const admin = createServiceRoleClient();
    const { data: adminPreferences } = await admin
      .from("user_preferences")
      .select("dietary")
      .eq("user_id", userId)
      .maybeSingle();
    if (adminPreferences) {
      preferencesRecord = adminPreferences;
    }
  }

  let profileRecord = profile;
  const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;

  const metadataFirst =
    typeof userMetadata.first_name === "string" ? userMetadata.first_name : undefined;
  const metadataLast =
    typeof userMetadata.last_name === "string" ? userMetadata.last_name : undefined;
  const metadataSex =
    typeof userMetadata.sex === "string" && sexOptionValues.has(userMetadata.sex as typeof sexOptions[number]["value"])
      ? (userMetadata.sex as typeof sexOptions[number]["value"])
      : undefined;
  const metadataFullName =
    typeof userMetadata.full_name === "string" ? userMetadata.full_name : undefined;

  const initialSplit = splitName(profile.full_name ?? metadataFullName);

  const profileUpdates: Record<string, string> = {};

  if (!profile.first_name && (metadataFirst || initialSplit.first)) {
    profileUpdates.first_name = (metadataFirst || initialSplit.first) as string;
  }

  if (!profile.last_name && (metadataLast || initialSplit.last)) {
    profileUpdates.last_name = (metadataLast || initialSplit.last) as string;
  }

  if (!profile.full_name) {
    const computedFullName = metadataFullName
      ?? [profileUpdates.first_name ?? profile.first_name, profileUpdates.last_name ?? profile.last_name]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(" ");
    if (computedFullName) {
      profileUpdates.full_name = computedFullName;
    }
  }

  if (!profile.sex && metadataSex) {
    profileUpdates.sex = metadataSex as string;
  }

  if (Object.keys(profileUpdates).length > 0) {
    const admin = createServiceRoleClient();
    await admin.from("profiles").update(profileUpdates).eq("id", userId);
    profileRecord = { ...profileRecord, ...profileUpdates };
  }

  const splitFromFull = splitName(profileRecord.full_name ?? metadataFullName);

  if (profile.onboarding_complete) {
    redirect("/protected");
  }

  let dashboard: AwaitedDashboard | null = null;

  try {
    dashboard = await fetchDashboardData(supabase, userId);
  } catch (error) {
    if (!(error instanceof MissingKitchenError)) {
      throw error;
    }
  }

  const existingKitchenId = dashboard?.kitchen?.id ?? null;
  const fallbackFirstName = profileRecord.first_name ?? metadataFirst ?? splitFromFull.first ?? undefined;
  const nameBasedDefault = formatKitchenNameFromFirstName(fallbackFirstName);
  const defaultName =
    dashboard?.kitchen?.name ??
    nameBasedDefault ??
    inferDefaultName(email) ??
    "My Kitchen";
  const memberPreview = dashboard?.kitchen?.members ?? [];
  const existingLocations = dashboard?.kitchen?.locations ?? [];

  const defaultLocationSelection = new Set(
    existingKitchenId
      ? existingLocations.map((location) => (location.name ?? "").toLowerCase())
      : defaultLocationOrder.map((value) => value.toLowerCase()),
  );

  const defaultLocationConfig = defaultLocationOptions.map((option) => ({
    value: option.value,
    description: option.description,
    icon: option.icon,
    selected: defaultLocationSelection.has(option.value.toLowerCase()),
  }));

  const initialCustomLocations = existingLocations
    .filter((location) => {
      const name = location.name ?? "";
      return name && !defaultLocationSet.has(name.toLowerCase());
    })
    .map((location) => ({
      id: location.id ?? `${location.name}-${Math.random().toString(36).slice(2)}`,
      name: location.name ?? "",
      icon: location.icon ?? "chef-hat",
    }));

  const dietaryPayload = parseDietaryPayload(preferencesRecord?.dietary ?? null);

  const savedRestrictions: string[] = Array.isArray(dietaryPayload?.restrictions)
    ? dietaryPayload?.restrictions ?? []
    : [];
  const savedCuisines: string[] = Array.isArray(dietaryPayload?.cuisines)
    ? dietaryPayload?.cuisines ?? []
    : [];

  const hasName = Boolean(profileRecord.first_name?.trim() && profileRecord.last_name?.trim());
  const hasPreferences = Boolean(preferencesRecord);

  const isPromiseLike =
    searchParams &&
    typeof searchParams === "object" &&
    "then" in searchParams &&
    typeof (searchParams as Promise<OnboardingSearchParams>).then === "function";

  const resolvedSearchParams = isPromiseLike
    ? await (searchParams as Promise<OnboardingSearchParams>)
    : (searchParams as OnboardingSearchParams | undefined);

  const requestedStep = resolvedSearchParams?.step?.toLowerCase() ?? null;
  const allowedSteps: Step[] = ["profile", "preferences", "kitchen"];

  let currentStep: Step = "profile";

  if (requestedStep && allowedSteps.includes(requestedStep as Step)) {
    currentStep = requestedStep as Step;
  }

  if (!hasName) {
    currentStep = "profile";
  } else if (currentStep === "kitchen" && !hasPreferences) {
    currentStep = "preferences";
  }

  const steps: { id: Step; title: string; description: string }[] = [
    {
      id: "profile",
      title: "Tell us about you",
      description: "We personalize KitchenSync with your name.",
    },
    {
      id: "preferences",
      title: "Dial in your preferences",
      description: "Share dietary needs and cuisines you love.",
    },
    {
      id: "kitchen",
      title: "Set up your kitchen",
      description: "Name your kitchen and invite collaborators.",
    },
  ];

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-8 pb-16">
      <header className="space-y-3 text-center">
        <Badge variant="secondary" className="mx-auto uppercase">
          KitchenSync onboarding
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {existingKitchenId ? "Fine-tune your kitchen" : "Let’s create your kitchen"}
        </h1>
        <p className="text-sm text-muted-foreground">
          We keep your kitchen data private and shared only with the right collaborators.
        </p>
      </header>

      <StepIndicator steps={steps} currentStep={currentStep} />

      {currentStep === "profile" ? (
        <Card className="border-none bg-background/90 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Tell us about you</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveProfileBasics} className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 text-left">
                  <label htmlFor="firstName" className="text-sm font-medium">
                    First name
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    required
                    defaultValue={
                      profileRecord.first_name ??
                      metadataFirst ??
                      splitFromFull.first ??
                      ""
                    }
                    placeholder="Jordan"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label htmlFor="lastName" className="text-sm font-medium">
                    Last name
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    required
                    defaultValue={
                      profileRecord.last_name ??
                      metadataLast ??
                      splitFromFull.last ??
                      ""
                    }
                    placeholder="Martinez"
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label htmlFor="sex" className="text-sm font-medium">
                  Sex / gender
                </label>
                <select
                  id="sex"
                  name="sex"
                  defaultValue={
                    profileRecord.sex ?? metadataSex ?? "prefer_not_to_say"
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {sexOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Optional, but it helps when tailoring nutrition insights down the road.
                </p>
              </div>
              <div className="flex justify-end">
                <Button type="submit">Save and continue</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {currentStep === "preferences" ? (
        <Card className="border-none bg-background/90 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Dial in your food preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={saveDietaryPreferences} className="space-y-6">
              <section className="space-y-3 text-left">
                <div>
                  <h3 className="text-sm font-medium">Dietary considerations</h3>
                  <p className="text-xs text-muted-foreground">
                    Choose all that apply. We&apos;ll use this to filter recipes and reminders later.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {dietaryRestrictionOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background/70 p-3 text-sm hover:border-emerald-500"
                      htmlFor={`dietary-${option.value}`}
                    >
                      <Checkbox
                        id={`dietary-${option.value}`}
                        name="dietaryRestrictions"
                        value={option.value}
                        defaultChecked={savedRestrictions.includes(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-3 text-left">
                <div>
                  <h3 className="text-sm font-medium">Favorite cuisines</h3>
                  <p className="text-xs text-muted-foreground">
                    Pick a few cuisines you reach for regularly. Helps power future recipe suggestions.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {cuisinePreferenceOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background/70 p-3 text-sm hover:border-emerald-500"
                      htmlFor={`cuisine-${option.value}`}
                    >
                      <Checkbox
                        id={`cuisine-${option.value}`}
                        name="preferredCuisines"
                        value={option.value}
                        defaultChecked={savedCuisines.includes(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </section>

              <div className="flex items-center justify-between">
                <Button asChild variant="ghost" type="button">
                  <Link href="/protected/onboarding?step=profile">Back</Link>
                </Button>
                <Button type="submit">Save preferences</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {currentStep === "kitchen" ? (
        <>
          <Card className="border-none bg-background/90 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Kitchen details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form action={completeOnboarding} className="flex flex-col gap-6">
                {existingKitchenId ? (
                  <input type="hidden" name="kitchenId" value={existingKitchenId} />
                ) : null}
                <div className="space-y-2 text-left">
                  <label htmlFor="kitchenName" className="text-sm font-medium">
                    Kitchen name
                  </label>
                  <Input
                    id="kitchenName"
                    name="kitchenName"
                    required
                    defaultValue={defaultName}
                    placeholder="e.g. Swartz Family Pantry"
                  />
                  <p className="text-xs text-muted-foreground">
                    {existingKitchenId
                      ? "We pre-filled the name you already have. Update it or keep it—your teammates will see this label."
                      : "You can invite teammates or family members after setup."}
                  </p>
                </div>

                <LocationPlanner
                  defaultOptions={defaultLocationConfig}
                  initialCustomLocations={initialCustomLocations}
                />

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    {existingKitchenId
                      ? "We’ll update your details and unlock the KitchenSync dashboard."
                      : "This will set you as the kitchen owner and enable inventory tracking."}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" type="button">
                      <Link href="/protected/onboarding?step=preferences">Back</Link>
                    </Button>
                    <Button type="submit" className="px-6">
                      {existingKitchenId ? "Continue to KitchenSync" : "Create kitchen"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {existingKitchenId && memberPreview ? (
            <Card className="border border-emerald-900/10 bg-background/80">
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Current kitchen snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium">
                    {memberPreview.length} member{memberPreview.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-2">
                  {memberPreview.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      You&apos;re the first one here. Invite others once onboarding is complete.
                    </p>
                  ) : (
                memberPreview.slice(0, 3).map((member: KitchenMember) => (
                      <div key={member.userId} className="flex items-center justify-between text-xs">
                        <span className="font-medium">
                          {member.name ?? member.email ?? "Kitchen member"}
                        </span>
                        <span className="uppercase text-muted-foreground">{member.role}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: { id: Step; title: string; description: string }[];
  currentStep: Step;
}) {
  return (
    <ol className="grid gap-3 rounded-2xl border border-emerald-900/10 bg-background/70 p-4 text-sm shadow-sm sm:grid-cols-3">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isComplete = steps.findIndex((s) => s.id === currentStep) > index;

        return (
          <li
            key={step.id}
            className="flex flex-col gap-1 rounded-xl border border-transparent p-3 transition"
            data-active={isActive}
            data-complete={isComplete}
          >
            <span
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                  isComplete
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : isActive
                      ? "border-emerald-600 text-emerald-600"
                      : "border-border text-muted-foreground"
                }`}
              >
                {index + 1}
              </span>
              {step.title}
            </span>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </li>
        );
      })}
    </ol>
  );
}

function inferDefaultName(email?: string) {
  if (!email) return "My Kitchen";
  const local = email.split("@")[0] ?? "";
  if (!local) return "My Kitchen";
  const cleaned = local.replace(/[._-]+/g, " ");
  const words = cleaned
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1));
  if (words.length === 0) return "My Kitchen";
  return `${words.join(" ")} Kitchen`;
}
