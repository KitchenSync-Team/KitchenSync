export type OnboardingOption = {
  value: string;
  label: string;
};

export const SEX_OPTIONS: readonly OnboardingOption[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const DIETARY_OPTIONS: readonly OnboardingOption[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
  { value: "gluten_free", label: "Gluten-free" },
  { value: "low_carb", label: "Low carb" },
  { value: "low_sodium", label: "Low sodium" },
] as const;

export const ALLERGEN_OPTIONS: readonly OnboardingOption[] = [
  { value: "peanuts", label: "Peanuts" },
  { value: "tree_nuts", label: "Tree nuts" },
  { value: "dairy", label: "Dairy" },
  { value: "eggs", label: "Eggs" },
  { value: "shellfish", label: "Shellfish" },
  { value: "soy", label: "Soy" },
  { value: "wheat", label: "Wheat" },
  { value: "sesame", label: "Sesame" },
] as const;

export const PERSONALIZATION_DEFAULT = true;

export const LOCATION_REQUIRED_ERROR_MESSAGE =
  "You must add at least 1 location to your kitchen.";
