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

export const CUISINE_PREFERENCE_OPTIONS: readonly OnboardingOption[] = [
  { value: "american_comfort", label: "American Comfort" },
  { value: "bbq_smokehouse", label: "BBQ & Smokehouse" },
  { value: "caribbean", label: "Caribbean" },
  { value: "chinese", label: "Chinese" },
  { value: "french", label: "French" },
  { value: "greek", label: "Greek" },
  { value: "indian", label: "Indian" },
  { value: "italian", label: "Italian" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "latin_american", label: "Latin American" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "mexican", label: "Mexican" },
  { value: "middle_eastern", label: "Middle Eastern" },
  { value: "thai", label: "Thai" },
  { value: "vietnamese", label: "Vietnamese" },
] as const;

export const PERSONALIZATION_DEFAULT = true;

export const LOCATION_REQUIRED_ERROR_MESSAGE =
  "You must add at least 1 location to your kitchen.";
