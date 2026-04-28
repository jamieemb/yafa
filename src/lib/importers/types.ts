import type { StatementSource } from "@/lib/categories";

// Convention: spend (charges) are NEGATIVE, refunds/credits POSITIVE.
// All parsers normalise to this convention regardless of how the
// source statement happens to sign its amounts.
export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
}

export type StatementParser = (csvText: string) => ParsedTransaction[];

export interface ParserModule {
  source: StatementSource;
  parse: StatementParser;
}
