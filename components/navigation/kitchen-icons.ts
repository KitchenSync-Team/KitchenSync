import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Banana,
  Beef,
  Beer,
  Bone,
  Cake,
  Candy,
  CandyCane,
  Carrot,
  ChefHat,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  CupSoda,
  Donut,
  Drumstick,
  EggFried,
  Fish,
  Grape,
  Hamburger,
  IceCream,
  IceCreamBowl,
  Lollipop,
  Martini,
  Milk,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Shrimp,
  Soup,
  Sprout,
  Utensils,
  UtensilsCrossed,
  Wheat,
  Wine,
} from "lucide-react";

export const defaultKitchenIconId = "chef-hat" as const;

export const kitchenIconOptions = [
  { id: "chef-hat", label: "Chef hat", icon: ChefHat },
  { id: "utensils-crossed", label: "Utensils (crossed)", icon: UtensilsCrossed },
  { id: "utensils", label: "Utensils", icon: Utensils },
  { id: "cooking-pot", label: "Stock pot", icon: CookingPot },
  { id: "salad", label: "Salad bowl", icon: Salad },
  { id: "soup", label: "Soup", icon: Soup },
  { id: "pizza", label: "Pizza slice", icon: Pizza },
  { id: "hamburger", label: "Burger", icon: Hamburger },
  { id: "sandwich", label: "Sandwich", icon: Sandwich },
  { id: "drumstick", label: "Drumstick", icon: Drumstick },
  { id: "beef", label: "Beef cut", icon: Beef },
  { id: "bone", label: "Bone broth", icon: Bone },
  { id: "fish", label: "Fish", icon: Fish },
  { id: "shrimp", label: "Shrimp", icon: Shrimp },
  { id: "egg-fried", label: "Fried egg", icon: EggFried },
  { id: "carrot", label: "Carrot", icon: Carrot },
  { id: "sprout", label: "Sprout", icon: Sprout },
  { id: "wheat", label: "Grain", icon: Wheat },
  { id: "apple", label: "Apple", icon: Apple },
  { id: "banana", label: "Banana", icon: Banana },
  { id: "citrus", label: "Citrus", icon: Citrus },
  { id: "grape", label: "Grapes", icon: Grape },
  { id: "cherry", label: "Cherries", icon: Cherry },
  { id: "candy", label: "Candy", icon: Candy },
  { id: "candy-cane", label: "Candy cane", icon: CandyCane },
  { id: "lollipop", label: "Lollipop", icon: Lollipop },
  { id: "cookie", label: "Cookie", icon: Cookie },
  { id: "donut", label: "Donut", icon: Donut },
  { id: "cake", label: "Cake", icon: Cake },
  { id: "croissant", label: "Croissant", icon: Croissant },
  { id: "ice-cream", label: "Ice cream cone", icon: IceCream },
  { id: "ice-cream-bowl", label: "Ice cream bowl", icon: IceCreamBowl },
  { id: "popcorn", label: "Popcorn", icon: Popcorn },
  { id: "cup-soda", label: "Soda", icon: CupSoda },
  { id: "coffee", label: "Coffee", icon: Coffee },
  { id: "milk", label: "Milk carton", icon: Milk },
  { id: "beer", label: "Beer", icon: Beer },
  { id: "wine", label: "Wine", icon: Wine },
  { id: "martini", label: "Martini", icon: Martini },
] as const;

export type KitchenIconOption = (typeof kitchenIconOptions)[number];
export type KitchenIconId = KitchenIconOption["id"];

const kitchenIconMap = kitchenIconOptions.reduce<Record<KitchenIconId, LucideIcon>>((acc, option) => {
  acc[option.id] = option.icon;
  return acc;
}, {} as Record<KitchenIconId, LucideIcon>);

export function getKitchenIcon(iconKey?: string): LucideIcon {
  if (!iconKey) {
    return kitchenIconMap[defaultKitchenIconId];
  }
  return kitchenIconMap[(iconKey as KitchenIconId)] ?? kitchenIconMap[defaultKitchenIconId];
}

export function isKitchenIconId(value: unknown): value is KitchenIconId {
  return typeof value === "string" && value in kitchenIconMap;
}
