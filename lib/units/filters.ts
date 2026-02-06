type UnitOption = { id: string; name: string; abbreviation?: string | null; type: string };

const METRIC_TOKENS = new Set([
  "g",
  "gram",
  "grams",
  "kg",
  "kilogram",
  "kilograms",
  "ml",
  "milliliter",
  "milliliters",
  "l",
  "liter",
  "liters",
]);

const UNIT_ALIASES: Record<string, string[]> = {
  teaspoon: ["tsp", "tsp.", "teaspoons"],
  tablespoon: ["tbsp", "tbsp.", "tbs", "tbs.", "tablespoons"],
  cup: ["cups", "c"],
  pint: ["pt", "pts", "pints"],
  quart: ["qt", "qts", "quarts"],
  gallon: ["gal", "gals", "gallons"],
  "fluid ounce": ["fl oz", "fl. oz", "floz", "fluid ounces"],
  ounce: ["oz", "ounces"],
  pound: ["lb", "lbs", "pounds"],
  piece: ["pieces"],
  slice: ["slices"],
  serving: ["servings"],
};

function normalizeUnitToken(value: string) {
  return value
    .toLowerCase()
    .replace(/\./g, "")
    .trim();
}

function singularize(value: string) {
  if (value.endsWith("s") && value.length > 3) return value.slice(0, -1);
  return value;
}

function buildUnitTokens(unit: UnitOption) {
  const tokens = new Set<string>();
  const name = normalizeUnitToken(unit.name);
  tokens.add(name);
  tokens.add(singularize(name));
  const aliasSource = singularize(name);
  const aliases = UNIT_ALIASES[aliasSource];
  if (aliases) {
    for (const alias of aliases) {
      const normalized = singularize(normalizeUnitToken(alias));
      tokens.add(normalized);
    }
  }
  if (unit.abbreviation) {
    const abbr = normalizeUnitToken(unit.abbreviation);
    tokens.add(abbr);
    tokens.add(singularize(abbr));
    const abbrAliases = UNIT_ALIASES[singularize(abbr)];
    if (abbrAliases) {
      for (const alias of abbrAliases) {
        const normalized = singularize(normalizeUnitToken(alias));
        tokens.add(normalized);
      }
    }
  }
  return tokens;
}

function expandPossibleUnits(possibleUnits: string[]) {
  const possible = new Set(
    possibleUnits.map((unit) => singularize(normalizeUnitToken(unit))),
  );

  for (const token of Array.from(possible)) {
    const aliases = UNIT_ALIASES[token];
    if (aliases) {
      for (const alias of aliases) {
        possible.add(singularize(normalizeUnitToken(alias)));
      }
    }
  }

  if (possible.has("quart") || possible.has("qt") || possible.has("qts")) {
    for (const alias of UNIT_ALIASES.gallon) {
      possible.add(singularize(normalizeUnitToken(alias)));
    }
    possible.add("gallon");
  }

  return possible;
}

export function filterImperialUnits(units: UnitOption[]) {
  return units.filter((unit) => {
    if (unit.type === "time") return false;
    const tokens = buildUnitTokens(unit);
    for (const token of tokens) {
      if (METRIC_TOKENS.has(token)) return false;
    }
    return true;
  });
}

export function filterUnitsByPossible(
  units: UnitOption[],
  possibleUnits?: string[] | null,
) {
  const imperialUnits = filterImperialUnits(units);
  if (!possibleUnits || possibleUnits.length === 0) return imperialUnits;

  const possible = expandPossibleUnits(possibleUnits);

  const matches = imperialUnits.filter((unit) => {
    const tokens = buildUnitTokens(unit);
    for (const token of tokens) {
      if (possible.has(token)) return true;
    }
    return false;
  });

  const universalUnits = imperialUnits.filter(
    (unit) => unit.name.toLowerCase() === "each" || unit.name.toLowerCase() === "package",
  );
  const merged = new Map<string, UnitOption>();
  for (const unit of [...universalUnits, ...matches]) {
    merged.set(unit.id, unit);
  }
  return Array.from(merged.values());
}
