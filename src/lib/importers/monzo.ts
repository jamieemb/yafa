import { parseCsv, requirePick, parseAmount, pick } from "./csv";
import { parseFlexibleDate } from "./dates";
import type { ParsedTransaction, StatementParser } from "./types";

// Monzo CSV export. Documented columns include:
//   Transaction ID, Date, Time, Type, Name, Emoji, Category, Amount,
//   Currency, Local amount, Local currency, Notes and #tags, Address,
//   Receipt, Description, Category split
//
// Monzo's "Amount" is signed (-X for outgoing). We preserve it as-is.
// We prefer "Name" for the description (usually the merchant name) and
// fall back to "Description" if "Name" is empty.
export const parseMonzo: StatementParser = (csvText) => {
  const { rows } = parseCsv(csvText);
  const out: ParsedTransaction[] = [];

  for (const row of rows) {
    const dateStr = requirePick(row, ["date"], "date");
    const description =
      pick(row, ["name"]) ??
      requirePick(row, ["description", "merchant"], "description");
    const amountStr = requirePick(row, ["amount", "value"], "amount");

    out.push({
      date: parseFlexibleDate(dateStr),
      description: description.trim(),
      amount: parseAmount(amountStr),
    });
  }

  return out;
};
