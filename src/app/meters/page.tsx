import { format } from "date-fns";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import BoltOutlined from "@mui/icons-material/BoltOutlined";
import LocalFireDepartmentOutlined from "@mui/icons-material/LocalFireDepartmentOutlined";
import SpeedOutlined from "@mui/icons-material/SpeedOutlined";
import WaterDropOutlined from "@mui/icons-material/WaterDropOutlined";
import { prisma } from "@/lib/db";
import { formatReading } from "@/lib/admin";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DataList, Meta } from "@/components/data-list";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ReadingDialog, type MeterOption } from "./_components/reading-dialog";
import { deleteReading } from "./actions";

export const dynamic = "force-dynamic";

type Reading = Awaited<ReturnType<typeof prisma.meterReading.findMany>>[number];

interface AnnotatedReading {
  row: Reading;
  /** Usage since the prior reading (null for the first). */
  delta: number | null;
  /** Whole days since the prior reading (null for the first). */
  sinceDays: number | null;
}

interface MeterGroup {
  meter: string;
  unit: string | null;
  /** Chronological ascending. */
  readings: AnnotatedReading[];
}

function meterGlyph(meter: string) {
  const m = meter.toLowerCase();
  if (/elec|power/.test(m)) return <BoltOutlined />;
  if (/gas/.test(m)) return <LocalFireDepartmentOutlined />;
  if (/water/.test(m)) return <WaterDropOutlined />;
  return <SpeedOutlined />;
}

function daysBetween(a: Date, b: Date): number {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((da - db) / 86_400_000);
}

// "+123 kWh" / "-4 m³"
function signed(n: number, unit: string | null): string {
  return `${n >= 0 ? "+" : ""}${formatReading(n, unit)}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export default async function MetersPage() {
  const all = await prisma.meterReading.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  // Group by meter, annotating each reading with usage since the prior one.
  const byMeter = new Map<string, MeterGroup>();
  for (const row of all) {
    let group = byMeter.get(row.meter);
    if (!group) {
      group = { meter: row.meter, unit: row.unit, readings: [] };
      byMeter.set(row.meter, group);
    }
    const prev = group.readings[group.readings.length - 1];
    group.readings.push({
      row,
      delta: prev ? row.value - prev.row.value : null,
      sinceDays: prev ? daysBetween(row.date, prev.row.date) : null,
    });
    // Keep the most recent non-empty unit for the meter header.
    if (row.unit) group.unit = row.unit;
  }

  const groups = Array.from(byMeter.values()).sort((a, b) => a.meter.localeCompare(b.meter));
  const meterOptions: MeterOption[] = groups.map((g) => ({ meter: g.meter, unit: g.unit }));

  return (
    <>
      <PageHeader
        eyebrow="Life admin"
        title="Meter readings"
        description="Log gas, electric, water — or anything cumulative. Usage is the difference between readings."
        actions={<ReadingDialog meterOptions={meterOptions} />}
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={<SpeedOutlined fontSize="inherit" />}
          title="No readings yet"
          description="Add your first electricity, gas or water reading to start tracking usage."
          action={<ReadingDialog meterOptions={meterOptions} fabOnMobile={false} />}
        />
      ) : (
        <Stack spacing={2}>
          {groups.map((group, i) => (
            <MeterCard key={group.meter} group={group} index={i} />
          ))}
        </Stack>
      )}
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="overline" component="p" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" component="p" className="tabular" sx={{ mt: 0.5 }}>
        {value}
      </Typography>
      {sub ? (
        <Typography variant="caption" component="p" color="text.secondary">
          {sub}
        </Typography>
      ) : null}
    </Box>
  );
}

function MeterCard({ group, index }: { group: MeterGroup; index: number }) {
  const ascending = group.readings;
  const latest = ascending[ascending.length - 1];
  const sinceDays = latest.sinceDays ?? 0;
  const perDay = latest.delta != null && sinceDays > 0 ? latest.delta / sinceDays : null;

  // Most-recent-first for display.
  const rows = [...ascending].reverse();
  const headingId = `meter-${index}`;

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
          <Box
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              bgcolor: "m3.primaryContainer",
              color: "m3.onPrimaryContainer",
              flexShrink: 0,
            }}
          >
            {meterGlyph(group.meter)}
          </Box>
          <Typography id={headingId} variant="h5" component="h2" noWrap>
            {group.meter}
          </Typography>
          {group.unit ? <Chip size="small" variant="outlined" label={group.unit} /> : null}
        </Box>
        <ReadingDialog trigger="icon" defaultMeter={group.meter} defaultUnit={group.unit ?? undefined} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" },
          alignItems: "end",
          px: 2,
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" component="p" color="text.secondary">
            Latest reading
          </Typography>
          <Typography variant="h3" component="p" className="tabular" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>
            {formatReading(latest.row.value, group.unit)}
          </Typography>
          <Typography variant="caption" component="p" color="text.secondary">
            {format(latest.row.date, "d MMM yyyy")} · {plural(ascending.length, "reading")}
          </Typography>
        </Box>

        {latest.delta != null ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, justifySelf: { sm: "end" } }}>
            <Stat
              label="Since previous"
              value={signed(latest.delta, group.unit)}
              sub={`over ${plural(sinceDays, "day")}`}
            />
            {perDay != null ? (
              <Stat
                label="Average"
                value={formatReading(Math.round(perDay * 100) / 100, group.unit)}
                sub="per day"
              />
            ) : null}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            First reading — add another to see usage.
          </Typography>
        )}
      </Box>

      <DataList<AnnotatedReading>
        rows={rows}
        getKey={(r) => r.row.id}
        columns={[
          {
            id: "date",
            header: "Date",
            nowrap: true,
            render: (r) => format(r.row.date, "d MMM yyyy"),
          },
          {
            id: "value",
            header: "Reading",
            align: "right",
            numeric: true,
            nowrap: true,
            render: (r) => (
              <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                {formatReading(r.row.value, group.unit)}
              </Typography>
            ),
          },
          {
            id: "delta",
            header: "Usage",
            align: "right",
            numeric: true,
            nowrap: true,
            render: (r) =>
              r.delta == null ? (
                "—"
              ) : (
                <Box component="span" sx={{ color: r.delta < 0 ? "error.main" : undefined }}>
                  {signed(r.delta, group.unit)}
                </Box>
              ),
          },
          {
            id: "days",
            header: "Days",
            align: "right",
            numeric: true,
            render: (r) => (r.sinceDays == null ? "—" : String(r.sinceDays)),
          },
          {
            id: "notes",
            header: "Notes",
            render: (r) =>
              r.row.notes ? (
                <Typography variant="body2" color="text.secondary">
                  {r.row.notes}
                </Typography>
              ) : (
                ""
              ),
          },
        ]}
        mobile={{
          title: (r) => formatReading(r.row.value, group.unit),
          meta: (r) => (
            <Meta>
              {format(r.row.date, "d MMM yyyy")}
              {r.sinceDays != null ? `${plural(r.sinceDays, "day")} since previous` : null}
              {r.row.notes}
            </Meta>
          ),
          value: (r) =>
            r.delta == null ? (
              "—"
            ) : (
              <Box component="span" sx={{ color: r.delta < 0 ? "error.main" : undefined }}>
                {signed(r.delta, group.unit)}
              </Box>
            ),
          valueSub: (r) => (r.delta == null ? "First reading" : null),
        }}
        actions={(r) => {
          const when = format(r.row.date, "d MMM yyyy");
          return (
            <ConfirmDeleteButton
              label={`Delete ${group.meter} reading from ${when}`}
              heading="Delete reading?"
              description={`The ${group.meter} reading from ${when} will be permanently removed. Usage for the following reading will be recalculated.`}
              successMessage="Reading deleted"
              onConfirm={deleteReading.bind(null, r.row.id)}
            />
          );
        }}
      />
    </Card>
  );
}
