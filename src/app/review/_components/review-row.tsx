"use client";

import { useOptimistic, useTransition } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { toast } from "@/components/toast";
import { SwipeableRow } from "@/components/swipeable-row";
import { formatGBP } from "@/lib/money";
import { SPEND_CATEGORIES, type SpendCategory } from "@/lib/categories";
import { categoriseFromReview, dismissTransaction } from "../actions";

interface Props {
  id: string;
  description: string;
  /** Pre-formatted on the server, e.g. "29 Sep 2026". */
  dateLabel: string;
  /** Human label for the statement source, e.g. "Monzo". */
  sourceLabel: string;
  /** Signed amount as stored: negative = spend, positive = refund. */
  amount: number;
}

type Outcome =
  | { kind: "idle" }
  | { kind: "categorised"; category: SpendCategory }
  | { kind: "dismissed" };

const IDLE: Outcome = { kind: "idle" };

/**
 * One transaction awaiting a category. Picking a category (select on
 * desktop, chip row on phones) or dismissing saves immediately; the row
 * shows its outcome optimistically until the server re-render drops it
 * from the queue.
 */
export function ReviewRow({ id, description, dateLabel, sourceLabel, amount }: Props) {
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useOptimistic<Outcome>(IDLE);
  const done = outcome.kind !== "idle";
  const isSpend = amount < 0;

  function categorise(category: SpendCategory) {
    startTransition(async () => {
      setOutcome({ kind: "categorised", category });
      try {
        const result = await categoriseFromReview(id, category);
        if (result.cascaded > 0) {
          toast.success(
            `Categorised as ${category}`,
            `${result.cascaded} similar transaction${result.cascaded === 1 ? "" : "s"} tagged too (rule: ${result.pattern})`,
          );
        } else if (result.pattern) {
          toast.success(`Categorised as ${category}`, `Rule saved: ${result.pattern}`);
        } else {
          toast.success(`Categorised as ${category}`);
        }
      } catch (err) {
        toast.error("Could not categorise", err instanceof Error ? err.message : undefined);
      }
    });
  }

  function dismiss() {
    startTransition(async () => {
      setOutcome({ kind: "dismissed" });
      try {
        await dismissTransaction(id);
        toast.success("Dismissed", "Marked as reviewed without a category");
      } catch (err) {
        toast.error("Could not dismiss", err instanceof Error ? err.message : undefined);
      }
    });
  }

  return (
    // Phones: swipe right to mark reviewed without a category (the same
    // action as the close button).
    <SwipeableRow
      disabled={done || pending}
      start={{
        label: "Reviewed",
        icon: <CheckRounded />,
        color: "success",
        onTrigger: dismiss,
        dismiss: true,
      }}
    >
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "minmax(0, 1fr) auto", md: "minmax(0, 1fr) 120px 300px" },
        alignItems: "center",
        columnGap: 2,
        rowGap: 1.25,
        px: 2,
        py: 1.5,
        borderTop: "1px solid",
        borderColor: "divider",
        "&:first-of-type": { borderTop: 0 },
        opacity: done ? 0.6 : 1,
        transition: "opacity 200ms",
      }}
    >
      {/* Description + meta */}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" component="p" sx={{ overflowWrap: "anywhere" }}>
          {description}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
          <Chip size="small" variant="outlined" label={sourceLabel} />
          <Typography variant="caption" color="text.secondary" className="tabular">
            {dateLabel}
          </Typography>
          {!isSpend ? (
            <Typography variant="caption" sx={{ color: "success.main" }}>
              Refund
            </Typography>
          ) : null}
        </Box>
      </Box>

      {/* Amount */}
      <Typography
        variant="subtitle1"
        component="p"
        className="tabular"
        sx={{
          textAlign: "right",
          whiteSpace: "nowrap",
          color: isSpend ? "error.main" : "success.main",
        }}
      >
        {formatGBP(amount)}
      </Typography>

      {/* Category picker / outcome */}
      <Box
        sx={{
          gridColumn: { xs: "1 / -1", md: "auto" },
          display: "flex",
          alignItems: "center",
          justifyContent: { xs: "space-between", md: "flex-end" },
          gap: 1,
          minWidth: 0,
        }}
      >
        {done ? (
          <>
            <Chip
              size="small"
              icon={<CheckRounded />}
              label={outcome.kind === "categorised" ? outcome.category : "Dismissed"}
            />
            <Typography variant="caption" color="text.secondary">
              Saving…
            </Typography>
          </>
        ) : (
          <>
            {/* Desktop: compact select */}
            <TextField
              select
              size="small"
              label="Category"
              value=""
              onChange={(e) => categorise(e.target.value as SpendCategory)}
              disabled={pending}
              sx={{ display: { xs: "none", md: "block" }, width: 220 }}
            >
              {SPEND_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>

            {/* Phones: one tap per category */}
            <Box
              role="group"
              aria-label="Choose a category"
              sx={{ display: { xs: "flex", md: "none" }, flexWrap: "wrap", gap: 0.75, minWidth: 0 }}
            >
              {SPEND_CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  variant="outlined"
                  clickable
                  disabled={pending}
                  onClick={() => categorise(c)}
                />
              ))}
            </Box>

            <Tooltip title="Mark reviewed without a category">
              <span>
                <IconButton
                  aria-label="Mark reviewed without a category"
                  onClick={dismiss}
                  disabled={pending}
                >
                  <CloseRounded />
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}
      </Box>
    </Box>
    </SwipeableRow>
  );
}
