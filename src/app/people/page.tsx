import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { formatGBP } from "@/lib/money";
import {
  IMPORTANCE_LABELS,
  IMPORTANCE_LEVELS,
  type ImportanceLevel,
} from "@/lib/categories";
import { getSettings, giftAmountFor } from "@/lib/settings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Kpi } from "@/components/kpi";
import { PersonDialog } from "./_components/person-dialog";
import { DeletePersonButton } from "./_components/delete-person-button";

export const dynamic = "force-dynamic";

const IMPORTANCE_RANK: Record<ImportanceLevel, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export default async function PeoplePage() {
  const [people, settings] = await Promise.all([
    prisma.person.findMany(),
    getSettings(),
  ]);

  const giftAmounts = {
    LOW: settings.giftLow,
    MEDIUM: settings.giftMedium,
    HIGH: settings.giftHigh,
  };

  const sorted = [...people].sort((a, b) => {
    const r = IMPORTANCE_RANK[a.importance as ImportanceLevel] -
      IMPORTANCE_RANK[b.importance as ImportanceLevel];
    if (r !== 0) return r;
    return a.name.localeCompare(b.name);
  });

  // Headline: combined annual gift outflow at current importance tiers.
  const annualBudget = sorted.reduce(
    (acc, p) => acc + giftAmountFor(settings, p.importance as ImportanceLevel),
    0,
  );
  const withBirthday = sorted.filter((p) => p.birthday).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="label-eyebrow">Plan</p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            People
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Whose birthdays to remember and how much to budget per importance
            tier.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="grid grid-cols-2 gap-3 min-w-[300px]">
            <Kpi
              label="People"
              value={String(sorted.length)}
              sub={`${withBirthday} birthday${withBirthday === 1 ? "" : "s"}`}
            />
            <Kpi
              label="Annual budget"
              value={formatGBP(annualBudget)}
              sub="Across all tiers"
            />
          </div>
          <PersonDialog giftAmounts={giftAmounts} />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No people yet. Add someone to start tracking birthdays and gift
            budgets.
          </p>
          <PersonDialog
            giftAmounts={giftAmounts}
            triggerVariant="outline"
            triggerLabel="Add your first person"
          />
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <TableHead className="h-9">Name</TableHead>
                <TableHead className="h-9">Importance</TableHead>
                <TableHead className="h-9">Birthday</TableHead>
                <TableHead className="h-9 text-right">Gift budget</TableHead>
                <TableHead className="h-9" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p) => {
                const importance = p.importance as ImportanceLevel;
                const budget = giftAmountFor(settings, importance);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-[13px] font-medium">
                      {p.name}
                      {p.notes ? (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {p.notes}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <ImportancePill level={importance} />
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                      {p.birthday ? (
                        format(p.birthday, "d MMM")
                      ) : (
                        <span className="text-[11px]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-[13px]">
                      {formatGBP(budget)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <PersonDialog
                          giftAmounts={giftAmounts}
                          triggerVariant="ghost"
                          initial={{
                            id: p.id,
                            name: p.name,
                            importance: p.importance,
                            birthday: p.birthday,
                            notes: p.notes,
                          }}
                        />
                        <DeletePersonButton id={p.id} name={p.name} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
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

