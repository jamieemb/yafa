"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { toast } from "@/components/toast";
import { FormDialog } from "@/components/form-dialog";
import { ResponsiveAction } from "@/components/responsive-action";
import { createContract, updateContract } from "../actions";

export interface InitialContract {
  id: string;
  label: string;
  startDate: Date;
  startOdometer: number;
  annualAllowance: number;
  termYears: number;
  notes: string | null;
  active: boolean;
}

interface Props {
  /** When set, the dialog edits this contract and the trigger is an edit icon. */
  initial?: InitialContract;
  /** For the create trigger: render as a FAB on phones (default) or a plain button. */
  fabOnMobile?: boolean;
}

export function ContractDialog({ initial, fabOnMobile = true }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {initial ? (
        <Tooltip title="Edit contract">
          <IconButton size="small" aria-label={`Edit ${initial.label}`} onClick={() => setOpen(true)}>
            <EditOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <ResponsiveAction label="New contract" onClick={() => setOpen(true)} fabOnMobile={fabOnMobile} />
      )}
      {open ? <ContractForm initial={initial} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// Contract dates are stored as UTC midnight, so read the UTC fields.
function dateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface FormProps {
  initial?: InitialContract;
  onClose: () => void;
}

function ContractForm({ initial, onClose }: FormProps) {
  const isEdit = Boolean(initial);
  const [label, setLabel] = useState(initial?.label ?? "");
  const [startDate, setStartDate] = useState(dateInputValue(initial?.startDate));
  const [startOdometer, setStartOdometer] = useState(
    initial?.startOdometer != null ? String(initial.startOdometer) : "0",
  );
  const [annualAllowance, setAnnualAllowance] = useState(
    initial?.annualAllowance != null ? String(initial.annualAllowance) : "8000",
  );
  const [termYears, setTermYears] = useState(initial?.termYears != null ? String(initial.termYears) : "4");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [pending, startTransition] = useTransition();

  const years = Number(termYears);
  const total = Number(annualAllowance || 0) * (years || 0);
  const valid =
    label.trim().length > 0 &&
    startDate.length > 0 &&
    Number(startOdometer) >= 0 &&
    Number(annualAllowance) > 0 &&
    Number.isInteger(years) &&
    years >= 1 &&
    years <= 20;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    const fd = new FormData();
    fd.set("label", label.trim());
    fd.set("startDate", startDate);
    fd.set("startOdometer", startOdometer);
    fd.set("annualAllowance", annualAllowance);
    fd.set("termYears", termYears);
    fd.set("notes", notes.trim());
    fd.set("active", active ? "true" : "false");

    startTransition(async () => {
      try {
        if (initial) {
          await updateContract(initial.id, fd);
          toast.success("Updated", label.trim());
        } else {
          await createContract(fd);
          toast.success("Tracking set up", label.trim());
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
      title={isEdit ? "Edit mileage contract" : "Set up mileage tracking"}
      description="Your PCP / lease allowance and where tracking starts from."
      onSubmit={onSubmit}
      submitLabel={isEdit ? "Save" : "Start tracking"}
      pending={pending}
      submitDisabled={!valid}
    >
      <Stack spacing={2.5}>
        <TextField
          label="Vehicle / contract"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Honda Civic PCP"
          required
          autoFocus
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />

        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField
            label="Tracking starts"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Starting odometer"
            type="number"
            inputMode="numeric"
            value={startOdometer}
            onChange={(e) => setStartOdometer(e.target.value)}
            required
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">mi</InputAdornment> },
              htmlInput: { min: 0, step: 1 },
            }}
          />
        </Box>

        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField
            label="Annual allowance"
            type="number"
            inputMode="numeric"
            value={annualAllowance}
            onChange={(e) => setAnnualAllowance(e.target.value)}
            required
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">mi / yr</InputAdornment> },
              htmlInput: { min: 1, step: 100 },
            }}
          />
          <TextField
            label="Term"
            type="number"
            inputMode="numeric"
            value={termYears}
            onChange={(e) => setTermYears(e.target.value)}
            required
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">years</InputAdornment> },
              htmlInput: { min: 1, max: 20, step: 1 },
            }}
          />
        </Box>

        {total > 0 ? (
          <Typography variant="body2" color="text.secondary">
            Total allowance over the term:{" "}
            <Typography
              component="span"
              variant="body2"
              className="tabular"
              sx={{ color: "text.primary", fontWeight: 500 }}
            >
              {total.toLocaleString("en-GB")} miles
            </Typography>
          </Typography>
        ) : null}

        <TextField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={2}
          placeholder="Optional — e.g. excess mileage charge per mile"
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
