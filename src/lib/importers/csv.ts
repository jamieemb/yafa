import Papa from "papaparse";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

// Returns rows keyed by header (lowercased + trimmed) so per-provider
// column lookup is easy and tolerant of stray whitespace/case in headers.
export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (result.errors.length > 0) {
    const first = result.errors[0];
    throw new Error(`CSV parse error: ${first.message} (row ${first.row ?? "?"})`);
  }

  return {
    headers: result.meta.fields ?? [],
    rows: result.data ?? [],
  };
}

export function pick(
  row: Record<string, string>,
  aliases: string[],
): string | undefined {
  for (const alias of aliases) {
    const v = row[alias.toLowerCase()];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

export function requirePick(
  row: Record<string, string>,
  aliases: string[],
  fieldName: string,
): string {
  const value = pick(row, aliases);
  if (value === undefined) {
    throw new Error(
      `Missing column for ${fieldName}. Tried: ${aliases.join(", ")}`,
    );
  }
  return value;
}

export function parseAmount(raw: string): number {
  // Strip currency symbols, thousand separators, spaces. Keep digits, dot,
  // minus, and parentheses (some banks render negatives as "(1.23)").
  const cleaned = raw.trim().replace(/[£$€,\s]/g, "");
  const negativeViaParens = /^\(.*\)$/.test(cleaned);
  const numeric = cleaned.replace(/[()]/g, "");
  const n = Number(numeric);
  if (!Number.isFinite(n)) {
    throw new Error(`Could not parse amount: "${raw}"`);
  }
  return negativeViaParens ? -n : n;
}
