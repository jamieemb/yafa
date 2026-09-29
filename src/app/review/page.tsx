import { format } from "date-fns";
import Card from "@mui/material/Card";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import { prisma } from "@/lib/db";
import { STATEMENT_SOURCE_LABELS, type StatementSource } from "@/lib/categories";
import { formatGBP } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { Kpi, KpiGrid } from "@/components/kpi";
import { EmptyState } from "@/components/empty-state";
import { ReviewRow } from "./_components/review-row";

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
    <>
      <PageHeader
        eyebrow="Books"
        title="Review"
        description="Pick a category — we'll learn the rule and auto-tag matching transactions next time."
      />

      <KpiGrid columns={2}>
        <Kpi
          label="Pending"
          value={String(transactions.length)}
          sub={`transaction${transactions.length === 1 ? "" : "s"} awaiting a category`}
          emphasised
          size="lg"
        />
        <Kpi
          label="Unclassified spend"
          value={formatGBP(totalUnknown)}
          sub="Charges without a category"
          tone={totalUnknown > 0 ? "negative" : "muted"}
        />
      </KpiGrid>

      {transactions.length === 0 ? (
        <EmptyState
          icon={<TaskAltOutlined fontSize="inherit" />}
          title="All caught up"
          description="Nothing to review. Auto-categorisation got everything."
        />
      ) : (
        <Card component="section" aria-label="Transactions awaiting a category">
          {transactions.map((tx) => (
            <ReviewRow
              key={tx.id}
              id={tx.id}
              description={tx.description}
              dateLabel={format(tx.date, "d MMM yyyy")}
              sourceLabel={STATEMENT_SOURCE_LABELS[tx.source as StatementSource] ?? tx.source}
              amount={tx.amount}
            />
          ))}
        </Card>
      )}
    </>
  );
}
