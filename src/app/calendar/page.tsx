import Link from "next/link";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { Cake, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import {
  IMPORTANCE_LABELS,
  type ImportanceLevel,
} from "@/lib/categories";
import { getSettings, giftAmountFor, resolveEventAmount } from "@/lib/settings";
import { Kpi } from "@/components/kpi";
import { EventDialog } from "./_components/event-dialog";
import { DeleteEventButton } from "./_components/delete-event-button";

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

export default async function CalendarPage() {
  const [events, people, settings] = await Promise.all([
    prisma.calendarEvent.findMany(),
    prisma.person.findMany({ where: { birthday: { not: null } } }),
    getSettings(),
  ]);

  const today = startOfDay(new Date());
  const giftAmounts = {
    LOW: settings.giftLow,
    MEDIUM: settings.giftMedium,
    HIGH: settings.giftHigh,
  };

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

  const totalUpcoming = upcoming.reduce(
    (acc, e) => acc + e.effectiveAmount,
    0,
  );
  const next30 = upcoming.filter((e) => e.daysUntil <= 30);
  const totalNext30 = next30.reduce((acc, e) => acc + e.effectiveAmount, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="label-eyebrow">Looking ahead</p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Calendar
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Birthdays come from{" "}
            <Link href="/people" className="text-primary hover:underline underline-offset-4">
              People
            </Link>
            . Use Add event for parties, anniversaries, one-off purchases.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="grid grid-cols-2 gap-3 min-w-[300px]">
            <Kpi
              label="Next 30 days"
              value={formatGBP(totalNext30)}
              sub={`${next30.length} item${next30.length === 1 ? "" : "s"}`}
            />
            <Kpi
              label="All upcoming"
              value={formatGBP(totalUpcoming)}
              sub={`${upcoming.length} item${upcoming.length === 1 ? "" : "s"}`}
            />
          </div>
          <EventDialog giftAmounts={giftAmounts} />
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Nothing upcoming. Add a person with a birthday or an event to start
            budgeting ahead.
          </p>
          <div className="flex justify-center gap-2">
            <Link
              href="/people"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[13px] hover:bg-accent/50"
            >
              Add a person
            </Link>
            <EventDialog
              giftAmounts={giftAmounts}
              triggerVariant="outline"
              triggerLabel="Add event"
            />
          </div>
        </div>
      ) : (
        <ul className="rounded-md border bg-card divide-y">
          {upcoming.map((e) => (
            <EntryRow key={e.key} entry={e} giftAmounts={giftAmounts} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  giftAmounts,
}: {
  entry: UpcomingEntry;
  giftAmounts: { LOW: number; MEDIUM: number; HIGH: number };
}) {
  const Icon = entry.kind === "BIRTHDAY" ? Cake : CalendarDays;
  const daysLabel =
    entry.daysUntil === 0
      ? "Today"
      : entry.daysUntil === 1
        ? "Tomorrow"
        : `${entry.daysUntil} days`;
  const dateLabel = format(entry.nextDate, "EEE d MMM yyyy");
  const isOverridden = entry.kind === "EVENT" && entry.amount !== null;

  return (
    <li className="grid grid-cols-[44px_84px_1fr_auto_auto_auto] items-center gap-4 px-5 py-3">
      <div
        className={`flex items-center justify-center size-9 rounded-md ${
          entry.kind === "BIRTHDAY"
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0">
        <p className="font-mono text-[13px] tabular-nums tracking-tight">
          {daysLabel}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mt-0.5">
          {dateLabel}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-[14px] font-medium truncate">
          {entry.title}
          {entry.kind === "BIRTHDAY" ? (
            <span className="ml-2 inline-block rounded-sm bg-primary/15 text-primary text-[9px] uppercase tracking-wider font-medium px-1 py-0.5 align-middle">
              Birthday
            </span>
          ) : entry.recursAnnually ? (
            <span className="ml-2 inline-block rounded-sm bg-muted text-muted-foreground text-[9px] uppercase tracking-wider font-medium px-1 py-0.5 align-middle">
              Annual
            </span>
          ) : null}
        </p>
        {(entry.kind === "EVENT" && (entry.person || entry.notes)) ||
        (entry.kind === "BIRTHDAY" && entry.notes) ? (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {entry.kind === "BIRTHDAY"
              ? entry.notes
              : [entry.person, entry.notes].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>

      {entry.importance ? (
        <ImportancePill level={entry.importance} />
      ) : (
        <span />
      )}

      <div className="text-right tabular-nums w-24">
        {entry.effectiveAmount > 0 ? (
          <p className="font-mono text-[14px]">
            {formatGBP(entry.effectiveAmount)}
          </p>
        ) : (
          <span className="text-[11px] text-muted-foreground">No budget</span>
        )}
        {isOverridden && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">
            Override
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {entry.kind === "EVENT" && entry.eventInitial ? (
          <>
            <EventDialog
              giftAmounts={giftAmounts}
              triggerVariant="ghost"
              initial={entry.eventInitial}
            />
            <DeleteEventButton
              id={entry.eventInitial.id}
              title={entry.eventInitial.title}
            />
          </>
        ) : (
          <Link
            href="/people"
            className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground px-2"
          >
            Manage →
          </Link>
        )}
      </div>
    </li>
  );
}

function ImportancePill({ level }: { level: ImportanceLevel }) {
  const tone =
    level === "HIGH"
      ? "bg-primary/15 text-primary"
      : level === "MEDIUM"
        ? "bg-accent/20 text-accent-foreground"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={`rounded-sm text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 ${tone}`}
    >
      {IMPORTANCE_LABELS[level]}
    </span>
  );
}

