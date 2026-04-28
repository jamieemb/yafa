import { format } from "date-fns";
import { prisma } from "@/lib/db";
import {
  STATEMENT_SOURCE_LABELS,
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
import { DeleteCycleButton } from "./_components/delete-cycle-button";

export const dynamic = "force-dynamic";

const PALETTE = [
  "#003A6C",
  "#FD8973",
  "#4F7E5C",
  "#B8956A",
  "#6B7E8C",
  "#2E5783",
  "#E0A993",
  "#84A48F",
];

const UNCATEGORISED = "Uncategorised";

interface BreakdownRow {
  category: string;
  count: number;
  total: number; // £, balance impact (positive = money owed for this category)
}

export default async function CyclesPage() {
  const cycles = await prisma.payCycle.findMany({
    orderBy: [{ paidDate: "desc" }, { createdAt: "desc" }],
    include: {
      transactions: {
        orderBy: [{ date: "desc" }],
      },
    },
  });

  const totalSettled = cycles.reduce((acc, c) => acc + c.paidAmount, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="label-eyebrow">Books</p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Pay cycles
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Each cycle records a card payment. The breakdown shows which pots
            to pay from.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-[280px]">
          <Kpi label="Cycles" value={String(cycles.length)} />
          <Kpi label="Total settled" value={formatGBP(totalSettled)} />
        </div>
      </div>

      {cycles.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No cycles yet. Use &ldquo;Settle a payment&rdquo; on the Transactions
            page to create one.
          </p>
        </div>
      ) : (
        <ul className="space-y-6">
          {cycles.map((cycle) => {
            const breakdown = computeBreakdown(cycle.transactions);
            return (
              <li
                key={cycle.id}
                className="rounded-md border bg-card overflow-hidden"
              >
                <div className="flex items-baseline justify-between gap-3 px-5 py-3.5 border-b">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {STATEMENT_SOURCE_LABELS[cycle.source as StatementSource] ??
                        cycle.source}
                    </span>
                    <span className="label-eyebrow">
                      {cycle.transactions.length} transaction
                      {cycle.transactions.length === 1 ? "" : "s"}
                    </span>
                    <span className="label-eyebrow">
                      Paid {format(cycle.paidDate, "d MMM yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums text-base">
                      {formatGBP(cycle.paidAmount)}
                    </span>
                    <DeleteCycleButton
                      id={cycle.id}
                      label={`${STATEMENT_SOURCE_LABELS[cycle.source as StatementSource] ?? cycle.source} · ${format(cycle.paidDate, "d MMM yyyy")}`}
                      count={cycle.transactions.length}
                    />
                  </div>
                </div>
                {cycle.notes ? (
                  <p className="px-5 py-2 text-[12px] text-muted-foreground border-b">
                    {cycle.notes}
                  </p>
                ) : null}
                <Breakdown rows={breakdown} cyclePaid={cycle.paidAmount} />
                <Table>
                  <TableHeader>
                    <TableRow className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      <TableHead className="h-9">Date</TableHead>
                      <TableHead className="h-9">Description</TableHead>
                      <TableHead className="h-9">Category</TableHead>
                      <TableHead className="h-9 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cycle.transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-[12px] text-muted-foreground tabular-nums whitespace-nowrap">
                          {format(tx.date, "d MMM yy")}
                        </TableCell>
                        <TableCell className="text-[13px] truncate max-w-md">
                          {tx.description}
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {tx.spendCategory ?? "—"}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums font-mono text-[13px] ${
                            tx.amount < 0 ? "text-negative" : "text-positive"
                          }`}
                        >
                          {formatGBP(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function computeBreakdown(
  transactions: { spendCategory: string | null; amount: number }[],
): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const tx of transactions) {
    const key = tx.spendCategory ?? UNCATEGORISED;
    const cur = map.get(key) ?? { category: key, count: 0, total: 0 };
    cur.count += 1;
    cur.total += -tx.amount; // balance impact: charges +, refunds -
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function colourForCategory(category: string): string {
  if (category === UNCATEGORISED) return "var(--muted-foreground)";
  const idx = SPEND_CATEGORIES.indexOf(category as SpendCategory);
  if (idx === -1) return PALETTE[0];
  return PALETTE[idx % PALETTE.length];
}

function Breakdown({
  rows,
  cyclePaid,
}: {
  rows: BreakdownRow[];
  cyclePaid: number;
}) {
  if (rows.length === 0) return null;

  // Stacked bar uses positive parts only — refund-heavy categories go
  // with absolute share so the bar still renders cleanly.
  const positiveTotal = rows.reduce(
    (acc, r) => acc + Math.max(r.total, 0),
    0,
  );

  return (
    <div className="px-5 py-4 border-b bg-muted/30">
      <p className="label-eyebrow mb-3">By category — pay from these pots</p>

      {/* Stacked horizontal bar */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted mb-3">
        {rows.map((row) => {
          if (row.total <= 0) return null;
          const pct = (row.total / positiveTotal) * 100;
          return (
            <div
              key={row.category}
              className="h-full"
              style={{
                width: `${pct}%`,
                background: colourForCategory(row.category),
              }}
              title={`${row.category} · ${formatGBP(row.total)}`}
            />
          );
        })}
      </div>

      {/* List */}
      <ul className="space-y-1">
        {rows.map((row) => {
          const pct = (row.total / cyclePaid) * 100;
          return (
            <li
              key={row.category}
              className="grid grid-cols-[10px_1fr_auto_auto] items-center gap-2.5 text-[12px]"
            >
              <span
                className="size-2 rounded-[1px]"
                style={{ background: colourForCategory(row.category) }}
              />
              <span className="font-medium truncate">
                {row.category}
                <span className="text-muted-foreground/70 ml-1.5 text-[11px]">
                  · {row.count} item{row.count === 1 ? "" : "s"}
                </span>
              </span>
              <span className="text-muted-foreground tabular-nums w-12 text-right text-[11px]">
                {pct.toFixed(0)}%
              </span>
              <span className="font-mono tabular-nums w-20 text-right">
                {formatGBP(row.total)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

