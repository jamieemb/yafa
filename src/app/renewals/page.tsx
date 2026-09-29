import { format } from "date-fns";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import {
  dueStatusFor,
  dueLabel,
  RENEWAL_RECURRENCE_LABELS,
  type DueStatus,
  type RenewalRecurrence,
} from "@/lib/admin";
import { PageHeader } from "@/components/page-header";
import { Kpi, KpiGrid } from "@/components/kpi";
import { EmptyState } from "@/components/empty-state";
import { DataList, Meta } from "@/components/data-list";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { RenewalDialog } from "./_components/renewal-dialog";
import { RenewButton } from "./_components/renew-button";
import { deleteRenewal } from "./actions";

export const dynamic = "force-dynamic";

type Renewal = Awaited<ReturnType<typeof prisma.renewal.findMany>>[number];

const STATUS_COLOR: Record<DueStatus, string> = {
  overdue: "error.main",
  "due-soon": "warning.main",
  upcoming: "text.secondary",
};

const STATUS_LABEL: Record<DueStatus, string> = {
  overdue: "Overdue",
  "due-soon": "Due soon",
  upcoming: "Upcoming",
};

// "in 12 days" → "In 12 days" for use as a standalone label.
function sentence(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function RenewalsPage() {
  const renewals = await prisma.renewal.findMany({
    orderBy: [{ dueDate: "asc" }],
  });

  const now = new Date();
  const active = renewals.filter((r) => r.active);
  const archived = renewals.filter((r) => !r.active);

  // Distinct subjects for the dialog's autocomplete.
  const subjectOptions = Array.from(
    new Set(renewals.map((r) => r.subject).filter((v): v is string => Boolean(v))),
  ).sort();

  // KPIs over the active set.
  let overdueCount = 0;
  let dueSoonCount = 0;
  let dueSoonCost = 0;
  let upcomingCount = 0;
  for (const r of active) {
    const { status } = dueStatusFor(r.dueDate, r.reminderDays, now);
    if (status === "overdue") overdueCount += 1;
    if (status === "due-soon") {
      dueSoonCount += 1;
      dueSoonCost += r.cost ?? 0;
    }
    if (status === "upcoming") upcomingCount += 1;
  }

  return (
    <>
      <PageHeader
        eyebrow="Life admin"
        title="Renewals"
        description="Insurance, MOT, service, tax and other dated obligations — sorted by what's next."
        actions={<RenewalDialog subjectOptions={subjectOptions} />}
      />

      <KpiGrid columns={3}>
        <Kpi
          label="Overdue"
          value={String(overdueCount)}
          sub={overdueCount > 0 ? "Needs attention" : "Nothing overdue"}
          tone={overdueCount > 0 ? "negative" : "muted"}
        />
        <Kpi
          label="Due soon"
          value={String(dueSoonCount)}
          sub={dueSoonCost > 0 ? `${formatGBP(dueSoonCost)} to pay` : "Inside reminder window"}
          tone={dueSoonCount > 0 ? "warning" : "muted"}
        />
        <Kpi label="Upcoming" value={String(upcomingCount)} sub={`of ${active.length} tracked`} />
      </KpiGrid>

      {active.length === 0 ? (
        <EmptyState
          icon={<EventAvailableOutlined fontSize="inherit" />}
          title="No renewals tracked yet"
          description="Add your insurance, MOT, service or tax dates to get a nudge before they're due."
          action={<RenewalDialog subjectOptions={subjectOptions} fabOnMobile={false} />}
        />
      ) : (
        <RenewalCard id="active" title="Tracked" rows={active} now={now} subjectOptions={subjectOptions} />
      )}

      {archived.length > 0 ? (
        <RenewalCard
          id="archived"
          title="Archived"
          caption="Done or paused"
          rows={archived}
          now={now}
          subjectOptions={subjectOptions}
          muted
        />
      ) : null}
    </>
  );
}

function DueCell({ dueDate, reminderDays, now }: { dueDate: Date; reminderDays: number; now: Date }) {
  const { status, days } = dueStatusFor(dueDate, reminderDays, now);
  const relative = dueLabel(days);
  return (
    <>
      <Typography variant="body2" className="tabular" sx={{ fontWeight: status === "upcoming" ? 400 : 500 }}>
        {format(dueDate, "d MMM yyyy")}
      </Typography>
      <Typography variant="caption" component="div" sx={{ color: STATUS_COLOR[status] }}>
        {status === "upcoming" ? sentence(relative) : `${STATUS_LABEL[status]} · ${relative}`}
      </Typography>
    </>
  );
}

interface RenewalCardProps {
  id: string;
  title: string;
  caption?: string;
  rows: Renewal[];
  now: Date;
  subjectOptions: string[];
  /** Fade every row (archived list). */
  muted?: boolean;
}

function RenewalCard({ id, title, caption, rows, now, subjectOptions, muted = false }: RenewalCardProps) {
  const headingId = `renewals-${id}`;
  return (
    <Card component="section" aria-labelledby={headingId}>
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
          <Typography id={headingId} variant="h5" component="h2" noWrap>
            {title}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={`${rows.length} renewal${rows.length === 1 ? "" : "s"}`}
          />
        </Box>
        {caption ? (
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            {caption}
          </Typography>
        ) : null}
      </Box>

      <DataList<Renewal>
        rows={rows}
        getKey={(r) => r.id}
        muted={muted ? () => true : undefined}
        columns={[
          {
            id: "title",
            header: "Renewal",
            render: (r) => (
              <>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {r.title}
                </Typography>
                {r.provider || r.reference ? (
                  <Typography variant="caption" color="text.secondary" component="div">
                    {[r.provider, r.reference].filter(Boolean).join(" · ")}
                  </Typography>
                ) : null}
              </>
            ),
          },
          {
            id: "category",
            header: "Category",
            render: (r) => <Chip size="small" variant="outlined" label={r.category} />,
          },
          { id: "subject", header: "Subject", render: (r) => r.subject ?? "—" },
          {
            id: "due",
            header: "Due",
            nowrap: true,
            render: (r) => <DueCell dueDate={r.dueDate} reminderDays={r.reminderDays} now={now} />,
          },
          {
            id: "cost",
            header: "Cost",
            align: "right",
            numeric: true,
            render: (r) => (r.cost != null ? formatGBP(r.cost) : "—"),
          },
          {
            id: "recurrence",
            header: "Recurrence",
            nowrap: true,
            render: (r) => RENEWAL_RECURRENCE_LABELS[r.recurrence as RenewalRecurrence] ?? r.recurrence,
          },
        ]}
        mobile={{
          title: (r) => r.title,
          meta: (r) => (
            <Meta>
              {r.category}
              {r.subject}
              {r.provider}
              {format(r.dueDate, "d MMM yyyy")}
            </Meta>
          ),
          value: (r) => {
            const { status, days } = dueStatusFor(r.dueDate, r.reminderDays, now);
            return (
              <Box component="span" sx={{ color: STATUS_COLOR[status] }}>
                {sentence(dueLabel(days))}
              </Box>
            );
          },
          valueSub: (r) => (r.cost != null ? formatGBP(r.cost) : null),
        }}
        actions={(r) => (
          <>
            <RenewButton id={r.id} title={r.title} recurrence={r.recurrence} dueDate={r.dueDate} />
            <RenewalDialog
              subjectOptions={subjectOptions}
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
            <ConfirmDeleteButton
              label={`Delete ${r.title}`}
              heading="Delete renewal?"
              description={`“${r.title}” will be permanently removed. This can't be undone.`}
              onConfirm={deleteRenewal.bind(null, r.id)}
            />
          </>
        )}
      />
    </Card>
  );
}
