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
import {
  RENEWAL_CATEGORIES,
  RENEWAL_RECURRENCES,
  RENEWAL_RECURRENCE_LABELS,
} from "@/lib/admin";
import { createRenewal, updateRenewal } from "../actions";

export interface InitialRenewal {
  id: string;
  title: string;
  category: string;
  subject: string | null;
  provider: string | null;
  reference: string | null;
  dueDate: Date;
  cost: number | null;
  recurrence: string;
  reminderDays: number;
  notes: string | null;
  active: boolean;
}

interface Props {
  /** When set, the dialog edits this renewal and the trigger is an edit icon. */
  initial?: InitialRenewal;
  /** Existing subjects offered by the Subject autocomplete. */
  subjectOptions?: string[];
  /** For the create trigger: render as a FAB on phones (default) or a plain button. */
  fabOnMobile?: boolean;
}

export function RenewalDialog({ initial, subjectOptions = [], fabOnMobile = true }: Props) {
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
        <ResponsiveAction label="New renewal" onClick={() => setOpen(true)} fabOnMobile={fabOnMobile} />
      )}
      {open ? (
        <RenewalForm initial={initial} subjectOptions={subjectOptions} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

// UTC-based so it round-trips cleanly with due dates stored at UTC midnight.
function dateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface FormProps {
  initial?: InitialRenewal;
  subjectOptions: string[];
  onClose: () => void;
}

function RenewalForm({ initial, subjectOptions, onClose }: FormProps) {
  const isEdit = Boolean(initial);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<string>(initial?.category ?? RENEWAL_CATEGORIES[0]);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [provider, setProvider] = useState(initial?.provider ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [dueDate, setDueDate] = useState(dateInputValue(initial?.dueDate));
  const [cost, setCost] = useState(initial?.cost != null ? String(initial.cost) : "");
  const [recurrence, setRecurrence] = useState(initial?.recurrence ?? "ANNUAL");
  const [reminderDays, setReminderDays] = useState(
    initial?.reminderDays != null ? String(initial.reminderDays) : "30",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [pending, startTransition] = useTransition();

  const valid = title.trim().length > 0 && dueDate !== "";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    // Field names match renewalSchema in src/lib/validation.ts.
    const fd = new FormData();
    fd.set("title", title.trim());
    fd.set("category", category);
    fd.set("subject", subject.trim());
    fd.set("provider", provider.trim());
    fd.set("reference", reference.trim());
    fd.set("dueDate", dueDate);
    fd.set("cost", cost);
    fd.set("recurrence", recurrence);
    fd.set("reminderDays", reminderDays);
    fd.set("notes", notes.trim());
    fd.set("active", active ? "true" : "false");

    startTransition(async () => {
      try {
        if (initial) {
          await updateRenewal(initial.id, fd);
          toast.success("Updated", title.trim());
        } else {
          await createRenewal(fd);
          toast.success("Created", title.trim());
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
      title={isEdit ? "Edit renewal" : "New renewal"}
      description="Insurance, MOT, service, tax, a warranty or document expiry — anything with a renewal date."
      onSubmit={onSubmit}
      submitLabel={isEdit ? "Save" : "Create"}
      pending={pending}
      submitDisabled={!valid}
    >
      <Stack spacing={2.5}>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Car insurance"
          required
          autoFocus
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />

        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {RENEWAL_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <Autocomplete
            freeSolo
            options={subjectOptions}
            inputValue={subject}
            onInputChange={(_, v) => setSubject(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Subject"
                placeholder="e.g. Honda Civic, Home"
                helperText="Optional — groups related renewals"
              />
            )}
          />
        </Box>

        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField select label="Recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
            {RENEWAL_RECURRENCES.map((r) => (
              <MenuItem key={r} value={r}>
                {RENEWAL_RECURRENCE_LABELS[r]}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField
            label="Cost"
            type="number"
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            helperText="Optional"
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">£</InputAdornment> },
              htmlInput: { min: 0, step: 0.01 },
            }}
          />
          <TextField
            label="Remind me"
            type="number"
            inputMode="numeric"
            value={reminderDays}
            onChange={(e) => setReminderDays(e.target.value)}
            helperText="Flags as due soon this many days ahead"
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">days before</InputAdornment> },
              htmlInput: { min: 0, max: 3650 },
            }}
          />
        </Box>

        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField
            label="Provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g. Aviva"
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <TextField
            label="Reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Policy / account no."
            slotProps={{ htmlInput: { maxLength: 120 } }}
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
