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
import EditOutlined from "@mui/icons-material/EditOutlined";
import { toast } from "@/components/toast";
import { FormDialog } from "@/components/form-dialog";
import { ResponsiveAction } from "@/components/responsive-action";
import { BUDGET_CATEGORIES, FREQUENCIES, FREQUENCY_LABELS } from "@/lib/categories";
import { createRecurringItem, updateRecurringItem } from "../actions";

interface InitialItem {
  id: string;
  name: string;
  amount: number;
  budgetCategory: string | null;
  bankAccount: string | null;
  frequency: string;
  dayOfMonth: number | null;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  active: boolean;
}

interface Props {
  /** When set, the dialog edits this item and the trigger is an edit icon. */
  initial?: InitialItem;
  accountOptions?: string[];
  /** For the create trigger: render as a FAB on phones (default) or a plain button. */
  fabOnMobile?: boolean;
}

export function RecurringDialog({ initial, accountOptions = [], fabOnMobile = true }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(initial);

  return (
    <>
      {isEdit ? (
        <Tooltip title={`Edit ${initial!.name}`}>
          <IconButton size="small" aria-label={`Edit ${initial!.name}`} onClick={() => setOpen(true)}>
            <EditOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <ResponsiveAction label="New item" onClick={() => setOpen(true)} fabOnMobile={fabOnMobile} />
      )}
      {open ? (
        <RecurringForm
          initial={initial}
          accountOptions={accountOptions}
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
  initial?: InitialItem;
  accountOptions: string[];
  onClose: () => void;
}

function RecurringForm({ initial, accountOptions, onClose }: FormProps) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial?.amount !== undefined ? String(initial.amount) : "");
  const [budgetCategory, setBudgetCategory] = useState<string>(initial?.budgetCategory ?? BUDGET_CATEGORIES[0]);
  const [bankAccount, setBankAccount] = useState(initial?.bankAccount ?? "");
  const [frequency, setFrequency] = useState(initial?.frequency ?? "MONTHLY");
  const [dayOfMonth, setDayOfMonth] = useState(initial?.dayOfMonth != null ? String(initial.dayOfMonth) : "");
  const [endDate, setEndDate] = useState(dateInputValue(initial?.endDate));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [pending, startTransition] = useTransition();

  const valid = name.trim().length > 0 && Number(amount) > 0;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("amount", amount);
    fd.set("budgetCategory", budgetCategory);
    fd.set("bankAccount", bankAccount.trim());
    fd.set("frequency", frequency);
    fd.set("dayOfMonth", dayOfMonth);
    fd.set("endDate", endDate);
    fd.set("notes", notes.trim());
    fd.set("active", active ? "true" : "false");
    fd.set("direction", "OUT");

    startTransition(async () => {
      try {
        if (initial) {
          await updateRecurringItem(initial.id, fd);
          toast.success("Updated", name.trim());
        } else {
          await createRecurringItem(fd);
          toast.success("Created", name.trim());
        }
        onClose();
      } catch (err) {
        toast.error("Could not save", err instanceof Error ? err.message : undefined);
      }
    });
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      title={isEdit ? "Edit recurring item" : "New recurring item"}
      description="A bill, subscription, finance payment, or budget allocation."
      onSubmit={onSubmit}
      submitLabel={isEdit ? "Save" : "Create"}
      pending={pending}
      submitDisabled={!valid}
    >
      <Stack spacing={2.5}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />

        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField
            label="Amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">£</InputAdornment> },
              htmlInput: { min: 0.01, step: 0.01 },
            }}
          />
          <TextField select label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCIES.map((f) => (
              <MenuItem key={f} value={f}>
                {FREQUENCY_LABELS[f]}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField select label="Pot" value={budgetCategory} onChange={(e) => setBudgetCategory(e.target.value)}>
            {BUDGET_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <Autocomplete
            freeSolo
            options={accountOptions}
            inputValue={bankAccount}
            onInputChange={(_, v) => setBankAccount(v)}
            renderInput={(params) => (
              <TextField {...params} label="Bank account" placeholder="e.g. Monzo Joint" />
            )}
          />
        </Box>

        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField
            label="Day of month"
            type="number"
            inputMode="numeric"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            helperText="Optional"
            slotProps={{ htmlInput: { min: 1, max: 31 } }}
          />
          <TextField
            label="Final payment"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            helperText="Leave blank for ongoing"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>

        <TextField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={2}
          placeholder="Optional"
        />

        <FormControlLabel
          control={<Switch checked={active} onChange={(_, v) => setActive(v)} />}
          label="Active"
          sx={{ ml: 0, gap: 1.5 }}
        />
      </Stack>
    </FormDialog>
  );
}
