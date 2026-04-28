"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { Receipt, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATEMENT_SOURCES,
  STATEMENT_SOURCE_LABELS,
  type StatementSource,
} from "@/lib/categories";
import { formatGBP } from "@/lib/money";
import { balanceImpactPence, poundsToPence } from "@/lib/subset-sum";
import {
  createPayCycle,
  findCycleMatch,
  getCycleSourceStats,
  type CycleCandidate,
  type SourceCycleStats,
} from "../cycle-actions";

type Stage = "input" | "review";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CycleSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline">
            <Receipt className="size-4" />
            Settle a payment
          </Button>
        }
      />
      <SheetContent className="sm:max-w-xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle>Settle a card payment</SheetTitle>
          <SheetDescription>
            Enter how much you paid and we&apos;ll work out which transactions
            it covers.
          </SheetDescription>
        </SheetHeader>
        {open && <CycleFlow onDone={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function CycleFlow({ onDone }: { onDone: () => void }) {
  const [stats, setStats] = useState<SourceCycleStats[] | null>(null);
  const [stage, setStage] = useState<Stage>("input");
  const [source, setSource] = useState<StatementSource>("NATWEST");
  const [paidAmount, setPaidAmount] = useState("");
  const [paidDate, setPaidDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [candidates, setCandidates] = useState<CycleCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exactMatch, setExactMatch] = useState(false);
  const [pending, startTransition] = useTransition();

  // Default the source to whichever has the most uncycled candidates,
  // so users with one card don't have to remember to switch.
  useEffect(() => {
    let cancelled = false;
    getCycleSourceStats()
      .then((s) => {
        if (cancelled) return;
        setStats(s);
        const best = [...s].sort(
          (a, b) => b.uncycledCount - a.uncycledCount,
        )[0];
        if (best && best.uncycledCount > 0) setSource(best.source);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function findMatch() {
    const amount = Number(paidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a positive paid amount");
      return;
    }
    startTransition(async () => {
      try {
        const res = await findCycleMatch(source, amount);
        setCandidates(res.candidates);
        setSelected(new Set(res.autoSelectedIds));
        setExactMatch(res.exactMatch);
        setStage("review");
        if (res.candidates.length === 0) {
          toast.info(
            `No uncycled transactions for ${STATEMENT_SOURCE_LABELS[source]} — import a statement first.`,
          );
        } else if (!res.exactMatch) {
          toast.warning(
            `No exact subset matches £${amount.toFixed(2)}. Adjust manually.`,
          );
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    const amount = Number(paidAmount);
    startTransition(async () => {
      try {
        await createPayCycle({
          source,
          paidAmount: amount,
          paidDate,
          transactionIds: Array.from(selected),
          notes: notes.trim() || undefined,
        });
        toast.success(`Settled ${selected.size} transactions`);
        onDone();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  if (stage === "input") {
    return (
      <CycleInputStage
        stats={stats}
        source={source}
        setSource={setSource}
        paidAmount={paidAmount}
        setPaidAmount={setPaidAmount}
        paidDate={paidDate}
        setPaidDate={setPaidDate}
        notes={notes}
        setNotes={setNotes}
        pending={pending}
        onFind={findMatch}
        onCancel={onDone}
      />
    );
  }

  return (
    <CycleReviewStage
      candidates={candidates}
      selected={selected}
      paidAmount={Number(paidAmount)}
      exactMatch={exactMatch}
      pending={pending}
      onToggle={toggle}
      onBack={() => setStage("input")}
      onConfirm={confirm}
    />
  );
}

interface InputStageProps {
  stats: SourceCycleStats[] | null;
  source: StatementSource;
  setSource: (s: StatementSource) => void;
  paidAmount: string;
  setPaidAmount: (s: string) => void;
  paidDate: string;
  setPaidDate: (s: string) => void;
  notes: string;
  setNotes: (s: string) => void;
  pending: boolean;
  onFind: () => void;
  onCancel: () => void;
}

function CycleInputStage(p: InputStageProps) {
  const sourceStats = p.stats?.find((s) => s.source === p.source);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cycle-source">Card</Label>
          <Select
            value={p.source}
            onValueChange={(v) =>
              p.setSource((v ?? "NATWEST") as StatementSource)
            }
          >
            <SelectTrigger id="cycle-source" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATEMENT_SOURCES.map((s) => {
                const stat = p.stats?.find((x) => x.source === s);
                return (
                  <SelectItem key={s} value={s}>
                    <div className="flex items-baseline justify-between gap-3 w-full">
                      <span>{STATEMENT_SOURCE_LABELS[s]}</span>
                      {stat ? (
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {stat.uncycledCount === 0
                            ? "no candidates"
                            : `${stat.uncycledCount} · £${stat.uncycledTotal.toFixed(2)}`}
                        </span>
                      ) : null}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {sourceStats && sourceStats.uncycledCount > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              {sourceStats.uncycledCount} uncycled transaction
              {sourceStats.uncycledCount === 1 ? "" : "s"} · total balance{" "}
              <span className="font-mono tabular-nums">
                £{sourceStats.uncycledTotal.toFixed(2)}
              </span>
            </p>
          ) : sourceStats ? (
            <p className="text-[11px] text-muted-foreground">
              Nothing to settle on {STATEMENT_SOURCE_LABELS[p.source]} — import
              a statement first.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cycle-amount">Amount paid (£)</Label>
            <Input
              id="cycle-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={p.paidAmount}
              onChange={(e) => p.setPaidAmount(e.target.value)}
              placeholder="237.55"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cycle-date">Paid on</Label>
            <Input
              id="cycle-date"
              type="date"
              value={p.paidDate}
              onChange={(e) => p.setPaidDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cycle-notes">Notes</Label>
          <Textarea
            id="cycle-notes"
            rows={2}
            placeholder="Optional"
            value={p.notes}
            onChange={(e) => p.setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 px-5 py-3 border-t bg-muted/40">
        <Button variant="ghost" onClick={p.onCancel} disabled={p.pending}>
          Cancel
        </Button>
        <Button onClick={p.onFind} disabled={p.pending || !p.paidAmount}>
          {p.pending ? "Finding…" : "Find matching transactions"}
        </Button>
      </div>
    </div>
  );
}

interface ReviewStageProps {
  candidates: CycleCandidate[];
  selected: Set<string>;
  paidAmount: number;
  exactMatch: boolean;
  pending: boolean;
  onToggle: (id: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

function CycleReviewStage(p: ReviewStageProps) {
  // Running total in pence using BALANCE IMPACT — charges add, refunds
  // subtract — so the displayed sum is what the user actually paid.
  const selectedSumPence = useMemo(() => {
    let s = 0;
    for (const c of p.candidates) {
      if (p.selected.has(c.id)) s += balanceImpactPence(c.amount);
    }
    return s;
  }, [p.candidates, p.selected]);

  const targetPence = poundsToPence(p.paidAmount);
  const diffPence = targetPence - selectedSumPence;
  const matches = diffPence === 0 && p.selected.size > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Running total banner — fixed at top of body */}
      <div
        className={`px-5 py-3 border-b ${
          matches ? "bg-positive/10" : "bg-muted/40"
        }`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="label-eyebrow">
              {matches ? "Match" : selectedSumPence === 0 ? "Pick rows" : "Adjust"}
            </p>
            <p className="font-mono text-xl tabular-nums tracking-tight mt-1">
              {formatGBP(selectedSumPence / 100)}{" "}
              <span className="text-muted-foreground text-[12px]">
                / {formatGBP(p.paidAmount)}
              </span>
            </p>
          </div>
          {matches ? (
            <Check className="size-5 text-positive" />
          ) : diffPence > 0 ? (
            <span className="text-[12px] text-muted-foreground tabular-nums">
              −{formatGBP(diffPence / 100)} short
            </span>
          ) : (
            <span className="text-[12px] text-negative tabular-nums">
              +{formatGBP(Math.abs(diffPence) / 100)} over
            </span>
          )}
        </div>
        {!p.exactMatch && p.candidates.length > 0 ? (
          <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
            <AlertCircle className="size-3" />
            No exact match auto-found. Tick rows manually.
          </p>
        ) : null}
      </div>

      {/* Candidates list — scrolls */}
      <div className="flex-1 overflow-y-auto">
        {p.candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No uncycled transactions for this source.
          </p>
        ) : (
          <ul className="divide-y">
            {p.candidates.map((c) => {
              const isSelected = p.selected.has(c.id);
              const isRefund = c.amount > 0;
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 px-5 py-2.5"
                >
                  <Switch
                    size="sm"
                    checked={isSelected}
                    onCheckedChange={() => p.onToggle(c.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] truncate">
                      {c.description}
                      {isRefund ? (
                        <span className="ml-1.5 inline-block rounded-sm bg-positive/15 text-positive text-[9px] uppercase tracking-wider font-medium px-1 py-0.5 align-middle">
                          Refund
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                      {format(c.date, "d MMM yyyy")}
                      {c.spendCategory ? ` · ${c.spendCategory}` : ""}
                    </p>
                  </div>
                  <p
                    className={`font-mono tabular-nums text-[13px] w-20 text-right shrink-0 ${
                      isRefund ? "text-positive" : "text-negative"
                    }`}
                  >
                    {formatGBP(c.amount)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between gap-2 px-5 py-3 border-t bg-muted/40">
        <Button variant="ghost" onClick={p.onBack} disabled={p.pending}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={p.onConfirm} disabled={p.pending || !matches}>
          {p.pending
            ? "Settling…"
            : matches
              ? `Settle ${p.selected.size} transaction${p.selected.size === 1 ? "" : "s"}`
              : "Match required"}
        </Button>
      </div>
    </div>
  );
}
