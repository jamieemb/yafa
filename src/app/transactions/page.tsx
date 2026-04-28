import { format } from "date-fns";
import { prisma } from "@/lib/db";
import {
  STATEMENT_SOURCE_LABELS,
  STATEMENT_SOURCES,
  SPEND_CATEGORIES,
  type StatementSource,
  type SpendCategory,
} from "@/lib/categories";
import { formatGBP } from "@/lib/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Kpi } from "@/components/kpi";
import { TransactionFilters } from "./_components/filters";
import { CategoryCell } from "./_components/category-cell";
import { CycleSheet } from "./_components/cycle-sheet";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    source?: string;
    category?: string;
    review?: string;
    payments?: string;
    settled?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const where: Parameters<typeof prisma.transaction.findMany>[0] = {
    where: {},
  };

  if (sp.source && (STATEMENT_SOURCES as readonly string[]).includes(sp.source)) {
    where.where!.source = sp.source as StatementSource;
  }

  if (sp.category === "__uncategorised__") {
    where.where!.spendCategory = null;
  } else if (
    sp.category &&
    (SPEND_CATEGORIES as readonly string[]).includes(sp.category)
  ) {
    where.where!.spendCategory = sp.category as SpendCategory;
  }

  if (sp.review === "1") {
    where.where!.needsReview = true;
  }

  // Hide PAYMENT and REFUND rows by default — neither is "spend"
  // you're going to act on. They're still in the database for the
  // cycle algorithm and category-offset maths. Opt in via the toggle.
  if (sp.payments !== "1") {
    where.where!.kind = "SPEND";
  }

  // Hide already-settled transactions by default — keeps the list
  // focused on what still needs reconciling. `settled=1` shows them.
  if (sp.settled !== "1") {
    where.where!.payCycleId = null;
  }

  const transactions = await prisma.transaction.findMany({
    ...where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 250,
  });

  const totalSpend = transactions
    .filter((t) => t.amount < 0)
    .reduce((acc, t) => acc + t.amount, 0);
  const totalCredit = transactions
    .filter((t) => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="label-eyebrow">Books</p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Transactions
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Most recent 250 matching this filter.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="grid grid-cols-3 gap-3 min-w-[420px]">
            <Kpi label="Spend" value={formatGBP(totalSpend)} tone="negative" />
            <Kpi
              label="Credits"
              value={formatGBP(totalCredit)}
              tone="positive"
            />
            <Kpi label="Rows" value={String(transactions.length)} />
          </div>
          <CycleSheet />
        </div>
      </div>

      <TransactionFilters />

      {transactions.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No transactions match these filters.
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <TableHead className="h-9">Date</TableHead>
                <TableHead className="h-9">Source</TableHead>
                <TableHead className="h-9">Description</TableHead>
                <TableHead className="h-9 text-right">Amount</TableHead>
                <TableHead className="h-9 w-52">Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-[12px] tabular-nums">
                    {format(tx.date, "d MMM yy")}
                  </TableCell>
                  <TableCell className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {STATEMENT_SOURCE_LABELS[tx.source as StatementSource] ??
                      tx.source}
                  </TableCell>
                  <TableCell className="max-w-md text-[13px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{tx.description}</span>
                      {tx.payCycleId ? (
                        <span className="shrink-0 rounded-sm bg-positive/15 text-positive text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5">
                          Settled
                        </span>
                      ) : null}
                      {tx.kind === "PAYMENT" ? (
                        <span className="shrink-0 rounded-sm bg-muted text-muted-foreground text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5">
                          Payment
                        </span>
                      ) : null}
                      {tx.kind === "REFUND" ? (
                        <span className="shrink-0 rounded-sm bg-positive/15 text-positive text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5">
                          Refund
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-mono text-[13px] ${
                      tx.amount < 0
                        ? "text-negative"
                        : "text-positive"
                    }`}
                  >
                    {formatGBP(tx.amount)}
                  </TableCell>
                  <TableCell>
                    <CategoryCell
                      id={tx.id}
                      category={tx.spendCategory}
                      kind={tx.kind}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

