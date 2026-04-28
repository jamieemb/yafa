import { parseCsv, requirePick, parseAmount, pick } from "./csv";
import { parseFlexibleDate } from "./dates";
import type { ParsedTransaction, StatementParser } from "./types";

// American Express UK statement export. Common columns we look for:
//   Date, Description, Amount
//   Date, Description, Card Member, Account #, Amount
//   Date, Description, Amount, Extended Details, Appears On Your Statement As, ...
//
// Amex shows charges as POSITIVE amounts and credits/payments as
// negative. We flip the sign so spend is negative app-wide.
export const parseAmex: StatementParser = (csvText) => {
  const { rows } = parseCsv(csvText);
  const out: ParsedTransaction[] = [];

  for (const row of rows) {
    const dateStr = requirePick(row, ["date", "transaction date"], "date");
    const description =
      pick(row, ["appears on your statement as"]) ??
      requirePick(row, ["description", "merchant", "details"], "description");
    const amountStr = requirePick(row, ["amount", "value"], "amount");

    out.push({
      date: parseFlexibleDate(dateStr),
      description: description.trim(),
      amount: -parseAmount(amountStr),
    });
  }

  return out;
};
