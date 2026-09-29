import { format } from "date-fns";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import CakeOutlined from "@mui/icons-material/CakeOutlined";
import CallMadeOutlined from "@mui/icons-material/CallMadeOutlined";
import CallReceivedOutlined from "@mui/icons-material/CallReceivedOutlined";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";
import SavingsOutlined from "@mui/icons-material/SavingsOutlined";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import { categoryColor } from "@/lib/pot-colors";
import { computeMonthBudget, type MonthEvent } from "@/lib/budget";
import {
  currentMonthIso,
  dateToIso,
  isValidMonthIso,
  isoToFirstOfMonth,
  shiftMonths,
} from "@/lib/month";
import { WIZARD_STEPS, setupHref } from "@/lib/plan";
import {
  BUDGET_CATEGORIES,
  IMPORTANCE_LABELS,
  monthlyEquivalent,
  type BudgetCategory,
  type Frequency,
  type ImportanceLevel,
} from "@/lib/categories";
import { dueStatusFor, dueLabel, type DueStatus } from "@/lib/admin";
import { PageHeader } from "@/components/page-header";
import { Kpi, KpiGrid } from "@/components/kpi";
import { DataList, Meta } from "@/components/data-list";
import { AllocationChart } from "./_components/allocation-chart";
import { MonthNav } from "./_components/month-nav";
import { LinkButton, TextLink } from "@/components/next-link";
import { EmptyPanel, PanelHeader, SplitRow } from "./_components/panels";

export const dynamic = "force-dynamic";

interface PotSummary {
  category: BudgetCategory;
  total: number;
  itemCount: number;
}

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

const DUE_COLOR: Record<DueStatus, string> = {
  overdue: "error.main",
  "due-soon": "warning.main",
  upcoming: "text.secondary",
};

// Two-column row on desktop (7/5 split), stacked on phones.
const TWO_COL = {
  display: "grid",
  gap: 2,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 7fr) minmax(0, 5fr)" },
  alignItems: "start",
} as const;

export default async function DashboardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const monthIso = isValidMonthIso(sp.month) ? sp.month : currentMonthIso();
  const budgetMonth = isoToFirstOfMonth(monthIso);

  // Budget maths are shared with the monthly setup wizard
  // (src/lib/budget.ts) so both pages always agree.
  const [budget, activeRenewals] = await Promise.all([
    computeMonthBudget(budgetMonth),
    prisma.renewal.findMany({ where: { active: true } }),
  ]);
  const {
    settings,
    incomeEntries,
    recurringItems: outItems,
    monthEvents,
    eventsTotal,
    incomeTotal: incomeMonthly,
    committed: outflowMonthly,
    discretionary,
    hasIncome,
    allocation,
    plan,
    completedSteps,
  } = budget;

  // The saved plan for the month if there is one, else the Settings split.
  const suggestedSavings = allocation.savings;
  const suggestedInvest = allocation.invest;
  const suggestedFree = allocation.free;
  const planReady = plan?.completedAt != null;
  const stepsDone = completedSteps.size;

  // Pot summary
  const byCategory = new Map<BudgetCategory, PotSummary>();
  for (const cat of BUDGET_CATEGORIES) {
    byCategory.set(cat, { category: cat, total: 0, itemCount: 0 });
  }
  const byAccount = new Map<string, number>();

  for (const item of outItems) {
    const cat = item.budgetCategory as BudgetCategory | null;
    if (cat) {
      const summary = byCategory.get(cat);
      if (summary) {
        summary.total += monthlyEquivalent(
          item.amount,
          item.frequency as Frequency,
        );
        summary.itemCount += 1;
      }
    }
    const acct = item.bankAccount ?? "Unassigned";
    byAccount.set(
      acct,
      (byAccount.get(acct) ?? 0) +
        monthlyEquivalent(item.amount, item.frequency as Frequency),
    );
  }

  // Roll the calendar contribution into the Birthdays & Events pot so
  // the allocation chart and ledger reflect everything that needs
  // setting aside this month, not just recurring items.
  if (eventsTotal > 0) {
    const eventsPot = byCategory.get("Birthdays & Events");
    if (eventsPot) {
      eventsPot.total += eventsTotal;
      eventsPot.itemCount += monthEvents.length;
    }
  }

  const pots = Array.from(byCategory.values())
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
  const accounts = Array.from(byAccount.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const potSlices = pots.map((p, i) => ({
    category: p.category,
    total: p.total,
    color: categoryColor(i),
  }));

  const today = new Date();

  // Active renewals due within the next ~90 days (plus anything overdue),
  // surfaced as read-only reminders — renewals don't affect the budget maths.
  const RENEWAL_HORIZON_DAYS = 90;
  const upcomingRenewals = activeRenewals
    .map((r) => ({
      renewal: r,
      ...dueStatusFor(r.dueDate, r.reminderDays, today),
    }))
    .filter((r) => r.days <= RENEWAL_HORIZON_DAYS)
    .sort((a, b) => a.renewal.dueDate.getTime() - b.renewal.dueDate.getTime())
    .slice(0, 6);
  type RenewalRow = (typeof upcomingRenewals)[number];

  const isCurrentMonth = monthIso === currentMonthIso();
  const prevIso = dateToIso(shiftMonths(budgetMonth, -1));
  const nextIso = dateToIso(shiftMonths(budgetMonth, 1));

  const monthName = format(budgetMonth, "MMMM");
  const shareOf = (value: number) => (outflowMonthly > 0 ? (value / outflowMonthly) * 100 : 0);
  const overBudget = hasIncome && discretionary < 0;

  type EventRow = MonthEvent & { key: string };
  const eventRows: EventRow[] = monthEvents.map((e, i) => ({ ...e, key: `${e.kind}-${i}` }));

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={format(budgetMonth, "MMMM yyyy")}
        description={`Budget snapshot as of ${format(today, "d MMM, HH:mm")}.`}
        actions={
          <MonthNav
            label={format(budgetMonth, "MMM yyyy")}
            prevHref={`/dashboard?month=${prevIso}`}
            nextHref={`/dashboard?month=${nextIso}`}
            currentHref={isCurrentMonth ? undefined : `/dashboard?month=${currentMonthIso()}`}
          />
        }
      />

      {/* ── Headline strip ───────────────────────────────────────── */}
      <KpiGrid columns={4}>
        <Kpi
          size="lg"
          label={`Income · ${format(budgetMonth, "MMM")}`}
          icon={<CallReceivedOutlined sx={{ color: "success.main" }} />}
          value={hasIncome ? formatGBP(incomeMonthly) : "—"}
          sub={
            hasIncome
              ? `${incomeEntries.length} entr${incomeEntries.length === 1 ? "y" : "ies"}`
              : "Record this month's income"
          }
          tone={hasIncome ? "positive" : "muted"}
        />
        <Kpi
          size="lg"
          label="Committed"
          icon={<CallMadeOutlined sx={{ color: "error.main" }} />}
          value={formatGBP(outflowMonthly)}
          sub={`${outItems.length} item${outItems.length === 1 ? "" : "s"} · ${pots.length} pot${pots.length === 1 ? "" : "s"}`}
          tone="negative"
        />
        <Kpi
          size="lg"
          label="Left over"
          value={hasIncome ? formatGBP(discretionary) : "—"}
          sub={
            hasIncome
              ? discretionary >= 0
                ? "After committed outflow"
                : "Outflow exceeds income"
              : "Add income to see this"
          }
          // The emphasised tile ignores tone, so drop the emphasis when
          // over budget and let the error colour carry the message.
          tone={!hasIncome ? "muted" : overBudget ? "negative" : "neutral"}
          emphasised={!overBudget}
        />
        <Kpi
          size="lg"
          label="To save"
          icon={<SavingsOutlined sx={{ color: "primary.main" }} />}
          value={
            hasIncome && discretionary > 0
              ? formatGBP(suggestedSavings + suggestedInvest)
              : "—"
          }
          sub={
            allocation.source === "plan"
              ? "Your plan · savings + investments"
              : `Suggested · ${Math.round((settings.savingsPercent + settings.investPercent) * 100)}% of left over`
          }
          tone={hasIncome && discretionary > 0 ? "primary" : "muted"}
        />
      </KpiGrid>

      {/* ── Month setup prompt ───────────────────────────────────── */}
      {!planReady ? (
        <Card
          component="section"
          aria-labelledby="dash-setup"
          sx={{ bgcolor: "m3.primaryContainer", color: "m3.onPrimaryContainer" }}
        >
          <CardContent
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box sx={{ minWidth: 0, flex: "1 1 260px" }}>
              <Typography variant="overline" component="p" sx={{ opacity: 0.8 }}>
                Month setup
              </Typography>
              <Typography id="dash-setup" variant="h5" component="h2">
                {stepsDone === 0
                  ? `Set up ${monthName}`
                  : `${monthName} setup · ${stepsDone} of ${WIZARD_STEPS.length} steps done`}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                Income, events, recurring costs and car trips, then allocate what&apos;s left.
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stepsDone / WIZARD_STEPS.length) * 100}
                aria-label={`${stepsDone} of ${WIZARD_STEPS.length} steps complete`}
                sx={{
                  mt: 1.5,
                  bgcolor: "rgba(0,0,0,0.08)",
                  "& .MuiLinearProgress-bar": { bgcolor: "m3.onPrimaryContainer" },
                }}
              />
            </Box>
            <LinkButton href={setupHref(monthIso)} variant="contained" arrow={false}>
              {stepsDone === 0 ? "Start setup" : "Continue setup"}
            </LinkButton>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Allocation + smart split ─────────────────────────────── */}
      <Box sx={TWO_COL}>
        <Card component="section" aria-labelledby="dash-allocation">
          <PanelHeader
            eyebrow="Pot allocation"
            title="Where your outflow goes"
            id="dash-allocation"
            meta={<LinkButton href="/recurring">View ledger</LinkButton>}
          />
          {pots.length === 0 ? (
            <EmptyPanel
              message="Add some recurring outgoings to see your allocation."
              action={<LinkButton href="/recurring">Add an item</LinkButton>}
            />
          ) : (
            <CardContent>
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  alignItems: "center",
                  gridTemplateColumns: {
                    xs: "minmax(0, 1fr)",
                    sm: "minmax(200px, 240px) minmax(0, 1fr)",
                  },
                }}
              >
                <AllocationChart data={potSlices} height={240} />
                <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, minWidth: 0 }}>
                  {potSlices.map((slice) => (
                    <SplitRow
                      key={slice.category}
                      color={slice.color}
                      label={slice.category}
                      pct={shareOf(slice.total)}
                      value={formatGBP(slice.total)}
                    />
                  ))}
                </Box>
              </Box>
            </CardContent>
          )}
        </Card>

        <Card component="section" aria-labelledby="dash-split">
          <PanelHeader
            eyebrow={allocation.source === "plan" ? "Your allocation" : "Smart allocation"}
            title="After bills are paid"
            id="dash-split"
            meta={
              allocation.source === "plan" ? (
                <LinkButton href={setupHref(monthIso, "allocation")}>Adjust</LinkButton>
              ) : (
                <AutoAwesomeOutlined fontSize="small" sx={{ color: "primary.main" }} />
              )
            }
          />
          {!hasIncome ? (
            <EmptyPanel
              message={`Record income for ${monthName} to unlock the savings, investments and free-spend split.`}
              action={<LinkButton href={`/income?month=${monthIso}`}>Add income</LinkButton>}
            />
          ) : discretionary <= 0 ? (
            <CardContent>
              <Alert severity="error" icon={false}>
                <Typography variant="subtitle2" component="p">
                  You&apos;re over budget by {formatGBP(Math.abs(discretionary))}/mo.
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Trim a recurring outflow or increase income before allocating savings.
                </Typography>
              </Alert>
            </CardContent>
          ) : (
            <CardContent>
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1.5 }}>
                {allocation.source === "plan"
                  ? `The split you chose for ${monthName}.`
                  : `Suggested from your Settings percentages — set up the month to choose your own.`}
              </Typography>
              <DiscretionaryBreakdown
                total={discretionary}
                savings={suggestedSavings}
                invest={suggestedInvest}
                free={suggestedFree}
                footer={
                  allocation.source === "plan" ? (
                    <>
                      Your plan. Change it in{" "}
                      <TextLink href={setupHref(monthIso, "allocation")}>Month setup</TextLink>.
                    </>
                  ) : (
                    <>
                      Suggested split. Default percentages live in{" "}
                      <TextLink href="/settings">settings</TextLink>.
                    </>
                  )
                }
              />
            </CardContent>
          )}
        </Card>
      </Box>

      {/* ── Events + accounts ────────────────────────────────────── */}
      <Box sx={TWO_COL}>
        <Card component="section" aria-labelledby="dash-events">
          <PanelHeader
            eyebrow="Birthdays & events"
            title={`${monthName} ahead`}
            id="dash-events"
            meta={
              monthEvents.length === 0 ? null : (
                <>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${monthEvents.length} item${monthEvents.length === 1 ? "" : "s"}`}
                  />
                  <Typography
                    variant="subtitle2"
                    component="p"
                    className="tabular"
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    {formatGBP(eventsTotal)}
                  </Typography>
                </>
              )
            }
          />
          {monthEvents.length === 0 ? (
            <EmptyPanel
              message="Nothing scheduled this month."
              action={<LinkButton href="/calendar">Add an event</LinkButton>}
            />
          ) : (
            <DataList<EventRow>
              rows={eventRows}
              getKey={(e) => e.key}
              size="small"
              columns={[
                {
                  id: "date",
                  header: "Date",
                  nowrap: true,
                  numeric: true,
                  width: 96,
                  render: (e) => format(e.date, "EEE d"),
                },
                {
                  id: "title",
                  header: "Event",
                  render: (e) => (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                      <EventKindIcon kind={e.kind} />
                      <Typography variant="body2" noWrap>
                        {e.title}
                      </Typography>
                    </Box>
                  ),
                },
                {
                  id: "importance",
                  header: "Importance",
                  render: (e) => <ImportanceChip importance={e.importance} />,
                },
                {
                  id: "amount",
                  header: "Budget",
                  align: "right",
                  numeric: true,
                  render: (e) => (
                    <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                      {formatGBP(e.amount)}
                    </Typography>
                  ),
                },
              ]}
              mobile={{
                title: (e) => e.title,
                meta: (e) => (
                  <Meta>
                    {format(e.date, "EEE d")}
                    {e.kind === "BIRTHDAY" ? "Birthday" : "Event"}
                    {e.importance ? IMPORTANCE_LABELS[e.importance] : null}
                  </Meta>
                ),
                value: (e) => formatGBP(e.amount),
              }}
            />
          )}
        </Card>

        <Card component="section" aria-labelledby="dash-accounts">
          <PanelHeader
            eyebrow="Funded by"
            title="By account"
            id="dash-accounts"
            meta={
              <Chip
                size="small"
                variant="outlined"
                label={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
              />
            }
          />
          {accounts.length === 0 ? (
            <EmptyPanel message="No funding accounts assigned yet." />
          ) : (
            <CardContent>
              <Stack component="ul" spacing={1.5} sx={{ listStyle: "none", m: 0, p: 0 }}>
                {accounts.map((a) => {
                  const pct = shareOf(a.total);
                  return (
                    <Box component="li" key={a.name}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: 2,
                          mb: 0.75,
                        }}
                      >
                        <Typography variant="body2" noWrap sx={{ fontWeight: 500, minWidth: 0 }}>
                          {a.name}
                        </Typography>
                        <Typography variant="body2" className="tabular" sx={{ whiteSpace: "nowrap" }}>
                          {formatGBP(a.total)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, pct)}
                        aria-label={`${a.name}: ${pct.toFixed(0)}% of committed outflow`}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          )}
        </Card>
      </Box>

      {/* ── Upcoming renewals ────────────────────────────────────── */}
      <Card component="section" aria-labelledby="dash-renewals">
        <PanelHeader
          eyebrow="Life admin"
          title="Upcoming renewals"
          id="dash-renewals"
          meta={<LinkButton href="/renewals">View all</LinkButton>}
        />
        {upcomingRenewals.length === 0 ? (
          <EmptyPanel
            message={`Nothing due in the next ${RENEWAL_HORIZON_DAYS} days.`}
            action={<LinkButton href="/renewals">Track a renewal</LinkButton>}
          />
        ) : (
          <DataList<RenewalRow>
            rows={upcomingRenewals}
            getKey={(r) => r.renewal.id}
            size="small"
            columns={[
              {
                id: "due",
                header: "Due",
                nowrap: true,
                numeric: true,
                width: 96,
                render: (r) => format(r.renewal.dueDate, "d MMM"),
              },
              {
                id: "title",
                header: "Renewal",
                render: (r) => (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                    <Box
                      aria-hidden
                      sx={{
                        display: "flex",
                        p: 0.75,
                        borderRadius: 2,
                        bgcolor: "m3.primaryContainer",
                        color: "m3.onPrimaryContainer",
                        flexShrink: 0,
                        "& svg": { fontSize: 16 },
                      }}
                    >
                      <EventAvailableOutlined />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                        {r.renewal.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="p">
                        {r.renewal.category}
                        {r.renewal.subject ? ` · ${r.renewal.subject}` : ""}
                      </Typography>
                    </Box>
                  </Box>
                ),
              },
              {
                id: "status",
                header: "Status",
                nowrap: true,
                render: (r) => (
                  <Typography variant="body2" component="span" sx={{ color: DUE_COLOR[r.status] }}>
                    {dueLabel(r.days)}
                  </Typography>
                ),
              },
              {
                id: "cost",
                header: "Cost",
                align: "right",
                numeric: true,
                render: (r) => (r.renewal.cost != null ? formatGBP(r.renewal.cost) : "—"),
              },
            ]}
            mobile={{
              title: (r) => r.renewal.title,
              meta: (r) => (
                <Meta>
                  {format(r.renewal.dueDate, "d MMM")}
                  {r.renewal.category}
                  {r.renewal.subject}
                </Meta>
              ),
              value: (r) => (r.renewal.cost != null ? formatGBP(r.renewal.cost) : "—"),
              valueSub: (r) => (
                <Box component="span" sx={{ color: DUE_COLOR[r.status] }}>
                  {dueLabel(r.days)}
                </Box>
              ),
            }}
          />
        )}
      </Card>
    </>
  );
}

function EventKindIcon({ kind }: { kind: MonthEvent["kind"] }) {
  const birthday = kind === "BIRTHDAY";
  return (
    <Box
      aria-hidden
      sx={{
        display: "flex",
        p: 0.75,
        borderRadius: 2,
        flexShrink: 0,
        bgcolor: birthday ? "m3.primaryContainer" : "m3.surfaceContainerHighest",
        color: birthday ? "m3.onPrimaryContainer" : "text.secondary",
        "& svg": { fontSize: 16 },
      }}
    >
      {birthday ? <CakeOutlined /> : <EventOutlined />}
    </Box>
  );
}

function ImportanceChip({ importance }: { importance: ImportanceLevel | null }) {
  if (!importance) return <>—</>;
  return (
    <Chip
      size="small"
      variant={importance === "HIGH" ? "filled" : "outlined"}
      label={IMPORTANCE_LABELS[importance]}
    />
  );
}

function DiscretionaryBreakdown({
  total,
  savings,
  invest,
  free,
  footer,
}: {
  total: number;
  savings: number;
  invest: number;
  free: number;
  /** Where these numbers come from and how to change them. */
  footer: React.ReactNode;
}) {
  const segments = [
    { label: "Savings", value: savings, color: categoryColor(0) },
    { label: "Investments", value: invest, color: categoryColor(1) },
    { label: "Free spend", value: free, color: categoryColor(2) },
  ];

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h3" component="p" className="tabular">
          {formatGBP(total)}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
          Discretionary monthly
        </Typography>
      </Box>

      {/* Stacked share bar */}
      <Box
        aria-hidden
        sx={{
          display: "flex",
          height: 10,
          borderRadius: 5,
          overflow: "hidden",
          bgcolor: "m3.surfaceContainerHighest",
        }}
      >
        {segments.map((s) => (
          <Box key={s.label} sx={{ width: `${(s.value / total) * 100}%`, bgcolor: s.color }} />
        ))}
      </Box>

      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {segments.map((s) => (
          <SplitRow
            key={s.label}
            color={s.color}
            label={s.label}
            pct={(s.value / total) * 100}
            value={formatGBP(s.value)}
          />
        ))}
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        component="p"
        sx={{ pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}
      >
        {footer}
      </Typography>
    </Stack>
  );
}
