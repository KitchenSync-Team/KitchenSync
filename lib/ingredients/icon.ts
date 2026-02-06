import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Banana,
  Beef,
  Beer,
  Cake,
  Candy,
  Carrot,
  Cherry,
  Coffee,
  Cookie,
  CupSoda,
  Donut,
  Drumstick,
  Droplet,
  Egg,
  Fish,
  Flame,
  Grape,
  IceCream,
  LeafyGreen,
  Milk,
  Nut,
  Package,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Shrimp,
  Snowflake,
  Soup,
  Utensils,
  Wheat,
  Wine,
} from "lucide-react";

type IconMatch = { keywords: string[]; Icon: LucideIcon };

const NAME_ICON_MATCHES: IconMatch[] = [
  {
    Icon: Milk,
    keywords: [
      "milk",
      "dairy",
      "yogurt",
      "yoghurt",
      "kefir",
      "cream",
      "creamer",
      "butter",
      "ghee",
      "cheese",
      "cheddar",
      "mozzarella",
      "parmesan",
      "ricotta",
      "cottage",
      "sour cream",
      "whipped",
      "half and half",
      "buttermilk",
      "whey",
      "casein",
    ],
  },
  {
    Icon: Egg,
    keywords: ["egg", "eggs", "yolk", "white", "omelet", "omelette", "frittata", "quiche"],
  },
  {
    Icon: Beef,
    keywords: [
      "beef",
      "steak",
      "brisket",
      "burger",
      "hamburger",
      "meatball",
      "sirloin",
      "ribeye",
      "filet",
      "tenderloin",
      "roast",
      "corned beef",
      "pastrami",
    ],
  },
  {
    Icon: Drumstick,
    keywords: ["chicken", "poultry", "turkey", "duck", "drumstick", "wing", "thigh"],
  },
  {
    Icon: Fish,
    keywords: [
      "fish",
      "salmon",
      "tuna",
      "cod",
      "trout",
      "tilapia",
      "sardine",
      "anchovy",
      "halibut",
      "mackerel",
    ],
  },
  {
    Icon: Shrimp,
    keywords: ["shrimp", "prawn", "lobster", "crab", "scallop", "mussel", "clam", "oyster", "shellfish"],
  },
  {
    Icon: Carrot,
    keywords: [
      "carrot",
      "potato",
      "sweet potato",
      "yam",
      "beet",
      "turnip",
      "radish",
      "parsnip",
      "rutabaga",
      "ginger",
      "garlic",
      "onion",
      "shallot",
    ],
  },
  {
    Icon: LeafyGreen,
    keywords: [
      "lettuce",
      "spinach",
      "kale",
      "arugula",
      "cabbage",
      "broccoli",
      "cauliflower",
      "celery",
      "cucumber",
      "zucchini",
      "squash",
      "pepper",
      "bell pepper",
      "tomato",
      "basil",
      "parsley",
      "cilantro",
      "herb",
      "green onion",
      "scallion",
    ],
  },
  {
    Icon: Apple,
    keywords: ["apple", "pear", "peach", "plum", "apricot", "nectarine"],
  },
  {
    Icon: Banana,
    keywords: ["banana", "plantain"],
  },
  {
    Icon: Cherry,
    keywords: ["strawberry", "blueberry", "raspberry", "blackberry", "cranberry", "cherry", "berry"],
  },
  {
    Icon: Grape,
    keywords: ["grape", "raisin"],
  },
  {
    Icon: Wheat,
    keywords: [
      "bread",
      "loaf",
      "bagel",
      "bun",
      "roll",
      "pasta",
      "noodle",
      "spaghetti",
      "macaroni",
      "rice",
      "grain",
      "wheat",
      "flour",
      "cereal",
      "oat",
      "barley",
      "quinoa",
      "couscous",
      "tortilla",
      "cracker",
      "breadcrumb",
      "pita",
      "pancake",
      "waffle",
    ],
  },
  {
    Icon: Nut,
    keywords: [
      "nut",
      "peanut",
      "almond",
      "walnut",
      "cashew",
      "pistachio",
      "pecan",
      "hazelnut",
      "sunflower",
      "pumpkin seed",
      "sesame",
    ],
  },
  {
    Icon: Coffee,
    keywords: ["coffee", "espresso", "latte", "cappuccino", "tea", "chai", "matcha"],
  },
  {
    Icon: CupSoda,
    keywords: ["soda", "pop", "cola", "juice", "water", "seltzer", "sparkling", "drink", "beverage"],
  },
  {
    Icon: Beer,
    keywords: ["beer", "ale", "lager", "stout"],
  },
  {
    Icon: Wine,
    keywords: ["wine", "champagne", "prosecco"],
  },
  {
    Icon: Pizza,
    keywords: ["pizza", "flatbread"],
  },
  {
    Icon: Sandwich,
    keywords: ["sandwich", "sub", "hoagie", "wrap", "taco", "burrito", "quesadilla"],
  },
  {
    Icon: Salad,
    keywords: ["salad", "slaw"],
  },
  {
    Icon: Soup,
    keywords: ["soup", "broth", "stock", "stew", "chili", "ramen"],
  },
  {
    Icon: Cookie,
    keywords: ["cookie", "biscuit", "cracker", "pretzel"],
  },
  {
    Icon: Cake,
    keywords: ["cake", "cupcake", "brownie", "muffin", "pastry", "pie"],
  },
  {
    Icon: Donut,
    keywords: ["donut", "doughnut"],
  },
  {
    Icon: IceCream,
    keywords: ["ice cream", "gelato", "sorbet", "frozen yogurt", "popsicle"],
  },
  {
    Icon: Popcorn,
    keywords: ["popcorn", "chips", "snack"],
  },
  {
    Icon: Candy,
    keywords: ["candy", "chocolate", "caramel", "toffee", "sugar", "sweet"],
  },
];

const AISLE_ICON_MATCHES: IconMatch[] = [
  { Icon: Milk, keywords: ["milk", "eggs", "dairy"] },
  { Icon: LeafyGreen, keywords: ["produce"] },
  { Icon: Soup, keywords: ["canned", "jarred"] },
  { Icon: Wheat, keywords: ["pasta", "rice", "grain", "baking", "bread"] },
  { Icon: Fish, keywords: ["seafood"] },
  { Icon: Beef, keywords: ["meat"] },
  { Icon: Nut, keywords: ["snack"] },
  { Icon: CupSoda, keywords: ["beverages"] },
  { Icon: Droplet, keywords: ["oil", "vinegar", "dressing", "condiment"] },
  { Icon: Flame, keywords: ["spices", "seasoning"] },
  { Icon: Snowflake, keywords: ["frozen"] },
  { Icon: Utensils, keywords: ["ethnic"] },
];

function matchIcon(value: string | null, matches: IconMatch[]) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  for (const entry of matches) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry.Icon;
    }
  }
  return null;
}

export function getIngredientFallbackIcon({
  name,
  aisle,
}: {
  name?: string | null;
  aisle?: string | null;
}) {
  return matchIcon(name ?? null, NAME_ICON_MATCHES) ?? matchIcon(aisle ?? null, AISLE_ICON_MATCHES) ?? Package;
}
