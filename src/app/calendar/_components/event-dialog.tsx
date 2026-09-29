"use client";

import { useState, useTransition } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { toast } from "@/components/toast";
import { FormDialog } from "@/components/form-dialog";
import { ResponsiveAction } from "@/components/responsive-action";
import {
  IMPORTANCE_LEVELS,
  IMPORTANCE_LABELS,
  type ImportanceLevel,
} from "@/lib/categories";
import { formatGBP } from "@/lib/money";
import { createCalendarEvent, updateCalendarEvent } from "../actions";

export interface EventInitial {
  id: string;
  title: string;
  date: Date;
  recursAnnually: boolean;
  importance: string | null;
  amount: number | null;
  person: string | null;
  notes: string | null;
}

export type GiftAmounts = Record<ImportanceLevel, number>;

interface Props {
  /** When set, the dialog edits this event and the trigger is an edit icon. */
  initial?: EventInitial;
  /** Tier budgets from settings, shown next to each importance option. */
  giftAmounts: GiftAmounts;
  /** Names offered as suggestions in the Person field. */
  personOptions?: string[];
  /** For the create trigger: render as a FAB on phones (default) or a plain button. */
  fabOnMobile?: boolean;
}

// Select value for "no importance tier". The field is simply omitted from
// the FormData in that case, which the Zod schema reads as null.
const NONE = "__none__";

export function EventDialog({ initial, giftAmounts, personOptions = [], fabOnMobile = true }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(initial);

  return (
    <>
      {isEdit ? (
        <Tooltip title={`Edit ${initial!.title}`}>
          <IconButton size="small" aria-label={`Edit ${initial!.title}`} onClick={() => setOpen(true)}>
            <EditOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <ResponsiveAction label="New event" onClick={() => setOpen(true)} fabOnMobile={fabOnMobile} />
      )}
      {open ? (
        <EventForm
          initial={initial}
          giftAmounts={giftAmounts}
          personOptions={personOptions}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function dateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface FormProps {
  initial?: EventInitial;
  giftAmounts: GiftAmounts;
  personOptions: string[];
  onClose: () => void;
}

function EventForm({ initial, giftAmounts, personOptions, onClose }: FormProps) {
  const isEdit = Boolean(initial);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(dateInputValue(initial?.date));
  const [recursAnnually, setRecursAnnually] = useState(initial?.recursAnnually ?? false);
  const [importance, setImportance] = useState<string>(initial?.importance ?? NONE);
  const [amountOverride, setAmountOverride] = useState(
    initial?.amount != null ? String(initial.amount) : "",
  );
  const [person, setPerson] = useState(initial?.person ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();

  const hasOverride = amountOverride.trim() !== "";
  const tier = importance === NONE ? null : (importance as ImportanceLevel);
  // Effective budget preview: an explicit override wins, else the tier
  // amount from settings, else nothing.
  const effectiveAmount = hasOverride ? Number(amountOverride) : tier ? giftAmounts[tier] : 0;

  const valid =
    title.trim().length > 0 && date !== "" && (!hasOverride || Number(amountOverride) >= 0);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    const fd = new FormData();
    fd.set("title", title.trim());
    fd.set("date", date);
    fd.set("recursAnnually", recursAnnually ? "true" : "false");
    if (tier) fd.set("importance", tier);
    fd.set("amount", amountOverride.trim());
    fd.set("person", person.trim());
    fd.set("notes", notes.trim());

    startTransition(async () => {
      try {
        if (initial) {
          await updateCalendarEvent(initial.id, fd);
          toast.success("Updated", title.trim());
        } else {
          await createCalendarEvent(fd);
          toast.success("Added", title.trim());
        }
        onClose();
      } catch (err) {
        toast.error("Could not save", err instanceof Error ? err.message : undefined);
      }
    });
  }

  const budgetNote =
    effectiveAmount > 0
      ? `Budget ${formatGBP(effectiveAmount)}${
          hasOverride ? " (manual override)" : tier ? ` (from ${IMPORTANCE_LABELS[tier]} tier)` : ""
        }`
      : "No budget allocated.";

  return (
    <FormDialog
      open
      onClose={onClose}
      title={isEdit ? "Edit event" : "New event"}
      description="Parties, anniversaries, one-off purchases. Importance fills in the budget from your settings; birthdays come from People automatically."
      onSubmit={onSubmit}
      submitLabel={isEdit ? "Save" : "Add"}
      pending={pending}
      submitDisabled={!valid}
    >
      <Stack spacing={2.5}>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          placeholder="e.g. Wedding party, Anniversary dinner"
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />

        <Box
          sx={{
            display: "grid",
            gap: 2.5,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            alignItems: "center",
          }}
        >
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControlLabel
            control={<Switch checked={recursAnnually} onChange={(_, v) => setRecursAnnually(v)} />}
            label="Repeats every year"
            sx={{ ml: 0, gap: 1.5 }}
          />
        </Box>

        <Box>
          <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField
              select
              label="Importance"
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
              slotProps={{
                select: {
                  renderValue: (v) =>
                    v === NONE ? "No tier" : IMPORTANCE_LABELS[v as ImportanceLevel],
                },
              }}
            >
              <MenuItem value={NONE}>
                <Typography component="span" color="text.secondary">
                  No tier
                </Typography>
              </MenuItem>
              {IMPORTANCE_LEVELS.map((lvl) => (
                <MenuItem key={lvl} value={lvl}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    <span>{IMPORTANCE_LABELS[lvl]}</span>
                    <Typography component="span" variant="caption" color="text.secondary" className="tabular">
                      {formatGBP(giftAmounts[lvl])}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Amount override"
              type="number"
              inputMode="decimal"
              value={amountOverride}
              onChange={(e) => setAmountOverride(e.target.value)}
              placeholder="Optional"
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">£</InputAdornment> },
                htmlInput: { min: 0, step: 0.01 },
              }}
            />
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            component="p"
            className="tabular"
            sx={{ mt: 1, mx: 2 }}
          >
            {budgetNote}
          </Typography>
        </Box>

        <Autocomplete
          freeSolo
          options={personOptions}
          inputValue={person}
          onInputChange={(_, v) => setPerson(v)}
          renderInput={(params) => (
            <TextField {...params} label="Person" placeholder="Optional — e.g. Mum, Sarah" />
          )}
        />

        <TextField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={2}
          placeholder="Optional"
        />
      </Stack>
    </FormDialog>
  );
}
