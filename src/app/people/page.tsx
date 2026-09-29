import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import { IMPORTANCE_LABELS, type ImportanceLevel } from "@/lib/categories";
import { getSettings, giftAmountFor } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { Kpi, KpiGrid } from "@/components/kpi";
import { EmptyState } from "@/components/empty-state";
import { DataList, Meta } from "@/components/data-list";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PersonDialog } from "./_components/person-dialog";
import { deletePerson } from "./actions";

export const dynamic = "force-dynamic";

type Person = Awaited<ReturnType<typeof prisma.person.findMany>>[number];

const IMPORTANCE_RANK: Record<ImportanceLevel, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

// Tier cards in display order (most important first).
const TIERS: ImportanceLevel[] = ["HIGH", "MEDIUM", "LOW"];

function nextBirthday(birthday: Date, today: Date): Date {
  const thisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
  if (thisYear.getTime() < today.getTime()) {
    return new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
  }
  return thisYear;
}

function daysLabel(n: number): string {
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `In ${n} days`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const chars = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return chars.toUpperCase();
}

export default async function PeoplePage() {
  const [people, settings] = await Promise.all([prisma.person.findMany(), getSettings()]);

  const giftAmounts = {
    LOW: settings.giftLow,
    MEDIUM: settings.giftMedium,
    HIGH: settings.giftHigh,
  };

  const sorted = [...people].sort((a, b) => {
    const r =
      IMPORTANCE_RANK[a.importance as ImportanceLevel] - IMPORTANCE_RANK[b.importance as ImportanceLevel];
    if (r !== 0) return r;
    return a.name.localeCompare(b.name);
  });

  // Headline: combined annual gift outflow at current importance tiers.
  const annualBudget = sorted.reduce(
    (acc, p) => acc + giftAmountFor(settings, p.importance as ImportanceLevel),
    0,
  );
  const withBirthday = sorted.filter((p) => p.birthday).length;

  const today = startOfDay(new Date());
  const daysUntil = (p: Person): number | null =>
    p.birthday ? differenceInCalendarDays(nextBirthday(p.birthday, today), today) : null;

  // Whose birthday comes round next.
  const nextUp = sorted
    .filter((p) => p.birthday)
    .map((p) => ({ person: p, days: daysUntil(p) as number }))
    .sort((a, b) => a.days - b.days)[0];

  const tiers = TIERS.map((tier) => ({
    tier,
    rows: sorted.filter((p) => p.importance === tier),
  })).filter((t) => t.rows.length > 0);

  const newDialog = <PersonDialog giftAmounts={giftAmounts} />;

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        title="People"
        description="Whose birthdays to remember and how much to budget per importance tier."
        actions={newDialog}
      />

      <KpiGrid columns={3}>
        <Kpi
          label="Annual gift budget"
          value={formatGBP(annualBudget)}
          sub="Across all tiers"
          emphasised
          size="lg"
        />
        <Kpi
          label="People"
          value={String(sorted.length)}
          sub={`${withBirthday} birthday${withBirthday === 1 ? "" : "s"}`}
        />
        <Kpi
          label="Next birthday"
          value={nextUp ? format(nextBirthday(nextUp.person.birthday as Date, today), "d MMM") : "—"}
          sub={nextUp ? `${nextUp.person.name} · ${daysLabel(nextUp.days)}` : "No birthdays yet"}
        />
      </KpiGrid>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<PeopleOutlined fontSize="inherit" />}
          title="No people yet"
          description="Add someone to start tracking birthdays and gift budgets."
          action={<PersonDialog giftAmounts={giftAmounts} fabOnMobile={false} />}
        />
      ) : (
        <Stack spacing={2}>
          {tiers.map(({ tier, rows }) => {
            const budget = giftAmountFor(settings, tier);
            return (
              <Card key={tier} component="section" aria-labelledby={`tier-${tier}`}>
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
                    <Typography id={`tier-${tier}`} variant="h5" component="h2" noWrap>
                      {IMPORTANCE_LABELS[tier]} importance
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${rows.length} ${rows.length === 1 ? "person" : "people"}`}
                    />
                  </Box>
                  <Typography variant="h5" component="p" className="tabular" sx={{ whiteSpace: "nowrap" }}>
                    {formatGBP(budget)}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      per gift
                    </Typography>
                  </Typography>
                </Box>

                <DataList<Person>
                  rows={rows}
                  getKey={(r) => r.id}
                  columns={[
                    {
                      id: "name",
                      header: "Name",
                      render: (r) => (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                          <PersonAvatar name={r.name} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {r.name}
                            </Typography>
                            {r.notes ? (
                              <Typography variant="caption" color="text.secondary" component="p">
                                {r.notes}
                              </Typography>
                            ) : null}
                          </Box>
                        </Box>
                      ),
                    },
                    {
                      id: "birthday",
                      header: "Birthday",
                      nowrap: true,
                      render: (r) => (r.birthday ? format(r.birthday, "d MMM") : "—"),
                    },
                    {
                      id: "next",
                      header: "Next",
                      nowrap: true,
                      render: (r) => {
                        const d = daysUntil(r);
                        return d === null ? "—" : daysLabel(d);
                      },
                    },
                    {
                      id: "budget",
                      header: "Gift budget",
                      align: "right",
                      numeric: true,
                      render: (r) => (
                        <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                          {formatGBP(giftAmountFor(settings, r.importance as ImportanceLevel))}
                        </Typography>
                      ),
                    },
                  ]}
                  mobile={{
                    title: (r) => (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <PersonAvatar name={r.name} />
                        {r.name}
                      </Box>
                    ),
                    meta: (r) => {
                      const d = daysUntil(r);
                      return (
                        <Meta>
                          {r.birthday ? format(r.birthday, "d MMM") : "No birthday"}
                          {d !== null ? daysLabel(d) : null}
                          {r.notes}
                        </Meta>
                      );
                    },
                    value: (r) => formatGBP(giftAmountFor(settings, r.importance as ImportanceLevel)),
                  }}
                  actions={(r) => (
                    <>
                      <PersonDialog
                        giftAmounts={giftAmounts}
                        initial={{
                          id: r.id,
                          name: r.name,
                          importance: r.importance,
                          birthday: r.birthday,
                          notes: r.notes,
                        }}
                      />
                      <ConfirmDeleteButton
                        label={`Remove ${r.name}`}
                        heading={`Remove ${r.name}?`}
                        description="Their birthday will stop appearing on the calendar."
                        successMessage="Removed"
                        onConfirm={deletePerson.bind(null, r.id)}
                      />
                    </>
                  )}
                />
              </Card>
            );
          })}
        </Stack>
      )}
    </>
  );
}

/** Initials on a primary-container disc. */
function PersonAvatar({ name }: { name: string }) {
  return (
    <Avatar
      sx={{
        width: 32,
        height: 32,
        fontSize: "0.8125rem",
        fontWeight: 500,
        bgcolor: "m3.primaryContainer",
        color: "m3.onPrimaryContainer",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </Avatar>
  );
}
