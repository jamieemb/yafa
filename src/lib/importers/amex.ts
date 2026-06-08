import { parseCsv, requirePick, parseAmount, pick, hasColumn } from "./csv";
import { parseFlexibleDate } from "./dates";
import type { ParsedTransaction, StatementParser } from "./types";

const AMOUNT_ALIASES = ["amount", "value"];

// American Express UK statement export. Common columns we look for:
//   Date, Description, Amount
//   Date, Description, Card Member, Account #, Amount
//   Date, Description, Amount, Extended Details, Appears On Your Statement As, ...
//
// Amex shows charges as POSITIVE amounts and credits/payments as
// negative. We flip the sign so spend is negative app-wide.
export const parseAmex: StatementParser = (csvText) => {
  const { headers, rows } = parseCsv(csvText);

  if (!hasColumn(headers, AMOUNT_ALIASES)) {
    throw new Error(
      `Missing column for amount. Tried: ${AMOUNT_ALIASES.join(", ")}`,
    );
  }

  const out: ParsedTransaction[] = [];

  for (const row of rows) {
    // Skip summary / non-transaction rows that carry no amount.
    const amountStr = pick(row, AMOUNT_ALIASES);
    if (amountStr === undefined) continue;

    const dateStr = requirePick(row, ["date", "transaction date"], "date");
    const description =
      pick(row, ["appears on your statement as"]) ??
      requirePick(row, ["description", "merchant", "details"], "description");

    out.push({
      date: parseFlexibleDate(dateStr),
      description: description.trim(),
      amount: -parseAmount(amountStr),
    });
  }

  return out;
};
