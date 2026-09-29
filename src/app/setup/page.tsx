import { format } from "date-fns";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CakeOutlined from "@mui/icons-material/CakeOutlined";
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import { computeMonthBudget, type MonthBudget } from "@/lib/budget";
import {
  currentMonthIso,
  dateToIso,
  isValidMonthIso,
  isoToFirstOfMonth,
  monthEndExclusive,
  shiftMonths,
} from "@/lib/month";
import {
  WIZARD_STEPS,
  firstOpenStep,
  isStepId,
  setupHref,
  stepIndex,
  type StepId,
} from "@/lib/plan";
import {
  FREQUENCY_LABELS,
  IMPORTANCE_LABELS,
  monthlyEquivalent,
  type Frequency,
  type ImportanceLevel,
} from "@/lib/categories";
import { formatMiles } from "@/lib/mileage";
import { PageHeader } from "@/components/page-header";
import { Kpi, KpiGrid } from "@/components/kpi";
import { DataList, Meta } from "@/components/data-list";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { LinkButton } from "@/components/next-link";
import { MonthNav } from "@/app/income/_components/month-nav";
import { IncomeDialog } from "@/app/income/_components/income-dialog";
import { deleteIncomeEntry } from "@/app/income/actions";
import { EventDialog } from "@/app/calendar/_components/event-dialog";
import { deleteCalendarEvent } from "@/app/calendar/actions";
import { RecurringDialog } from "@/app/recurring/_components/recurring-dialog";
import { ActiveToggle } from "@/app/recurring/_components/active-toggle";
import { ImportTripsDialog } from "@/app/mileage/_components/import-trips-dialog";
import { WizardStepper, StepActions } from "./_components/wizard-nav";
import { AllocationEditor } from "./_components/allocation-editor";
import { IncomeSuggestions, type IncomeSuggestion } from "./_components/income-suggestions";
import { ReopenButton } from "./_components/reopen-button";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string; step?: string }>;
}

export default async function SetupPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const monthIso = isValidMonthIso(sp.month) ? sp.month : currentMonthIso();
  const budgetMonth = isoToFirstOfMonth(monthIso);
  const budget = await computeMonthBudget(budgetMonth);
  const completed = budget.completedSteps;
  const step: StepId = isStepId(sp.step) ? sp.step : firstOpenStep(completed);
  const def = WIZARD_STEPS[stepIndex(step)];
  const isDone = completed.has(step);

  const monthLabel = format(budgetMonth, "MMMM yyyy");
  const monthName = format(budgetMonth, "MMMM");
  const prevIso = dateToIso(shiftMonths(budgetMonth, -1));
  const nextIso = dateToIso(shiftMonths(budgetMonth, 1));
  const isCurrent = monthIso === currentMonthIso();

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        title={`Set up ${monthLabel}`}
        description="A guided run through the month: income, events, recurring costs and car trips, then allocate what's left."
        actions={
          <MonthNav
            label={format(budgetMonth, "MMM yyyy")}
            prevHref={setupHref(prevIso)}
            nextHref={setupHref(nextIso)}
            todayHref={isCurrent ? undefined : setupHref(currentMonthIso())}
          />
        }
      />

      {budget.plan?.completedAt ? (
        <Alert severity="success" action={<ReopenButton monthIso={monthIso} />}>
          {monthName} was set up on {format(budget.plan.completedAt, "d MMM yyyy")}. You can still change anything below.
        </Alert>
      ) : null}

      <KpiGrid columns={3}>
        <Kpi label="Income" value={budget.hasIncome ? formatGBP(budget.incomeTotal) : "—"} tone={budget.hasIncome ? "positive" : "muted"} sub={`${budget.incomeEntries.length} entr${budget.incomeEntries.length === 1 ? "y" : "ies"}`} />
        <Kpi label="Committed" value={formatGBP(budget.committed)} tone="negative" sub={`${budget.recurringItems.length} recurring · ${budget.monthEvents.length} event${budget.monthEvents.length === 1 ? "" : "s"}`} />
        <Kpi
          label="Left over"
          value={budget.hasIncome ? formatGBP(budget.discretionary) : "—"}
          tone={!budget.hasIncome ? "muted" : budget.discretionary < 0 ? "negative" : "neutral"}
          emphasised={budget.hasIncome && budget.discretionary >= 0}
          sub={budget.hasIncome ? (budget.discretionary < 0 ? "Outflow exceeds income" : "To allocate in the last step") : "Add income first"}
        />
      </KpiGrid>

      <WizardStepper monthIso={monthIso} current={step} completed={[...completed]} />

      <Card component="section" aria-labelledby="step-heading">
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Typography variant="overline" color="text.secondary" component="p">
                  Step {stepIndex(step) + 1} of {WIZARD_STEPS.length} · {def.title}
                </Typography>
                {isDone ? <Chip size="small" color="success" label="Done" /> : null}
              </Box>
              <Typography id="step-heading" variant="h3" component="h2">
                {def.heading}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {def.description}
              </Typography>
            </Box>
            <Divider />

            {step === "income" ? <IncomeStep monthIso={monthIso} budget={budget} /> : null}
            {step === "events" ? <EventsStep budget={budget} /> : null}
            {step === "recurring" ? <RecurringStep budget={budget} /> : null}
            {step === "trips" ? <TripsStep budget={budget} /> : null}
            {step === "allocation" ? <AllocationStep monthIso={monthIso} budget={budget} /> : null}

            <StepActions
              monthIso={monthIso}
              current={step}
              isDone={isDone}
              doneLabel={DONE_LABEL[step]}
              canFinish
            />
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}

const DONE_LABEL: Record<StepId, string> = {
  income: "Income sorted",
  events: "Events checked",
  recurring: "Recurring reviewed",
  trips: "Trips imported",
  allocation: "Finish setup",
};

// ── Step 1: income ──────────────────────────────────────────────────────

async function IncomeStep({ monthIso, budget }: { monthIso: string; budget: MonthBudget }) {
  const { budgetMonth, incomeEntries } = budget;

  // Suggestions: entries from the previous three months whose
  // person + label isn't present this month yet. Most recent wins.
  const from = shiftMonths(budgetMonth, -3);
  const [previous, allPersons, allAccounts] = await Promise.all([
    prisma.incomeEntry.findMany({
      where: { month: { gte: from, lt: budgetMonth } },
      orderBy: [{ month: "desc" }],
    }),
    prisma.incomeEntry.findMany({ where: { person: { not: null } }, select: { person: true }, distinct: ["person"] }),
    prisma.incomeEntry.findMany({ where: { bankAccount: { not: null } }, select: { bankAccount: true }, distinct: ["bankAccount"] }),
  ]);
  const present = new Set(incomeEntries.map((e) => `${e.person ?? ""}|${e.label}`));
  const suggestions: IncomeSuggestion[] = [];
  const seen = new Set<string>();
  for (const e of previous) {
    const key = `${e.person ?? ""}|${e.label}`;
    if (present.has(key) || seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      key,
      label: e.label,
      person: e.person,
      amount: e.amount,
      bankAccount: e.bankAccount,
      sourceMonth: format(e.month, "MMMM"),
    });
  }
  const personOptions = allPersons.map((r) => r.person).filter((v): v is string => Boolean(v)).sort();
  const accountOptions = allAccounts.map((r) => r.bankAccount).filter((v): v is string => Boolean(v)).sort();

  const byPerson = new Map<string, number>();
  for (const e of incomeEntries) byPerson.set(e.person ?? "Unassigned", (byPerson.get(e.person ?? "Unassigned") ?? 0) + e.amount);

  return (
    <Stack spacing={2.5}>
      {incomeEntries.length === 0 ? (
        <EmptyState
          icon={<PaymentsOutlined fontSize="inherit" />}
          title={`No income for ${format(budgetMonth, "MMMM")} yet`}
          description="Add each person's salary. If it's the same as last month, use the suggestions below."
          action={<IncomeDialog defaultMonthIso={monthIso} lockMonth personOptions={personOptions} accountOptions={accountOptions} fabOnMobile={false} />}
        />
      ) : (
        <Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {[...byPerson.entries()].map(([name, amount]) => (
                <Chip key={name} label={`${name} · ${formatGBP(amount)}`} variant="outlined" className="tabular" />
              ))}
            </Box>
            <IncomeDialog defaultMonthIso={monthIso} lockMonth personOptions={personOptions} accountOptions={accountOptions} fabOnMobile={false} />
          </Box>
          <Card variant="outlined">
            <DataList
              rows={incomeEntries}
              getKey={(r) => r.id}
              size="small"
              columns={[
                { id: "person", header: "Person", render: (r) => r.person ?? "—" },
                { id: "label", header: "Label", render: (r) => r.label },
                { id: "paid", header: "Paid on", nowrap: true, render: (r) => (r.paidDate ? format(r.paidDate, "d MMM") : "Not yet") },
                { id: "account", header: "Lands in", render: (r) => r.bankAccount ?? "—" },
                { id: "amount", header: "Amount", align: "right", numeric: true, render: (r) => formatGBP(r.amount) },
              ]}
              mobile={{
                title: (r) => r.label,
                meta: (r) => (
                  <Meta>
                    {r.person}
                    {r.bankAccount}
                    {r.paidDate ? `Paid ${format(r.paidDate, "d MMM")}` : "Not yet paid"}
                  </Meta>
                ),
                value: (r) => formatGBP(r.amount),
              }}
              actions={(r) => (
                <>
                  <IncomeDialog
                    defaultMonthIso={monthIso}
                    personOptions={personOptions}
                    accountOptions={accountOptions}
                    initial={{
                      id: r.id,
                      month: r.month,
                      paidDate: r.paidDate,
                      person: r.person,
                      label: r.label,
                      amount: r.amount,
                      bankAccount: r.bankAccount,
                      notes: r.notes,
                    }}
                  />
                  <ConfirmDeleteButton
                    label={`Delete ${r.label}`}
                    heading="Delete income entry?"
                    description={`“${r.label}” (${formatGBP(r.amount)}) will be removed from ${format(budgetMonth, "MMMM")}.`}
                    onConfirm={deleteIncomeEntry.bind(null, r.id)}
                  />
                </>
              )}
            />
          </Card>
        </Box>
      )}
      <IncomeSuggestions monthIso={monthIso} suggestions={suggestions} />
    </Stack>
  );
}

// ── Step 2: events & birthdays ──────────────────────────────────────────

async function EventsStep({ budget }: { budget: MonthBudget }) {
  const { budgetMonth, monthEvents, eventsTotal, settings } = budget;
  const eventIds = monthEvents.map((e) => e.id).filter((id): id is string => Boolean(id));
  const [rawEvents, people] = await Promise.all([
    eventIds.length ? prisma.calendarEvent.findMany({ where: { id: { in: eventIds } } }) : Promise.resolve([]),
    prisma.person.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  const rawById = new Map(rawEvents.map((e) => [e.id, e]));
  const giftAmounts: Record<ImportanceLevel, number> = {
    LOW: settings.giftLow,
    MEDIUM: settings.giftMedium,
    HIGH: settings.giftHigh,
  };
  const personOptions = people.map((p) => p.name);
  const rows = monthEvents.map((e, i) => ({ ...e, key: `${e.kind}-${e.id ?? i}` }));
  const addButton = <EventDialog giftAmounts={giftAmounts} personOptions={personOptions} fabOnMobile={false} />;

  return (
    <Stack spacing={2.5}>
      {rows.length === 0 ? (
        <EmptyState
          icon={<EventOutlined fontSize="inherit" />}
          title={`Nothing in ${format(budgetMonth, "MMMM")} yet`}
          description="Birthdays come through from People automatically. Add one-offs like weddings, parties or Christmas here."
          action={addButton}
        />
      ) : (
        <Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {rows.length} item{rows.length === 1 ? "" : "s"} · <strong className="tabular">{formatGBP(eventsTotal)}</strong> set aside in the Birthdays &amp; Events pot
            </Typography>
            {addButton}
          </Box>
          <Card variant="outlined">
            <DataList
              rows={rows}
              getKey={(r) => r.key}
              size="small"
              columns={[
                { id: "date", header: "Date", nowrap: true, render: (r) => format(r.date, "EEE d MMM") },
                {
                  id: "title",
                  header: "Event",
                  render: (r) => (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {r.kind === "BIRTHDAY" ? <CakeOutlined fontSize="small" color="action" /> : <EventOutlined fontSize="small" color="action" />}
                      {r.title}
                    </Box>
                  ),
                },
                { id: "person", header: "Person", render: (r) => r.person ?? "—" },
                {
                  id: "importance",
                  header: "Importance",
                  render: (r) => (r.importance ? <Chip size="small" variant="outlined" label={IMPORTANCE_LABELS[r.importance]} /> : "—"),
                },
                { id: "amount", header: "Budget", align: "right", numeric: true, render: (r) => (r.amount > 0 ? formatGBP(r.amount) : "—") },
              ]}
              mobile={{
                title: (r) => r.title,
                meta: (r) => (
                  <Meta>
                    {format(r.date, "EEE d MMM")}
                    {r.kind === "BIRTHDAY" ? "Birthday" : "Event"}
                    {r.importance ? IMPORTANCE_LABELS[r.importance] : null}
                  </Meta>
                ),
                value: (r) => (r.amount > 0 ? formatGBP(r.amount) : "—"),
              }}
              actions={(r) => {
                const raw = r.id ? rawById.get(r.id) : undefined;
                if (!raw) {
                  return <LinkButton href="/people" arrow={false}>Manage in People</LinkButton>;
                }
                return (
                  <>
                    <EventDialog
                      giftAmounts={giftAmounts}
                      personOptions={personOptions}
                      initial={{
                        id: raw.id,
                        title: raw.title,
                        date: raw.date,
                        recursAnnually: raw.recursAnnually,
                        importance: raw.importance,
                        amount: raw.amount,
                        person: raw.person,
                        notes: raw.notes,
                      }}
                    />
                    <ConfirmDeleteButton
                      label={`Delete ${raw.title}`}
                      heading="Delete event?"
                      description={`“${raw.title}” will be removed from the calendar.`}
                      onConfirm={deleteCalendarEvent.bind(null, raw.id)}
                    />
                  </>
                );
              }}
            />
          </Card>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary">
        Gift budgets default to the importance tier in Settings (Low {formatGBP(settings.giftLow)} · Medium {formatGBP(settings.giftMedium)} · High {formatGBP(settings.giftHigh)}).
      </Typography>
    </Stack>
  );
}

// ── Step 3: recurring costs ─────────────────────────────────────────────

async function RecurringStep({ budget }: { budget: MonthBudget }) {
  const { budgetMonth, recurringItems, recurringTotal } = budget;
  const end = monthEndExclusive(budgetMonth);
  const [accountsRecurring, accountsIncome, pausedCount] = await Promise.all([
    prisma.recurringItem.findMany({ where: { bankAccount: { not: null } }, select: { bankAccount: true }, distinct: ["bankAccount"] }),
    prisma.incomeEntry.findMany({ where: { bankAccount: { not: null } }, select: { bankAccount: true }, distinct: ["bankAccount"] }),
    prisma.recurringItem.count({ where: { active: false } }),
  ]);
  const accountOptions = Array.from(
    new Set([...accountsRecurring, ...accountsIncome].map((r) => r.bankAccount).filter((v): v is string => Boolean(v))),
  ).sort();
  const endingSoon = recurringItems.filter((r) => r.endDate && r.endDate < end).length;

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" color="text.secondary">
          {recurringItems.length} active item{recurringItems.length === 1 ? "" : "s"} · <strong className="tabular">{formatGBP(recurringTotal)}</strong> per month
          {pausedCount > 0 ? ` · ${pausedCount} paused` : ""}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <LinkButton href="/recurring" arrow={false}>Full ledger</LinkButton>
          <RecurringDialog accountOptions={accountOptions} fabOnMobile={false} />
        </Box>
      </Box>
      {endingSoon > 0 ? (
        <Alert severity="warning">
          {endingSoon} item{endingSoon === 1 ? "" : "s"} make{endingSoon === 1 ? "s" : ""} a final payment this month. Check whether anything replaces {endingSoon === 1 ? "it" : "them"}.
        </Alert>
      ) : null}
      {recurringItems.length === 0 ? (
        <EmptyState title="No recurring costs" description="Add bills, subscriptions and budget pots so the dashboard knows what is committed." />
      ) : (
        <Card variant="outlined">
          <DataList
            rows={recurringItems}
            getKey={(r) => r.id}
            size="small"
            columns={[
              {
                id: "name",
                header: "Item",
                render: (r) => (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.budgetCategory ?? "No pot"}</Typography>
                  </>
                ),
              },
              { id: "account", header: "Account", render: (r) => r.bankAccount ?? "—" },
              { id: "frequency", header: "Frequency", render: (r) => FREQUENCY_LABELS[r.frequency as Frequency] ?? r.frequency },
              {
                id: "ends",
                header: "Ends",
                nowrap: true,
                render: (r) =>
                  r.endDate ? (
                    <Chip size="small" color={r.endDate < end ? "warning" : "default"} variant={r.endDate < end ? "filled" : "outlined"} label={format(r.endDate, "d MMM yyyy")} />
                  ) : (
                    "Ongoing"
                  ),
              },
              { id: "monthly", header: "Per month", align: "right", numeric: true, render: (r) => formatGBP(monthlyEquivalent(r.amount, r.frequency as Frequency)) },
            ]}
            mobile={{
              title: (r) => r.name,
              meta: (r) => (
                <Meta>
                  {r.budgetCategory}
                  {FREQUENCY_LABELS[r.frequency as Frequency] ?? r.frequency}
                  {r.endDate ? `Ends ${format(r.endDate, "d MMM yyyy")}` : null}
                </Meta>
              ),
              value: (r) => formatGBP(monthlyEquivalent(r.amount, r.frequency as Frequency)),
              valueSub: () => "per month",
            }}
            actions={(r) => (
              <>
                <ActiveToggle id={r.id} active={r.active} name={r.name} />
                <RecurringDialog
                  accountOptions={accountOptions}
                  initial={{
                    id: r.id,
                    name: r.name,
                    amount: r.amount,
                    budgetCategory: r.budgetCategory,
                    bankAccount: r.bankAccount,
                    frequency: r.frequency,
                    dayOfMonth: r.dayOfMonth,
                    startDate: r.startDate,
                    endDate: r.endDate,
                    notes: r.notes,
                    active: r.active,
                  }}
                />
              </>
            )}
          />
        </Card>
      )}
    </Stack>
  );
}

// ── Step 4: car trips ───────────────────────────────────────────────────

async function TripsStep({ budget }: { budget: MonthBudget }) {
  const { budgetMonth } = budget;
  const contract = await prisma.mileageContract.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } });
  if (!contract) {
    return (
      <EmptyState
        icon={<DirectionsCarOutlined fontSize="inherit" />}
        title="No mileage contract"
        description="If you have a PCP or lease with a mileage allowance, set it up on the Mileage page. Otherwise skip this step."
        action={<LinkButton href="/mileage" variant="tonal" arrow={false}>Go to Mileage</LinkButton>}
      />
    );
  }
  const end = monthEndExclusive(budgetMonth);
  const [monthTrips, lastTrip, lastImport, totalTrips] = await Promise.all([
    prisma.carTrip.findMany({ where: { contractId: contract.id, startAt: { gte: budgetMonth, lt: end } }, select: { startOdo: true, endOdo: true } }),
    prisma.carTrip.findFirst({ where: { contractId: contract.id }, orderBy: { startAt: "desc" }, select: { startAt: true } }),
    prisma.tripImport.findFirst({ orderBy: { importedAt: "desc" } }),
    prisma.carTrip.count({ where: { contractId: contract.id } }),
  ]);
  const monthMiles = monthTrips.reduce((acc, t) => acc + Math.max(0, t.endOdo - t.startOdo), 0);
  const today = new Date();
  const staleDays = lastTrip ? Math.floor((today.getTime() - lastTrip.startAt.getTime()) / 86_400_000) : null;

  return (
    <Stack spacing={2.5}>
      <KpiGrid columns={3}>
        <Kpi label={`Trips · ${format(budgetMonth, "MMM")}`} value={String(monthTrips.length)} sub={contract.label} />
        <Kpi label={`Miles · ${format(budgetMonth, "MMM")}`} value={formatMiles(monthMiles)} sub={`${totalTrips} trips on record`} />
        <Kpi
          label="Latest trip"
          value={lastTrip ? format(lastTrip.startAt, "d MMM") : "—"}
          sub={lastImport ? `Imported ${format(lastImport.importedAt, "d MMM")} · ${lastImport.filename}` : "Nothing imported yet"}
          tone={staleDays != null && staleDays > 14 ? "warning" : "neutral"}
        />
      </KpiGrid>
      {staleDays != null && staleDays > 14 ? (
        <Alert severity="warning">The latest trip on record is {staleDays} days old. Export the trip history from the car and import it below.</Alert>
      ) : null}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <ImportTripsDialog contractId={contract.id} />
        <LinkButton href="/mileage" arrow={false}>Mileage details</LinkButton>
      </Box>
    </Stack>
  );
}

// ── Step 5: allocation ──────────────────────────────────────────────────

function AllocationStep({ monthIso, budget }: { monthIso: string; budget: MonthBudget }) {
  const { incomeTotal, recurringTotal, eventsTotal, discretionary, hasIncome, suggested, percents, plan } = budget;
  const initial =
    plan && plan.savingsAmount != null && plan.investAmount != null && plan.freeAmount != null
      ? { savings: plan.savingsAmount, invest: plan.investAmount, free: plan.freeAmount }
      : null;

  return (
    <Stack spacing={3}>
      <Box sx={{ maxWidth: 480 }}>
        <StatRow label="Income" value={formatGBP(incomeTotal)} />
        <StatRow label="Recurring costs" value={`− ${formatGBP(recurringTotal)}`} />
        <StatRow label="Birthdays & events" value={`− ${formatGBP(eventsTotal)}`} />
        <StatRow label="Left over" value={formatGBP(discretionary)} total tone={discretionary < 0 ? "error.main" : undefined} />
      </Box>
      {!hasIncome ? (
        <Alert severity="info" action={<LinkButton href={setupHref(monthIso, "income")} arrow={false}>Add income</LinkButton>}>
          Record this month&apos;s income first — there&apos;s nothing to allocate yet.
        </Alert>
      ) : (
        <AllocationEditor
          monthIso={monthIso}
          discretionary={discretionary}
          suggested={suggested}
          percents={percents}
          initial={initial}
        />
      )}
    </Stack>
  );
}

function StatRow({ label, value, total, tone }: { label: string; value: string; total?: boolean; tone?: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        py: 0.75,
        borderTop: total ? "1px solid" : 0,
        borderColor: "divider",
        fontWeight: total ? 600 : 400,
      }}
    >
      <Typography variant="body2" component="span" sx={{ fontWeight: "inherit" }}>
        {label}
      </Typography>
      <Typography variant="body2" component="span" className="tabular" sx={{ fontWeight: "inherit", color: tone }}>
        {value}
      </Typography>
    </Box>
  );
}
