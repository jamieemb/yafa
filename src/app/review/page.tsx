import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  STATEMENT_SOURCE_LABELS,
  type StatementSource,
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
import { ReviewActions } from "./_components/review-row";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const transactions = await prisma.transaction.findMany({
    where: { needsReview: true, kind: { in: ["SPEND", "REFUND"] } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const totalUnknown = transactions.reduce(
    (acc, t) => acc + (t.amount < 0 ? -t.amount : 0),
    0,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="label-eyebrow">Books</p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Review
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Pick a category — we&apos;ll learn the rule and auto-tag matching
            transactions next time.
          </p>
        </div>
        <div className="text-right">
          <p className="label-eyebrow">Pending</p>
          <p className="font-mono text-2xl tabular-nums tracking-[-0.02em] mt-1">
            {transactions.length}
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground ml-2">
              · {formatGBP(totalUnknown)} unclassified
            </span>
          </p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 flex flex-col items-center gap-3">
          <CheckCircle2 className="size-8 text-primary" />
          <p className="text-sm text-muted-foreground">
            Nothing to review. Auto-categorisation got everything.
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
                <TableHead className="h-9 w-72 text-right">Assign</TableHead>
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
                    <div className="truncate">{tx.description}</div>
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
                    <ReviewActions id={tx.id} />
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
