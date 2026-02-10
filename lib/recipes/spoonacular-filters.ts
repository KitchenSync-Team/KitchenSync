function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function parseCsvParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => normalizeToken(entry))
    .filter(Boolean);
}

export function normalizeDietFilters(values: string[]): string[] {
  const mapped = values
    .map((value) => normalizeToken(value))
    .map((value) => {
      switch (value) {
        case "keto":
          return "ketogenic";
        case "pescatarian":
          return "pescetarian";
        case "gluten free":
          return "gluten free";
        case "low carb":
          return "low carb";
        case "low sodium":
          return "low sodium";
        default:
          return value;
      }
    })
    .filter(Boolean);
  return dedupe(mapped);
}

export function normalizeIntoleranceFilters(values: string[]): string[] {
  const mapped = values
    .map((value) => normalizeToken(value))
    .map((value) => {
      switch (value) {
        case "peanuts":
          return "peanut";
        case "tree nuts":
          return "tree nut";
        case "eggs":
          return "egg";
        default:
          return value;
      }
    })
    .filter(Boolean);
  return dedupe(mapped);
}

export function normalizeCuisineFilters(values: string[]): string[] {
  const mapped = values
    .map((value) => normalizeToken(value))
    .map((value) => {
      switch (value) {
        case "american comfort":
          return "american";
        case "bbq smokehouse":
          return "barbecue";
        case "latin american":
          return "latin american";
        case "middle eastern":
          return "middle eastern";
        default:
          return value;
      }
    })
    .filter(Boolean);
  return dedupe(mapped);
}
