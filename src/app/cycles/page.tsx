import { format } from "date-fns";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CreditCardOutlined from "@mui/icons-material/CreditCardOutlined";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { prisma } from "@/lib/db";
import {
  STATEMENT_SOURCE_LABELS,
  SPEND_CATEGORIES,
  type StatementSource,
  type SpendCategory,
} from "@/lib/categories";
import { formatGBP } from "@/lib/money";
import { categoryColor } from "@/lib/pot-colors";
import { PageHeader } from "@/components/page-header";
import { Kpi, KpiGrid } from "@/components/kpi";
import { EmptyState } from "@/components/empty-state";
import { DataList, Meta } from "@/components/data-list";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deletePayCycle } from "@/app/transactions/cycle-actions";

export const dynamic = "force-dynamic";

const UNCATEGORISED = "Uncategorised";

type Cycle = Awaited<ReturnType<typeof loadCycles>>[number];
type CycleTransaction = Cycle["transactions"][number];

interface BreakdownRow {
  category: string;
  count: number;
  total: number; // £, balance impact (positive = money owed for this category)
}

function loadCycles() {
  return prisma.payCycle.findMany({
    orderBy: [{ paidDate: "desc" }, { createdAt: "desc" }],
    include: {
      transactions: {
        orderBy: [{ date: "desc" }],
      },
    },
  });
}

export default async function CyclesPage() {
  const cycles = await loadCycles();
  const totalSettled = cycles.reduce((acc, c) => acc + c.paidAmount, 0);
  const cycleCount = `${cycles.length} cycle${cycles.length === 1 ? "" : "s"}`;

  return (
    <>
      <PageHeader
        eyebrow="Books"
        title="Pay cycles"
        description="Each cycle records a card payment. The breakdown shows which pots to pay from."
      />

      <KpiGrid columns={2}>
        <Kpi label="Total settled" value={formatGBP(totalSettled)} sub={cycleCount} emphasised size="lg" />
        <Kpi label="Cycles" value={String(cycles.length)} sub="Card payments recorded" />
      </KpiGrid>

      {cycles.length === 0 ? (
        <EmptyState
          icon={<CreditCardOutlined fontSize="inherit" />}
          title="No cycles yet"
          description="Use “Settle a payment” on the Transactions page to record a card payment and create one."
        />
      ) : (
        <Stack spacing={2}>
          {cycles.map((cycle) => (
            <CycleCard key={cycle.id} cycle={cycle} />
          ))}
        </Stack>
      )}
    </>
  );
}

function CycleCard({ cycle }: { cycle: Cycle }) {
  const sourceLabel = STATEMENT_SOURCE_LABELS[cycle.source as StatementSource] ?? cycle.source;
  const paidLabel = format(cycle.paidDate, "d MMM yyyy");
  const count = cycle.transactions.length;
  const countLabel = `${count} transaction${count === 1 ? "" : "s"}`;
  const breakdown = computeBreakdown(cycle.transactions);
  const headingId = `cycle-${cycle.id}`;

  return (
    <Card component="section" aria-labelledby={headingId}>
      {/* Header: source, paid date, amount, un-settle */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flexWrap: "wrap" }}>
          <Chip size="small" label={sourceLabel} />
          <Typography id={headingId} variant="h5" component="h2" noWrap>
            Paid {paidLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            {countLabel}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
          <Typography variant="h5" component="p" className="tabular" sx={{ whiteSpace: "nowrap" }}>
            {formatGBP(cycle.paidAmount)}
          </Typography>
          <ConfirmDeleteButton
            label={`Un-settle cycle ${sourceLabel} · ${paidLabel}`}
            heading="Un-settle this cycle?"
            description={`The ${countLabel} in this cycle will go back to uncycled and become available for the next settlement.`}
            onConfirm={deletePayCycle.bind(null, cycle.id)}
            successMessage={`Cycle un-settled · ${countLabel} freed`}
            confirmText="Un-settle"
          />
        </Box>
      </Box>

      {cycle.notes ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}
        >
          {cycle.notes}
        </Typography>
      ) : null}

      <Breakdown rows={breakdown} cyclePaid={cycle.paidAmount} />

      {/* Transactions in this cycle */}
      <Accordion
        disableGutters
        square
        elevation={0}
        sx={{
          bgcolor: "transparent",
          "&::before": { display: "none" },
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreRounded />}
          aria-controls={`${headingId}-transactions`}
          id={`${headingId}-transactions-summary`}
          sx={{ px: 2, minHeight: 48 }}
        >
          <Typography variant="subtitle2" component="span">
            {countLabel}
          </Typography>
        </AccordionSummary>
        <AccordionDetails id={`${headingId}-transactions`} sx={{ p: 0 }}>
          <DataList<CycleTransaction>
            rows={cycle.transactions}
            getKey={(t) => t.id}
            size="small"
            columns={[
              {
                id: "date",
                header: "Date",
                nowrap: true,
                numeric: true,
                render: (t) => format(t.date, "d MMM yy"),
              },
              {
                id: "description",
                header: "Description",
                render: (t) => (
                  <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                    {t.description}
                  </Typography>
                ),
              },
              {
                id: "category",
                header: "Category",
                render: (t) =>
                  t.spendCategory ?? (
                    <Typography variant="body2" component="span" color="text.secondary">
                      —
                    </Typography>
                  ),
              },
              {
                id: "amount",
                header: "Amount",
                align: "right",
                numeric: true,
                render: (t) => (
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{ fontWeight: 500, color: t.amount < 0 ? "error.main" : "success.main" }}
                  >
                    {formatGBP(t.amount)}
                  </Typography>
                ),
              },
            ]}
            mobile={{
              title: (t) => t.description,
              meta: (t) => (
                <Meta>
                  {format(t.date, "d MMM yy")}
                  {t.spendCategory ?? UNCATEGORISED}
                </Meta>
              ),
              value: (t) => (
                <Box component="span" sx={{ color: t.amount < 0 ? "error.main" : "success.main" }}>
                  {formatGBP(t.amount)}
                </Box>
              ),
            }}
          />
        </AccordionDetails>
      </Accordion>
    </Card>
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

// Categorical colour per spend category, following the active colour
// scheme. Uncategorised rows use the neutral outline colour.
function colourForCategory(category: string): string {
  if (category === UNCATEGORISED) return "var(--mui-palette-m3-outline)";
  const idx = SPEND_CATEGORIES.indexOf(category as SpendCategory);
  return categoryColor(idx === -1 ? 0 : idx);
}

function Breakdown({ rows, cyclePaid }: { rows: BreakdownRow[]; cyclePaid: number }) {
  if (rows.length === 0) return null;

  // Stacked bar uses positive parts only — refund-heavy categories go
  // with absolute share so the bar still renders cleanly.
  const positiveTotal = rows.reduce((acc, r) => acc + Math.max(r.total, 0), 0);

  return (
    <Box sx={{ px: 2, py: 2 }}>
      <Typography variant="overline" component="p" color="text.secondary" sx={{ mb: 1.5 }}>
        By category — pay from these pots
      </Typography>

      {/* Stacked horizontal bar */}
      <Box
        aria-hidden
        sx={{
          display: "flex",
          height: 8,
          width: "100%",
          overflow: "hidden",
          borderRadius: 4,
          bgcolor: "m3.surfaceContainerHighest",
          mb: 1.5,
        }}
      >
        {rows.map((row) => {
          if (row.total <= 0 || positiveTotal <= 0) return null;
          const pct = (row.total / positiveTotal) * 100;
          return (
            <Box
              key={row.category}
              title={`${row.category} · ${formatGBP(row.total)}`}
              sx={{ height: "100%", width: `${pct}%`, bgcolor: colourForCategory(row.category) }}
            />
          );
        })}
      </Box>

      {/* Stat rows: label left, value right */}
      <Stack spacing={0.75}>
        {rows.map((row) => {
          const pct = cyclePaid > 0 ? (row.total / cyclePaid) * 100 : 0;
          return (
            <Box
              key={row.category}
              sx={{
                display: "grid",
                gridTemplateColumns: "10px minmax(0, 1fr) 44px auto",
                alignItems: "center",
                columnGap: 1.5,
              }}
            >
              <Box
                sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: colourForCategory(row.category) }}
              />
              <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                {row.category}
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  · {row.count} item{row.count === 1 ? "" : "s"}
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary" className="tabular" sx={{ textAlign: "right" }}>
                {pct.toFixed(0)}%
              </Typography>
              <Typography
                variant="body2"
                className="tabular"
                sx={{ fontWeight: 500, textAlign: "right", minWidth: 80, whiteSpace: "nowrap" }}
              >
                {formatGBP(row.total)}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
