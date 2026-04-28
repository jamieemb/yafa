import type { StatementSource } from "@/lib/categories";
import type { StatementParser } from "./types";
import { parseNatwest } from "./natwest";
import { parseAmex } from "./amex";
import { parseMonzo } from "./monzo";

export const PARSERS: Record<StatementSource, StatementParser> = {
  NATWEST: parseNatwest,
  AMEX: parseAmex,
  MONZO: parseMonzo,
};

export type { ParsedTransaction, StatementParser } from "./types";
export { normaliseDescription } from "./normalize";
export { classifyTransaction, type TransactionKind } from "./classify";
