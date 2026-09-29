import { format } from "date-fns";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CheckRounded from "@mui/icons-material/CheckRounded";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import { prisma } from "@/lib/db";
import {
  STATEMENT_SOURCE_LABELS,
  STATEMENT_SOURCES,
  SPEND_CATEGORIES,
  type StatementSource,
  type SpendCategory,
} from "@/lib/categories";
import { formatGBP } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { Kpi, KpiGrid } from "@/components/kpi";
import { EmptyState } from "@/components/empty-state";
import { DataList, Meta } from "@/components/data-list";
import { TransactionFilters } from "./_components/filters";
import { CategoryCell } from "./_components/category-cell";
import { CycleSheet } from "./_components/cycle-sheet";

export const dynamic = "force-dynamic";

type Tx = Awaited<ReturnType<typeof prisma.transaction.findMany>>[number];

interface PageProps {
  searchParams: Promise<{
    source?: string;
    category?: string;
    review?: string;
    payments?: string;
    settled?: string;
  }>;
}

function sourceLabel(source: string): string {
  return STATEMENT_SOURCE_LABELS[source as StatementSource] ?? source;
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
    <>
      <PageHeader
        eyebrow="Books"
        title="Transactions"
        description="Most recent 250 matching this filter."
        actions={<CycleSheet />}
      />

      <KpiGrid columns={3}>
        <Kpi label="Spend" value={formatGBP(totalSpend)} tone="negative" />
        <Kpi label="Credits" value={formatGBP(totalCredit)} tone="positive" />
        <Kpi label="Rows" value={String(transactions.length)} />
      </KpiGrid>

      <TransactionFilters />

      {transactions.length === 0 ? (
        <EmptyState
          icon={<ReceiptLongOutlined fontSize="inherit" />}
          title="No transactions match these filters"
          description="Widen the filters above, or import a statement to get started."
        />
      ) : (
        <Card component="section" aria-label="Transactions">
          <DataList<Tx>
            rows={transactions}
            getKey={(r) => r.id}
            columns={[
              {
                id: "date",
                header: "Date",
                nowrap: true,
                numeric: true,
                render: (r) => (
                  <Typography variant="body2" color="text.secondary" component="span">
                    {format(r.date, "d MMM yy")}
                  </Typography>
                ),
              },
              {
                id: "description",
                header: "Description",
                render: (r) => (
                  <Typography
                    variant="body2"
                    component="span"
                    title={r.description}
                    sx={{
                      display: "block",
                      maxWidth: 420,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.description}
                  </Typography>
                ),
              },
              {
                id: "source",
                header: "Source",
                nowrap: true,
                render: (r) => <Chip size="small" variant="outlined" label={sourceLabel(r.source)} />,
              },
              {
                id: "category",
                header: "Category",
                width: 200,
                render: (r) => <CategoryCell id={r.id} category={r.spendCategory} kind={r.kind} />,
              },
              {
                id: "amount",
                header: "Amount",
                align: "right",
                numeric: true,
                nowrap: true,
                render: (r) => (
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{ fontWeight: 500, color: r.amount < 0 ? "error.main" : "success.main" }}
                  >
                    {formatGBP(r.amount)}
                  </Typography>
                ),
              },
              {
                id: "status",
                header: "Cycle",
                nowrap: true,
                render: (r) =>
                  r.payCycleId ? (
                    <Chip
                      size="small"
                      icon={<CheckRounded />}
                      label="Settled"
                      sx={{
                        bgcolor: "m3.tertiaryContainer",
                        color: "m3.onTertiaryContainer",
                        "& .MuiChip-icon": { color: "inherit" },
                      }}
                    />
                  ) : r.kind === "PAYMENT" ? (
                    <Typography variant="body2" color="text.secondary" component="span">
                      —
                    </Typography>
                  ) : (
                    <Chip size="small" variant="outlined" label="Open" sx={{ color: "text.secondary" }} />
                  ),
              },
            ]}
            mobile={{
              title: (r) => r.description,
              meta: (r) => (
                <Meta>
                  {format(r.date, "d MMM yy")}
                  {sourceLabel(r.source)}
                  <CategoryCell id={r.id} category={r.spendCategory} kind={r.kind} />
                </Meta>
              ),
              value: (r) => (
                <Box
                  component="span"
                  sx={{ color: r.amount < 0 ? "error.main" : "success.main" }}
                >
                  {formatGBP(r.amount)}
                </Box>
              ),
              valueSub: (r) => (r.payCycleId ? "Settled" : null),
            }}
          />
        </Card>
      )}
    </>
  );
}
