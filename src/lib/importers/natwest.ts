import { parseCsv, requirePick, parseAmount, pick, hasColumn } from "./csv";
import { parseFlexibleDate } from "./dates";
import type { ParsedTransaction, StatementParser } from "./types";

const AMOUNT_ALIASES = ["amount", "value"];

// NatWest credit card statement export. Common header sets we accept:
//   Date, Description, Amount
//   Number, Date, Account, Amount, Subcategory, Memo
//   Date, Type, Description, Value, Balance, Account Name, Account Number
//
// Sign convention: NatWest credit card CSVs use positive numbers for
// charges and negative numbers for payments/credits. We invert the sign
// so:
//   charge (money out)         -> negative
//   payment / credit (money in) -> positive
// matching the rest of the app.
export const parseNatwest: StatementParser = (csvText) => {
  const { headers, rows } = parseCsv(csvText);

  // Validate the amount column exists once, up front — so a wrong-format
  // file still gets a clear "missing column" error rather than silently
  // importing nothing.
  if (!hasColumn(headers, AMOUNT_ALIASES)) {
    throw new Error(
      `Missing column for amount. Tried: ${AMOUNT_ALIASES.join(", ")}`,
    );
  }

  const out: ParsedTransaction[] = [];

  for (const row of rows) {
    // NatWest appends a trailing "Balance as at …" summary line whose
    // Value cell is empty (the figure lives in Balance instead). No
    // amount means it isn't a transaction — skip it rather than failing
    // the whole import.
    const amountStr = pick(row, AMOUNT_ALIASES);
    if (amountStr === undefined) continue;

    const dateStr = requirePick(row, ["date", "transaction date"], "date");
    const description = requirePick(
      row,
      ["memo", "description", "merchant", "details"],
      "description",
    );

    out.push({
      date: parseFlexibleDate(dateStr),
      description: description.trim(),
      amount: -parseAmount(amountStr),
    });
  }

  return out;
};
