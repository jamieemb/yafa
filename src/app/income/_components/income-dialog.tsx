"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { toast } from "@/components/toast";
import { FormDialog } from "@/components/form-dialog";
import { ResponsiveAction } from "@/components/responsive-action";
import { createIncomeEntry, updateIncomeEntry } from "../actions";

export interface IncomeInitial {
  id: string;
  month: Date;
  paidDate: Date | null;
  person: string | null;
  label: string;
  amount: number;
  bankAccount: string | null;
  notes: string | null;
}

interface Props {
  /** When set, the dialog edits this entry and the trigger is an edit icon. */
  initial?: IncomeInitial;
  /** Month being viewed, "YYYY-MM" — the default budget month for new entries. */
  defaultMonthIso: string;
  /**
   * Keep new entries on `defaultMonthIso` regardless of the paid date
   * (used by the month setup wizard, where the month is the whole point).
   * Without it, a paid date late in the month rolls the budget month on.
   */
  lockMonth?: boolean;
  personOptions?: string[];
  accountOptions?: string[];
  /** For the create trigger: render as a FAB on phones (default) or a plain button. */
  fabOnMobile?: boolean;
}

export function IncomeDialog({
  initial,
  defaultMonthIso,
  lockMonth = false,
  personOptions = [],
  accountOptions = [],
  fabOnMobile = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(initial);

  return (
    <>
      {isEdit ? (
        <Tooltip title={`Edit ${initial!.label}`}>
          <IconButton size="small" aria-label={`Edit ${initial!.label}`} onClick={() => setOpen(true)}>
            <EditOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <ResponsiveAction label="New income" onClick={() => setOpen(true)} fabOnMobile={fabOnMobile} />
      )}
      {open ? (
        <IncomeForm
          initial={initial}
          defaultMonthIso={defaultMonthIso}
          lockMonth={lockMonth}
          personOptions={personOptions}
          accountOptions={accountOptions}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function monthInputValue(d: Date | null | undefined, fallback: string): string {
  if (!d) return fallback;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function dateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayLocalIso(): string {
  return dateInputValue(new Date());
}

// "If paid in the last 11 days of the month, treat as next month's
// budget" — covers everything from a 20th payday onward.
function inferBudgetMonthIsoFromPaidDate(paidIso: string): string {
  if (!paidIso) return "";
  const [y, m, d] = paidIso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const lateInMonth = d >= 20;
  const monthIndex = lateInMonth ? m : m - 1;
  const date = new Date(Date.UTC(y, monthIndex, 1));
  return monthInputValue(date, "");
}

const MONTH_ISO = /^\d{4}-\d{2}$/;

interface FormProps {
  initial?: IncomeInitial;
  defaultMonthIso: string;
  lockMonth: boolean;
  personOptions: string[];
  accountOptions: string[];
  onClose: () => void;
}

function IncomeForm({ initial, defaultMonthIso, lockMonth, personOptions, accountOptions, onClose }: FormProps) {
  const isEdit = Boolean(initial);

  // For new entries, default paidDate to today and let it drive the
  // budget month (unless the month is locked). For edits, use whatever's stored.
  const initialPaidIso = initial ? dateInputValue(initial.paidDate) : todayLocalIso();
  const initialMonthIso = initial
    ? monthInputValue(initial.month, defaultMonthIso)
    : lockMonth
      ? defaultMonthIso
      : initialPaidIso
        ? inferBudgetMonthIsoFromPaidDate(initialPaidIso) || defaultMonthIso
        : defaultMonthIso;

  const [paidDate, setPaidDate] = useState(initialPaidIso);
  const [month, setMonth] = useState(initialMonthIso);
  // Lock auto-update once the user has manually changed the month, so
  // their override isn't overwritten when they tweak paidDate after.
  const [monthIsAuto, setMonthIsAuto] = useState(!isEdit && !lockMonth);

  const [person, setPerson] = useState(initial?.person ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [amount, setAmount] = useState(initial?.amount !== undefined ? String(initial.amount) : "");
  const [bankAccount, setBankAccount] = useState(initial?.bankAccount ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();

  const valid = label.trim().length > 0 && Number(amount) > 0 && MONTH_ISO.test(month);

  function onPaidDateChange(next: string) {
    setPaidDate(next);
    if (monthIsAuto && next) {
      const inferred = inferBudgetMonthIsoFromPaidDate(next);
      if (inferred) setMonth(inferred);
    }
  }

  function onMonthChange(next: string) {
    setMonth(next);
    setMonthIsAuto(false);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    const fd = new FormData();
    fd.set("month", `${month}-01T00:00:00Z`);
    fd.set("paidDate", paidDate ? `${paidDate}T00:00:00Z` : "");
    fd.set("amount", amount);
    fd.set("person", person.trim());
    fd.set("label", label.trim());
    fd.set("bankAccount", bankAccount.trim());
    fd.set("notes", notes.trim());

    startTransition(async () => {
      try {
        if (initial) {
          await updateIncomeEntry(initial.id, fd);
          toast.success("Updated", label.trim());
        } else {
          await createIncomeEntry(fd);
          toast.success("Added", label.trim());
        }
        onClose();
      } catch (err) {
        toast.error("Could not save", err instanceof Error ? err.message : undefined);
      }
    });
  }

  // Friendly preview line: which budget month this pay will count towards.
  let preview = "";
  if (paidDate && MONTH_ISO.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const [py, pm, pd] = paidDate.split("-").map(Number);
    if (y && m && py && pm && pd) {
      const monthLabel = format(new Date(y, m - 1, 1), "MMMM yyyy");
      const paidLabel = format(new Date(py, pm - 1, pd), "d MMM");
      preview = `Paid ${paidLabel} → applied to ${monthLabel} budget`;
    }
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      title={isEdit ? "Edit income entry" : "New income entry"}
      description="Pay landing in the last week of a month usually funds the next budget month — we'll suggest the right one based on the date paid."
      onSubmit={onSubmit}
      submitLabel={isEdit ? "Save" : "Add"}
      pending={pending}
      submitDisabled={!valid}
    >
      <Stack spacing={2.5}>
        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField
            label="Paid on"
            type="date"
            value={paidDate}
            onChange={(e) => onPaidDateChange(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Budget month"
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>

        {preview ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
            {preview}
          </Typography>
        ) : null}

        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField
            label="Amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus={!isEdit}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">£</InputAdornment> },
              htmlInput: { min: 0.01, step: 0.01 },
            }}
          />
          <Autocomplete
            freeSolo
            options={personOptions}
            inputValue={person}
            onInputChange={(_, v) => setPerson(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Person"
                placeholder="e.g. Jamie"
                slotProps={{
                  ...params.slotProps,
                  htmlInput: { ...params.slotProps.htmlInput, maxLength: 60 },
                }}
              />
            )}
          />
        </Box>

        <TextField
          label="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          placeholder="e.g. Salary, On-call"
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />

        <Autocomplete
          freeSolo
          options={accountOptions}
          inputValue={bankAccount}
          onInputChange={(_, v) => setBankAccount(v)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Lands in"
              placeholder="e.g. Monzo Joint"
              slotProps={{
                ...params.slotProps,
                htmlInput: { ...params.slotProps.htmlInput, maxLength: 60 },
              }}
            />
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
