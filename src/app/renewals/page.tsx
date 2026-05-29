import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import {
  dueStatusFor,
  dueLabel,
  RENEWAL_RECURRENCE_LABELS,
  type DueStatus,
  type RenewalRecurrence,
} from "@/lib/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Kpi } from "@/components/kpi";
import { RenewalDialog } from "./_components/renewal-dialog";
import { DeleteRenewalButton } from "./_components/delete-renewal-button";
import { RenewButton } from "./_components/renew-button";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<DueStatus, string> = {
  overdue: "bg-negative/10 text-negative",
  "due-soon": "bg-primary/10 text-primary",
  upcoming: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<DueStatus, string> = {
  overdue: "Overdue",
  "due-soon": "Due soon",
  upcoming: "Upcoming",
};

export default async function RenewalsPage() {
  const renewals = await prisma.renewal.findMany({
    orderBy: [{ dueDate: "asc" }],
  });

  const now = new Date();
  const active = renewals.filter((r) => r.active);
  const archived = renewals.filter((r) => !r.active);

  // Distinct subjects for the dialog's autocomplete.
  const subjectOptions = Array.from(
    new Set(
      renewals
        .map((r) => r.subject)
        .filter((v): v is string => Boolean(v)),
    ),
  ).sort();

  // KPIs over the active set.
  let dueSoonCount = 0;
  let dueSoonCost = 0;
  let overdueCount = 0;
  for (const r of active) {
    const { status } = dueStatusFor(r.dueDate, r.reminderDays, now);
    if (status === "overdue") overdueCount += 1;
    if (status === "due-soon") {
      dueSoonCount += 1;
      dueSoonCost += r.cost ?? 0;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="label-eyebrow">Life admin</p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Renewals
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Insurance, MOT, service, tax and other dated obligations — sorted
            by what&apos;s next.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="grid grid-cols-3 gap-3 min-w-[400px]">
            <Kpi label="Tracked" value={String(active.length)} />
            <Kpi
              label="Due soon"
              value={String(dueSoonCount)}
              sub={dueSoonCost > 0 ? formatGBP(dueSoonCost) : undefined}
              tone={dueSoonCount > 0 ? "primary" : "muted"}
            />
            <Kpi
              label="Overdue"
              value={String(overdueCount)}
              tone={overdueCount > 0 ? "negative" : "muted"}
            />
          </div>
          <RenewalDialog subjectOptions={subjectOptions} />
        </div>
      </div>

      {active.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 flex flex-col items-center gap-3 text-center">
          <CalendarClock className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No renewals tracked yet. Add your insurance, MOT, service or tax
            dates to get reminders.
          </p>
        </div>
      ) : (
        <RenewalTable rows={active} now={now} subjectOptions={subjectOptions} />
      )}

      {archived.length > 0 ? (
        <section className="space-y-3">
          <p className="label-eyebrow">Archived · {archived.length}</p>
          <div className="opacity-60">
            <RenewalTable
              rows={archived}
              now={now}
              subjectOptions={subjectOptions}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

type RenewalRow = Awaited<
  ReturnType<typeof prisma.renewal.findMany>
>[number];

function RenewalTable({
  rows,
  now,
  subjectOptions,
}: {
  rows: RenewalRow[];
  now: Date;
  subjectOptions: string[];
}) {
  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <TableHead className="h-9 w-44">Due</TableHead>
            <TableHead className="h-9">Title</TableHead>
            <TableHead className="h-9">Category</TableHead>
            <TableHead className="h-9">Recurrence</TableHead>
            <TableHead className="h-9 text-right">Cost</TableHead>
            <TableHead className="h-9" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const { status, days } = dueStatusFor(
              r.dueDate,
              r.reminderDays,
              now,
            );
            return (
              <TableRow key={r.id}>
                <TableCell className="align-top">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`w-fit rounded-sm text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 ${STATUS_PILL[status]}`}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                    <span className="text-[12px] tabular-nums whitespace-nowrap">
                      {format(r.dueDate, "d MMM yyyy")}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {dueLabel(days)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-[13px] font-medium align-top">
                  {r.title}
                  {r.subject || r.provider ? (
                    <div className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                      {[r.subject, r.provider].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                  {r.reference ? (
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">
                      {r.reference}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="align-top">
                  <span className="rounded-sm bg-muted text-muted-foreground text-[10px] uppercase tracking-wider px-1.5 py-0.5">
                    {r.category}
                  </span>
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground align-top">
                  {RENEWAL_RECURRENCE_LABELS[
                    r.recurrence as RenewalRecurrence
                  ] ?? r.recurrence}
                </TableCell>
                <TableCell className="text-right tabular-nums font-mono text-[13px] align-top">
                  {r.cost != null ? formatGBP(r.cost) : "—"}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex items-center justify-end gap-1">
                    <RenewButton
                      id={r.id}
                      recurrence={r.recurrence}
                      dueDate={r.dueDate}
                    />
                    <RenewalDialog
                      subjectOptions={subjectOptions}
                      triggerVariant="ghost"
                      initial={{
                        id: r.id,
                        title: r.title,
                        category: r.category,
                        subject: r.subject,
                        provider: r.provider,
                        reference: r.reference,
                        dueDate: r.dueDate,
                        cost: r.cost,
                        recurrence: r.recurrence,
                        reminderDays: r.reminderDays,
                        notes: r.notes,
                        active: r.active,
                      }}
                    />
                    <DeleteRenewalButton id={r.id} title={r.title} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
