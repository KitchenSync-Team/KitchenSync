import { resolveKitchen } from "@/app/protected/_lib/resolve-kitchen"
import {
  CuisinePreferencesCard,
  DietaryPreferencesCard,
  MeasurementUnitsCard,
  ProfileCard,
} from "@/components/profile"
import {
  ALLERGEN_OPTIONS,
  CUISINE_PREFERENCE_OPTIONS,
  DIETARY_OPTIONS,
} from "@/app/protected/onboarding/constants"
export default async function ProfilePage() {
  const kitchenSnapshot = await resolveKitchen()
  const { user, preferences } = kitchenSnapshot

  const dietaryOptionMap = Object.fromEntries(
    DIETARY_OPTIONS.map((option) => [option.value, option.label]),
  )
  const allergenOptionMap = Object.fromEntries(
    ALLERGEN_OPTIONS.map((option) => [option.value, option.label]),
  )
  const cuisineOptionMap = Object.fromEntries(
    CUISINE_PREFERENCE_OPTIONS.map((option) => [option.value, option.label]),
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">User &amp; preferences</h1>
        <p className="text-sm text-muted-foreground">
          Review everything tied to your KitchenSync identity. Each setting opens in a focused dialog so you can
          comfortably adjust details without leaving this view.
        </p>
      </div>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Account settings</h2>
          <p className="text-sm text-muted-foreground">
            Core account information and communication choices that affect how KitchenSync reaches you.
          </p>
        </div>
        <ProfileCard
          fullName={user.fullName}
          email={user.email}
          avatarUrl={user.avatarUrl}
          onboardingComplete={user.onboardingComplete}
          firstName={user.firstName}
          lastName={user.lastName}
          sex={user.sex}
          emailOptIn={preferences.emailOptIn}
          personalizationOptIn={preferences.personalizationOptIn}
        />
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">User preferences</h2>
          <p className="text-sm text-muted-foreground">
            Set dietary boundaries, favourite cuisines, and measurement units for tailored experiences.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="grid gap-6">
            <DietaryPreferencesCard
              dietaryPreferences={preferences.dietaryPreferences}
              allergens={preferences.allergens}
              dietaryOptions={dietaryOptionMap}
              allergenOptions={allergenOptionMap}
            />
            <MeasurementUnitsCard unitsSystem={preferences.unitsSystem as "imperial" | "metric"} />
          </div>
          <CuisinePreferencesCard
            likes={preferences.cuisineLikes}
            dislikes={preferences.cuisineDislikes}
            cuisineOptions={cuisineOptionMap}
          />
        </div>
      </section>
    </div>
  )
}
