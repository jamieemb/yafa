import { parseCsv, requirePick, parseAmount, pick, hasColumn } from "./csv";
import { parseFlexibleDate } from "./dates";
import type { ParsedTransaction, StatementParser } from "./types";

const AMOUNT_ALIASES = ["amount", "value"];

// Monzo CSV export. Documented columns include:
//   Transaction ID, Date, Time, Type, Name, Emoji, Category, Amount,
//   Currency, Local amount, Local currency, Notes and #tags, Address,
//   Receipt, Description, Category split
//
// Monzo's "Amount" is signed (-X for outgoing). We preserve it as-is.
// We prefer "Name" for the description (usually the merchant name) and
// fall back to "Description" if "Name" is empty.
export const parseMonzo: StatementParser = (csvText) => {
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

    const dateStr = requirePick(row, ["date"], "date");
    const description =
      pick(row, ["name"]) ??
      requirePick(row, ["description", "merchant"], "description");

    out.push({
      date: parseFlexibleDate(dateStr),
      description: description.trim(),
      amount: parseAmount(amountStr),
    });
  }

  return out;
};
