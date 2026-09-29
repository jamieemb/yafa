import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CakeOutlined from "@mui/icons-material/CakeOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import { IMPORTANCE_LABELS, type ImportanceLevel } from "@/lib/categories";
import { getSettings, giftAmountFor, resolveEventAmount } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { Kpi, KpiGrid } from "@/components/kpi";
import { EmptyState } from "@/components/empty-state";
import { DataList, Meta } from "@/components/data-list";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EventDialog } from "./_components/event-dialog";
import { PeopleLink } from "./_components/people-link";
import { deleteCalendarEvent } from "./actions";

export const dynamic = "force-dynamic";

type EntryKind = "BIRTHDAY" | "EVENT";

interface UpcomingEntry {
  key: string;
  kind: EntryKind;
  title: string;
  originalDate: Date;
  nextDate: Date;
  daysUntil: number;
  recursAnnually: boolean;
  importance: ImportanceLevel | null;
  amount: number | null;
  effectiveAmount: number;
  person: string | null;
  notes: string | null;
  // Only on EVENT entries — these get inline edit/delete actions.
  eventInitial?: {
    id: string;
    title: string;
    date: Date;
    recursAnnually: boolean;
    importance: string | null;
    amount: number | null;
    person: string | null;
    notes: string | null;
  };
  // Only on BIRTHDAY entries — link target for editing the person.
  personId?: string;
}

function nextOccurrence(date: Date, recursAnnually: boolean): Date {
  const today = startOfDay(new Date());
  if (!recursAnnually) return date;
  const thisYear = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if (thisYear.getTime() < today.getTime()) {
    return new Date(today.getFullYear() + 1, date.getMonth(), date.getDate());
  }
  return thisYear;
}

function daysLabel(n: number): string {
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `In ${n} days`;
}

function countLabel(n: number): string {
  return `${n} item${n === 1 ? "" : "s"}`;
}

interface MonthGroup {
  label: string;
  entries: UpcomingEntry[];
  total: number;
}

export default async function CalendarPage() {
  const [events, people, settings] = await Promise.all([
    prisma.calendarEvent.findMany(),
    // Every person is loaded: those with a birthday become calendar
    // entries, and all names are offered as suggestions in the event form.
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    getSettings(),
  ]);

  const today = startOfDay(new Date());
  const giftAmounts = {
    LOW: settings.giftLow,
    MEDIUM: settings.giftMedium,
    HIGH: settings.giftHigh,
  };
  const personOptions = Array.from(new Set(people.map((p) => p.name))).sort();

  // Compose: manual events + auto-derived birthdays
  const eventEntries: UpcomingEntry[] = events.map((e) => {
    const nextDate = nextOccurrence(e.date, e.recursAnnually);
    const importance = (e.importance ?? null) as ImportanceLevel | null;
    return {
      key: `event:${e.id}`,
      kind: "EVENT",
      title: e.title,
      originalDate: e.date,
      nextDate,
      daysUntil: differenceInCalendarDays(nextDate, today),
      recursAnnually: e.recursAnnually,
      importance,
      amount: e.amount,
      effectiveAmount: resolveEventAmount(settings, e.amount, importance),
      person: e.person,
      notes: e.notes,
      eventInitial: {
        id: e.id,
        title: e.title,
        date: e.date,
        recursAnnually: e.recursAnnually,
        importance: e.importance,
        amount: e.amount,
        person: e.person,
        notes: e.notes,
      },
    };
  });

  const birthdayEntries: UpcomingEntry[] = people
    .filter((p) => p.birthday)
    .map((p) => {
      const importance = p.importance as ImportanceLevel;
      const nextDate = nextOccurrence(p.birthday as Date, true);
      return {
        key: `person:${p.id}`,
        kind: "BIRTHDAY",
        title: `${p.name}'s birthday`,
        originalDate: p.birthday as Date,
        nextDate,
        daysUntil: differenceInCalendarDays(nextDate, today),
        recursAnnually: true,
        importance,
        amount: null,
        effectiveAmount: giftAmountFor(settings, importance),
        person: p.name,
        notes: p.notes,
        personId: p.id,
      };
    });

  const upcoming = [...eventEntries, ...birthdayEntries]
    .filter((e) => e.daysUntil >= 0)
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());

  const totalUpcoming = upcoming.reduce((acc, e) => acc + e.effectiveAmount, 0);
  const next30 = upcoming.filter((e) => e.daysUntil <= 30);
  const totalNext30 = next30.reduce((acc, e) => acc + e.effectiveAmount, 0);
  const next90 = upcoming.filter((e) => e.daysUntil <= 90);
  const totalNext90 = next90.reduce((acc, e) => acc + e.effectiveAmount, 0);

  // Group chronologically by the month of the next occurrence. `upcoming`
  // is already sorted, so Map insertion order is the display order.
  const months = new Map<string, MonthGroup>();
  for (const e of upcoming) {
    const key = format(e.nextDate, "yyyy-MM");
    let group = months.get(key);
    if (!group) {
      group = { label: format(e.nextDate, "MMMM yyyy"), entries: [], total: 0 };
      months.set(key, group);
    }
    group.entries.push(e);
    group.total += e.effectiveAmount;
  }

  const newDialog = <EventDialog giftAmounts={giftAmounts} personOptions={personOptions} />;

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        title="Calendar"
        description="Birthdays come from People. Add events for parties, anniversaries and one-off purchases; importance fills in the budget from your settings."
        actions={newDialog}
      />

      <KpiGrid columns={3}>
        <Kpi
          label="Next 30 days"
          value={formatGBP(totalNext30)}
          sub={countLabel(next30.length)}
          emphasised
          size="lg"
        />
        <Kpi label="Next 90 days" value={formatGBP(totalNext90)} sub={countLabel(next90.length)} />
        <Kpi label="All upcoming" value={formatGBP(totalUpcoming)} sub={countLabel(upcoming.length)} />
      </KpiGrid>

      {upcoming.length === 0 ? (
        <EmptyState
          icon={<CakeOutlined fontSize="inherit" />}
          title="Nothing upcoming"
          description="Add a person with a birthday, or an event, to start budgeting ahead."
          action={
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: "center" }}>
              <PeopleLink variant="button" label="Add a person" />
              <EventDialog giftAmounts={giftAmounts} personOptions={personOptions} fabOnMobile={false} />
            </Stack>
          }
        />
      ) : (
        <Stack spacing={2}>
          {Array.from(months.entries()).map(([key, month]) => (
            <Card key={key} component="section" aria-labelledby={`month-${key}`}>
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                  <Typography id={`month-${key}`} variant="h5" component="h2" noWrap>
                    {month.label}
                  </Typography>
                  <Chip size="small" variant="outlined" label={countLabel(month.entries.length)} />
                </Box>
                <Typography variant="h5" component="p" className="tabular" sx={{ whiteSpace: "nowrap" }}>
                  {formatGBP(month.total)}
                </Typography>
              </Box>

              <DataList<UpcomingEntry>
                rows={month.entries}
                getKey={(r) => r.key}
                columns={[
                  {
                    id: "date",
                    header: "Date",
                    nowrap: true,
                    render: (r) => (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <DateBadge date={r.nextDate} />
                        <Box>
                          <Typography variant="body2" component="p">
                            {format(r.nextDate, "EEEE")}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="p">
                            {daysLabel(r.daysUntil)}
                          </Typography>
                        </Box>
                      </Box>
                    ),
                  },
                  {
                    id: "title",
                    header: "Title",
                    render: (r) => {
                      const sub = [
                        r.kind === "EVENT" && r.recursAnnually ? "Repeats yearly" : null,
                        r.notes,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {r.title}
                          </Typography>
                          {sub ? (
                            <Typography variant="caption" color="text.secondary" component="p">
                              {sub}
                            </Typography>
                          ) : null}
                        </>
                      );
                    },
                  },
                  { id: "kind", header: "Kind", render: (r) => <KindChip kind={r.kind} /> },
                  { id: "person", header: "Person", render: (r) => r.person ?? "—" },
                  {
                    id: "importance",
                    header: "Importance",
                    render: (r) => <ImportanceChip level={r.importance} />,
                  },
                  {
                    id: "amount",
                    header: "Budget",
                    align: "right",
                    numeric: true,
                    render: (r) => <AmountCell entry={r} />,
                  },
                ]}
                mobile={{
                  title: (r) => r.title,
                  meta: (r) => (
                    <Meta>
                      {format(r.nextDate, "EEE d MMM")}
                      {daysLabel(r.daysUntil)}
                      {r.kind === "EVENT" ? r.person : null}
                      {r.kind === "BIRTHDAY" ? "Birthday" : "Event"}
                    </Meta>
                  ),
                  value: (r) =>
                    r.effectiveAmount > 0 ? (
                      formatGBP(r.effectiveAmount)
                    ) : (
                      <Typography component="span" variant="caption" color="text.secondary">
                        No budget
                      </Typography>
                    ),
                  valueSub: (r) =>
                    r.kind === "EVENT" && r.amount !== null
                      ? "Override"
                      : r.importance
                        ? `${IMPORTANCE_LABELS[r.importance]} tier`
                        : null,
                }}
                actions={(r) =>
                  r.kind === "EVENT" && r.eventInitial ? (
                    <>
                      <EventDialog
                        giftAmounts={giftAmounts}
                        personOptions={personOptions}
                        initial={r.eventInitial}
                      />
                      <ConfirmDeleteButton
                        label={`Delete ${r.title}`}
                        heading="Delete event?"
                        description={`“${r.title}” will be permanently removed. This can't be undone.`}
                        onConfirm={deleteCalendarEvent.bind(null, r.eventInitial.id)}
                      />
                    </>
                  ) : (
                    <PeopleLink />
                  )
                }
              />
            </Card>
          ))}
        </Stack>
      )}
    </>
  );
}

/** Day number over short month on a secondary-container tile. */
function DateBadge({ date }: { date: Date }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 44,
        height: 44,
        borderRadius: "8px",
        bgcolor: "m3.secondaryContainer",
        color: "m3.onSecondaryContainer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Typography component="span" variant="subtitle1" className="tabular" sx={{ lineHeight: 1.1 }}>
        {format(date, "d")}
      </Typography>
      <Typography component="span" variant="caption" sx={{ lineHeight: 1.1, fontSize: "0.6875rem" }}>
        {format(date, "MMM")}
      </Typography>
    </Box>
  );
}

function KindChip({ kind }: { kind: EntryKind }) {
  return kind === "BIRTHDAY" ? (
    <Chip size="small" icon={<CakeOutlined />} label="Birthday" />
  ) : (
    <Chip size="small" variant="outlined" icon={<EventOutlined />} label="Event" />
  );
}

function ImportanceChip({ level }: { level: ImportanceLevel | null }) {
  if (!level) {
    return (
      <Typography variant="body2" color="text.secondary" component="span">
        —
      </Typography>
    );
  }
  return (
    <Chip
      size="small"
      variant="outlined"
      color={level === "HIGH" ? "primary" : "default"}
      label={IMPORTANCE_LABELS[level]}
    />
  );
}

function AmountCell({ entry }: { entry: UpcomingEntry }) {
  const isOverridden = entry.kind === "EVENT" && entry.amount !== null;
  return (
    <>
      {entry.effectiveAmount > 0 ? (
        <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
          {formatGBP(entry.effectiveAmount)}
        </Typography>
      ) : (
        <Typography variant="caption" color="text.secondary" component="span">
          No budget
        </Typography>
      )}
      {isOverridden ? (
        <Typography variant="caption" color="text.secondary" component="p">
          Override
        </Typography>
      ) : null}
    </>
  );
}
