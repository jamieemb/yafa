import { parse as parseDate, isValid } from "date-fns";

const FORMATS = [
  "yyyy-MM-dd",
  "dd/MM/yyyy",
  "dd-MM-yyyy",
  "dd MMM yyyy",
  "d MMM yyyy",
  "dd/MM/yy",
];

export function parseFlexibleDate(input: string): Date {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Empty date");

  // Try ISO first — new Date() handles "2026-04-25" cleanly.
  if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(trimmed)) {
    const iso = new Date(trimmed);
    if (isValid(iso)) return iso;
  }

  for (const fmt of FORMATS) {
    const d = parseDate(trimmed, fmt, new Date());
    if (isValid(d)) return d;
  }

  throw new Error(`Unrecognised date format: "${input}"`);
}
