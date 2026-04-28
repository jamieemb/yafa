import { parseCsv, requirePick, parseAmount } from "./csv";
import { parseFlexibleDate } from "./dates";
import type { ParsedTransaction, StatementParser } from "./types";

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
  const { rows } = parseCsv(csvText);
  const out: ParsedTransaction[] = [];

  for (const row of rows) {
    const dateStr = requirePick(row, ["date", "transaction date"], "date");
    const description = requirePick(
      row,
      ["memo", "description", "merchant", "details"],
      "description",
    );
    const amountStr = requirePick(row, ["amount", "value"], "amount");

    out.push({
      date: parseFlexibleDate(dateStr),
      description: description.trim(),
      amount: -parseAmount(amountStr),
    });
  }

  return out;
};
