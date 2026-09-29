"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { format } from "date-fns";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import { toast } from "@/components/toast";
import { ResponsiveAction } from "@/components/responsive-action";
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

interface Props {
  /** Render the trigger as a FAB on phones (default) or a plain button. */
  fabOnMobile?: boolean;
}

/**
 * "Settle a payment" — reconcile a real-world card payment against the
 * uncycled transactions it covered (subset-sum). Opens a bottom sheet
 * on phones and a side panel on desktop. The flow itself is mounted
 * only while the panel is open so each run starts fresh.
 */
export function CycleSheet({ fabOnMobile = true }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  function show() {
    setMounted(true);
    setOpen(true);
  }

  return (
    <>
      <ResponsiveAction
        label="Settle a payment"
        icon={<ReceiptLongOutlined />}
        variant="tonal"
        fabOnMobile={fabOnMobile}
        onClick={show}
      />
      <CyclePanel open={open} onClose={() => setOpen(false)} onExited={() => setMounted(false)}>
        {mounted ? <CycleFlow onDone={() => setOpen(false)} /> : null}
      </CyclePanel>
    </>
  );
}

// ── Panel chrome ────────────────────────────────────────────────────

interface PanelProps {
  open: boolean;
  onClose: () => void;
  onExited: () => void;
  children: ReactNode;
}

function CyclePanel({ open, onClose, onExited, children }: PanelProps) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("md"));

  const header = (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, px: 3, pt: 2, pb: 1.5, flexShrink: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h5" component="h2">
          Settle a card payment
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter how much you paid and we&apos;ll work out which transactions it covers.
        </Typography>
      </Box>
      <Tooltip title="Close">
        <IconButton edge="end" aria-label="Close" onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </Tooltip>
    </Box>
  );

  if (phone) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        onOpen={() => {}}
        disableSwipeToOpen
        onTransitionExited={onExited}
        slotProps={{
          paper: { sx: { maxHeight: "85dvh", display: "flex", flexDirection: "column" } },
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 32,
            height: 4,
            borderRadius: 2,
            bgcolor: "m3.outline",
            opacity: 0.6,
            mx: "auto",
            mt: 1.5,
            mb: 0.5,
            flexShrink: 0,
          }}
        />
        {header}
        {children}
      </SwipeableDrawer>
    );
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      onTransitionExited={onExited}
      slotProps={{
        paper: { sx: { width: 420, maxWidth: "100vw", display: "flex", flexDirection: "column" } },
      }}
    >
      {header}
      {children}
    </Drawer>
  );
}

function PanelFooter({ children, between = false }: { children: ReactNode; between?: boolean }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: between ? "space-between" : "flex-end",
        alignItems: "center",
        gap: 1,
        px: 3,
        pt: 2,
        pb: "calc(16px + env(safe-area-inset-bottom))",
        borderTop: "1px solid",
        borderColor: "divider",
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

// ── Flow ────────────────────────────────────────────────────────────

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
        const best = [...s].sort((a, b) => b.uncycledCount - a.uncycledCount)[0];
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
            "Nothing to settle",
            `No uncycled transactions for ${STATEMENT_SOURCE_LABELS[source]} — import a statement first.`,
          );
        } else if (!res.exactMatch) {
          toast.warning(
            "No exact match",
            `Nothing sums to ${formatGBP(amount)} — adjust the selection manually.`,
          );
        }
      } catch (err) {
        toast.error("Could not find matches", err instanceof Error ? err.message : undefined);
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
        toast.success(
          `Settled ${selected.size} transaction${selected.size === 1 ? "" : "s"}`,
          `${STATEMENT_SOURCE_LABELS[source]} · ${formatGBP(amount)}`,
        );
        onDone();
      } catch (err) {
        toast.error("Could not settle", err instanceof Error ? err.message : undefined);
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

// ── Stage 1: what did you pay? ──────────────────────────────────────

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

  let helper: string | undefined;
  if (sourceStats && sourceStats.uncycledCount > 0) {
    helper = `${sourceStats.uncycledCount} uncycled transaction${
      sourceStats.uncycledCount === 1 ? "" : "s"
    } · total balance ${formatGBP(sourceStats.uncycledTotal)}`;
  } else if (sourceStats) {
    helper = `Nothing to settle on ${STATEMENT_SOURCE_LABELS[p.source]} — import a statement first.`;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 3, py: 2 }}>
        <Stack spacing={2.5}>
          <TextField
            select
            label="Card"
            value={p.source}
            onChange={(e) => p.setSource(e.target.value as StatementSource)}
            helperText={helper}
            slotProps={{
              select: {
                // Keep the closed field to just the name; the per-card
                // stats only show in the open menu.
                renderValue: (v) => STATEMENT_SOURCE_LABELS[v as StatementSource],
              },
            }}
          >
            {STATEMENT_SOURCES.map((s) => {
              const stat = p.stats?.find((x) => x.source === s);
              return (
                <MenuItem key={s} value={s} sx={{ justifyContent: "space-between", gap: 2 }}>
                  <span>{STATEMENT_SOURCE_LABELS[s]}</span>
                  {stat ? (
                    <Typography variant="caption" color="text.secondary" className="tabular">
                      {stat.uncycledCount === 0
                        ? "no candidates"
                        : `${stat.uncycledCount} · ${formatGBP(stat.uncycledTotal)}`}
                    </Typography>
                  ) : null}
                </MenuItem>
              );
            })}
          </TextField>

          <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField
              label="Amount paid"
              type="number"
              inputMode="decimal"
              value={p.paidAmount}
              onChange={(e) => p.setPaidAmount(e.target.value)}
              placeholder="237.55"
              autoFocus
              required
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">£</InputAdornment> },
                htmlInput: { min: 0.01, step: 0.01 },
              }}
            />
            <TextField
              label="Paid on"
              type="date"
              value={p.paidDate}
              onChange={(e) => p.setPaidDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>

          <TextField
            label="Notes"
            value={p.notes}
            onChange={(e) => p.setNotes(e.target.value)}
            multiline
            minRows={2}
            placeholder="Optional"
          />
        </Stack>
      </Box>

      <PanelFooter>
        <Button onClick={p.onCancel} disabled={p.pending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={p.onFind} disabled={p.pending || !p.paidAmount}>
          {p.pending ? "Finding…" : "Find matching transactions"}
        </Button>
      </PanelFooter>
    </Box>
  );
}

// ── Stage 2: review the match ───────────────────────────────────────

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

  // Per-category split of the selected rows, largest first.
  const breakdown = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const c of p.candidates) {
      if (!p.selected.has(c.id)) continue;
      const key = c.spendCategory ?? "Uncategorised";
      byCat.set(key, (byCat.get(key) ?? 0) + balanceImpactPence(c.amount));
    }
    return Array.from(byCat.entries())
      .map(([label, pence]) => ({ label, pence }))
      .sort((a, b) => b.pence - a.pence);
  }, [p.candidates, p.selected]);

  const targetPence = poundsToPence(p.paidAmount);
  const diffPence = targetPence - selectedSumPence;
  const matches = diffPence === 0 && p.selected.size > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Running total banner — pinned above the scrolling list */}
      <Box
        sx={{
          px: 3,
          py: 2,
          flexShrink: 0,
          bgcolor: matches ? "m3.primaryContainer" : "m3.surfaceContainer",
          color: matches ? "m3.onPrimaryContainer" : "text.primary",
          transition: "background-color 200ms",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" component="p" sx={{ opacity: 0.8 }}>
              {matches ? "Match" : selectedSumPence === 0 ? "Pick rows" : "Adjust"}
            </Typography>
            <Typography variant="h4" component="p" className="tabular">
              {formatGBP(selectedSumPence / 100)}
              <Typography component="span" variant="body2" sx={{ ml: 0.75, opacity: 0.8 }}>
                / {formatGBP(p.paidAmount)}
              </Typography>
            </Typography>
          </Box>
          {matches ? (
            <CheckCircleRounded sx={{ color: "success.main", fontSize: 28 }} />
          ) : diffPence > 0 ? (
            <Typography variant="body2" color="text.secondary" className="tabular" sx={{ whiteSpace: "nowrap" }}>
              −{formatGBP(diffPence / 100)} short
            </Typography>
          ) : (
            <Typography variant="body2" className="tabular" sx={{ color: "error.main", whiteSpace: "nowrap" }}>
              +{formatGBP(Math.abs(diffPence) / 100)} over
            </Typography>
          )}
        </Box>

        {!p.exactMatch && p.candidates.length > 0 ? (
          <Typography
            variant="caption"
            component="p"
            sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.75, opacity: 0.85 }}
          >
            <InfoOutlined sx={{ fontSize: 16 }} />
            No exact match auto-found. Tick rows manually.
          </Typography>
        ) : null}

        {breakdown.length > 0 ? (
          <Box component="dl" sx={{ m: 0, mt: 1.5, display: "grid", gap: 0.25 }}>
            {breakdown.map((b) => (
              <Box key={b.label} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                <Typography component="dt" variant="caption" noWrap sx={{ opacity: 0.85 }}>
                  {b.label}
                </Typography>
                <Typography component="dd" variant="caption" className="tabular" sx={{ m: 0 }}>
                  {formatGBP(b.pence / 100)}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>

      {/* Candidates — scrolls */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {p.candidates.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 6, px: 3, textAlign: "center" }}>
            No uncycled transactions for this source.
          </Typography>
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {p.candidates.map((c) => (
              <CandidateRow
                key={c.id}
                candidate={c}
                selected={p.selected.has(c.id)}
                disabled={p.pending}
                onToggle={() => p.onToggle(c.id)}
              />
            ))}
          </Box>
        )}
      </Box>

      <PanelFooter between>
        <Button startIcon={<ArrowBackRounded />} onClick={p.onBack} disabled={p.pending}>
          Back
        </Button>
        <Button variant="contained" onClick={p.onConfirm} disabled={p.pending || !matches}>
          {p.pending
            ? "Settling…"
            : matches
              ? `Settle ${p.selected.size} transaction${p.selected.size === 1 ? "" : "s"}`
              : "Match required"}
        </Button>
      </PanelFooter>
    </Box>
  );
}

interface CandidateRowProps {
  candidate: CycleCandidate;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function CandidateRow({ candidate: c, selected, disabled, onToggle }: CandidateRowProps) {
  const isRefund = c.amount > 0;
  return (
    <Box
      component="li"
      sx={{ borderTop: "1px solid", borderColor: "divider", "&:first-of-type": { borderTop: 0 } }}
    >
      {/* The whole row is the checkbox's label so it's one big tap target. */}
      <Box
        component="label"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          pl: 1.5,
          pr: 3,
          py: 0.5,
          cursor: disabled ? "default" : "pointer",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Checkbox
          checked={selected}
          disabled={disabled}
          onChange={onToggle}
          slotProps={{ input: { "aria-label": `Include ${c.description}` } }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" component="div" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              component="span"
              sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {c.description}
            </Box>
            {isRefund ? (
              <Chip
                size="small"
                variant="outlined"
                label="Refund"
                sx={{ height: 20, flexShrink: 0, color: "success.main", borderColor: "success.main" }}
              />
            ) : null}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div" className="tabular">
            {format(c.date, "d MMM yyyy")}
            {c.spendCategory ? ` · ${c.spendCategory}` : ""}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          className="tabular"
          sx={{ flexShrink: 0, fontWeight: 500, color: isRefund ? "success.main" : "error.main" }}
        >
          {formatGBP(c.amount)}
        </Typography>
      </Box>
    </Box>
  );
}
