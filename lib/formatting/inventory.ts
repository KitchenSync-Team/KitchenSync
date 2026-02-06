import { format, isValid, parseISO } from "date-fns";

const hasUppercase = (value: string) => /[A-Z]/.test(value);

export function formatInventoryItemName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Item";
  if (hasUppercase(trimmed)) return trimmed;
  return trimmed.replace(/\b([a-z0-9])([a-z0-9']*)/g, (_match, first, rest) => {
    return `${String(first).toUpperCase()}${rest}`;
  });
}

export function formatInventoryExpiry(value: string | null) {
  if (!value) return "No expiration";
  const parsed = parseISO(value);
  if (!isValid(parsed)) return value;
  return format(parsed, "MM/dd/yyyy");
}

const NO_PLURAL_UNITS = new Set([
  "oz",
  "fl oz",
  "lb",
  "lbs",
  "tsp",
  "tbsp",
  "tbs",
  "qt",
  "pt",
  "gal",
  "each",
]);

export function formatQuantityWithUnit(quantity: number, unit: string | null) {
  if (!unit) return String(quantity);
  const trimmed = unit.trim();
  if (!trimmed || trimmed.toLowerCase() === "no unit") return String(quantity);
  const cleaned = trimmed.replace(/^\d+(\.\d+)?\s*/, "").trim();
  const normalized = cleaned.toLowerCase();
  if (NO_PLURAL_UNITS.has(normalized)) return `${quantity} ${cleaned}`;
  const isSingular = Math.abs(quantity) === 1;
  if (isSingular) return `${quantity} ${cleaned}`;
  if (cleaned.endsWith("s")) return `${quantity} ${cleaned}`;
  return `${quantity} ${cleaned}s`;
}

export function formatUnitLabel(quantity: number, unit: string | null) {
  if (!unit) return "";
  const trimmed = unit.trim();
  if (!trimmed || trimmed.toLowerCase() === "no unit") return "";
  const cleaned = trimmed.replace(/^\d+(\.\d+)?\s*/, "").trim();
  const normalized = cleaned.toLowerCase();
  if (NO_PLURAL_UNITS.has(normalized)) return cleaned;
  const isSingular = Math.abs(quantity) === 1;
  if (isSingular) return cleaned;
  if (cleaned.endsWith("s")) return cleaned;
  return `${cleaned}s`;
}
