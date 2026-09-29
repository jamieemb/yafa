"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import SavingsOutlined from "@mui/icons-material/SavingsOutlined";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import TrendingUpOutlined from "@mui/icons-material/TrendingUpOutlined";
import { toast } from "@/components/toast";
import { formatGBP } from "@/lib/money";
import { round2, type AllocationAmounts } from "@/lib/plan";
import { clearAllocation, saveAllocation } from "../actions";

type Bucket = keyof AllocationAmounts;

const BUCKETS: { id: Bucket; label: string; icon: React.ReactNode; color: string; blurb: string }[] = [
  { id: "savings", label: "Savings", icon: <SavingsOutlined />, color: "primary.main", blurb: "Emergency fund, sinking funds, big purchases." },
  { id: "invest", label: "Investments", icon: <TrendingUpOutlined />, color: "info.main", blurb: "ISA, pension top-ups, long-term growth." },
  { id: "free", label: "Free spend", icon: <ShoppingBagOutlined />, color: "secondary.main", blurb: "Guilt-free money for the month." },
];

interface Props {
  monthIso: string;
  /** Income − committed for the month. */
  discretionary: number;
  /** Settings-percentage split (what the dashboard shows without a plan). */
  suggested: AllocationAmounts;
  /** Settings percentages as fractions, for the reset label. */
  percents: AllocationAmounts;
  /** The saved plan, if any. */
  initial: AllocationAmounts | null;
}

/**
 * Three-way split of the month's discretionary money. Moving one bucket
 * redistributes the difference across the other two in proportion, so
 * the three always add up to what's left. Saving stores the amounts on
 * the month's plan; the dashboard shows them instead of the suggestion.
 */
export function AllocationEditor({ monthIso, discretionary, suggested, percents, initial }: Props) {
  const total = Math.max(0, round2(discretionary));
  const [amounts, setAmounts] = useState<AllocationAmounts>(initial ?? suggested);
  const [saved, setSaved] = useState<boolean>(initial !== null);
  const [confirmDrop, setConfirmDrop] = useState(false);
  const [pending, startTransition] = useTransition();

  const overBudget = discretionary <= 0;
  const isSuggested =
    amounts.savings === suggested.savings &&
    amounts.invest === suggested.invest &&
    amounts.free === suggested.free;

  function setBucket(id: Bucket, raw: number) {
    const value = Math.min(total, Math.max(0, round2(raw)));
    const others = BUCKETS.map((b) => b.id).filter((b) => b !== id) as Bucket[];
    const remaining = round2(total - value);
    const otherSum = others.reduce((acc, b) => acc + amounts[b], 0);
    const next: AllocationAmounts = { ...amounts, [id]: value };
    if (otherSum <= 0) {
      // Nothing to scale — split the remainder evenly.
      next[others[0]] = round2(remaining / 2);
      next[others[1]] = round2(remaining - next[others[0]]);
    } else {
      next[others[0]] = round2((amounts[others[0]] / otherSum) * remaining);
      next[others[1]] = round2(remaining - next[others[0]]);
    }
    setAmounts(next);
    setSaved(false);
  }

  function reset() {
    setAmounts(suggested);
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      try {
        await saveAllocation(monthIso, amounts);
        setSaved(true);
        toast.success("Allocation saved", "The dashboard now shows your plan.");
      } catch (err) {
        toast.error("Could not save allocation", err instanceof Error ? err.message : undefined);
      }
    });
  }

  function useSuggestion() {
    setConfirmDrop(false);
    startTransition(async () => {
      try {
        await clearAllocation(monthIso);
        setAmounts(suggested);
        setSaved(false);
        toast.success("Using the suggested split");
      } catch (err) {
        toast.error("Could not reset", err instanceof Error ? err.message : undefined);
      }
    });
  }

  if (overBudget) {
    return (
      <Alert severity="error" icon={false}>
        <Typography variant="subtitle2" component="p">
          Nothing left to allocate — committed outflow exceeds income by {formatGBP(Math.abs(discretionary))}.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Go back and trim a recurring cost, or add income, then return here.
        </Typography>
      </Alert>
    );
  }

  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  return (
    <Stack spacing={3}>
      {/* Stacked bar */}
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
          <Typography variant="overline" color="text.secondary">
            Left to allocate
          </Typography>
          <Typography variant="h4" component="p" className="tabular">
            {formatGBP(total)}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", bgcolor: "m3.surfaceContainerHighest" }} aria-hidden>
          {BUCKETS.map((b) => (
            <Box
              key={b.id}
              sx={{ width: `${pct(amounts[b.id])}%`, bgcolor: b.color, transition: "width 200ms" }}
            />
          ))}
        </Box>
      </Box>

      {BUCKETS.map((b) => (
        <Box
          key={b.id}
          sx={{
            display: "grid",
            gap: { xs: 1, sm: 2 },
            gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 160px" },
            alignItems: "center",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Box sx={{ color: b.color, display: "flex" }}>{b.icon}</Box>
              <Typography variant="subtitle1" component="h3">
                {b.label}
              </Typography>
              <Chip size="small" label={`${pct(amounts[b.id])}%`} className="tabular" />
            </Box>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 0.5 }}>
              {b.blurb}
            </Typography>
            <Slider
              value={amounts[b.id]}
              min={0}
              max={total}
              step={1}
              onChange={(_, v) => setBucket(b.id, Array.isArray(v) ? v[0] : v)}
              aria-label={`${b.label} amount`}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => formatGBP(v)}
              sx={{ color: b.color }}
            />
          </Box>
          <TextField
            label={b.label}
            type="number"
            inputMode="decimal"
            value={String(amounts[b.id])}
            onChange={(e) => setBucket(b.id, Number(e.target.value) || 0)}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">£</InputAdornment> },
              htmlInput: { min: 0, max: total, step: 1 },
            }}
          />
        </Box>
      ))}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            startIcon={<RestartAltRounded />}
            onClick={reset}
            disabled={pending || isSuggested}
          >
            Reset to {Math.round(percents.savings * 100)} / {Math.round(percents.invest * 100)} / {Math.round(percents.free * 100)}
          </Button>
          {initial ? (
            <Button onClick={() => setConfirmDrop(true)} disabled={pending}>
              Drop my override
            </Button>
          ) : null}
        </Box>
        <Dialog open={confirmDrop} onClose={() => setConfirmDrop(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Drop your override?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              The dashboard will go back to the suggested {Math.round(percents.savings * 100)} /{" "}
              {Math.round(percents.invest * 100)} / {Math.round(percents.free * 100)} split for this month.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDrop(false)}>Keep my plan</Button>
            <Button color="error" onClick={useSuggestion} autoFocus>
              Drop override
            </Button>
          </DialogActions>
        </Dialog>
        <Button
          variant={saved ? "tonal" : "contained"}
          startIcon={<SaveRounded />}
          onClick={save}
          disabled={pending || saved}
        >
          {pending ? "Saving…" : saved ? "Saved" : "Save allocation"}
        </Button>
      </Box>
    </Stack>
  );
}
