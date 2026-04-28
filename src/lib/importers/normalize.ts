// Strip a transaction description down to its merchant-y core so we
// can do reliable substring matching against CategoryRule patterns.
//
// "TESCO STORES 1234     LONDON 23/04" -> "TESCO STORES 1234 LONDON 23 04"
// "amzn mktp uk*A1B2C3"                -> "AMZN MKTP UK A1B2C3"
//
// Kept deliberately permissive — we don't want to throw away merchant
// identity, just punctuation and case differences.
export function normaliseDescription(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
