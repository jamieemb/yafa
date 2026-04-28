// Classify a transaction at import time.
//
// SPEND   — money out to a merchant (negative amount). The default.
// PAYMENT — money in to clear the card balance (positive amount,
//           description matches a payment pattern). Hidden from default
//           views; not useful for spend tracking.
// REFUND  — money in from a merchant offsetting a previous purchase
//           (positive amount, description doesn't look like a card
//           payment). Counts as negative spend on its category.
export type TransactionKind = "SPEND" | "PAYMENT" | "REFUND";

const PAYMENT_PATTERNS: RegExp[] = [
  /\bPAYMENT RECEIVED\b/i,
  /\bPAYMENT THANK YOU\b/i,
  /\bDIRECT DEBIT PAYMENT\b/i,
  /\bAUTOPAY\b/i,
  /\bAUTOMATIC PAYMENT\b/i,
  /\bCARD PAYMENT\b/i,
  /^PAYMENT\b/i,
  /\bREPAID\b/i, // Monzo Flex
];

export function classifyTransaction(
  description: string,
  amount: number,
): TransactionKind {
  if (amount <= 0) return "SPEND";
  for (const re of PAYMENT_PATTERNS) {
    if (re.test(description)) return "PAYMENT";
  }
  return "REFUND";
}
