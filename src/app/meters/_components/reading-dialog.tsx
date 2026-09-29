"use client";

import { useState, useTransition } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import AddRounded from "@mui/icons-material/AddRounded";
import { toast } from "@/components/toast";
import { FormDialog } from "@/components/form-dialog";
import { ResponsiveAction } from "@/components/responsive-action";
import { METER_PRESETS, formatReading } from "@/lib/admin";
import { createReading } from "../actions";

export interface MeterOption {
  meter: string;
  unit: string | null;
}

interface Props {
  /** Existing meters (merged with METER_PRESETS for the autocomplete and unit auto-fill). */
  meterOptions?: MeterOption[];
  /** Pre-select a meter + unit when adding from a specific meter's card. */
  defaultMeter?: string;
  defaultUnit?: string;
  /** "primary" is the page's Add action (FAB on phones); "icon" is a compact per-card button. */
  trigger?: "primary" | "icon";
  /** For the primary trigger: render as a FAB on phones (default) or a plain button. */
  fabOnMobile?: boolean;
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ReadingDialog({
  meterOptions = [],
  defaultMeter,
  defaultUnit,
  trigger = "primary",
  fabOnMobile = true,
}: Props) {
  const [open, setOpen] = useState(false);

  // Presets first, then real meters (whose stored unit wins over the preset's).
  const knownUnits = new Map<string, string>();
  for (const p of METER_PRESETS) knownUnits.set(p.meter.toLowerCase(), p.unit);
  for (const o of meterOptions) if (o.unit) knownUnits.set(o.meter.toLowerCase(), o.unit);
  const allMeters = Array.from(
    new Set([...METER_PRESETS.map((p) => p.meter), ...meterOptions.map((o) => o.meter)]),
  );

  const label = defaultMeter ? `Add ${defaultMeter} reading` : "Add reading";

  return (
    <>
      {trigger === "icon" ? (
        <Tooltip title={label}>
          <IconButton aria-label={label} onClick={() => setOpen(true)}>
            <AddRounded />
          </IconButton>
        </Tooltip>
      ) : (
        <ResponsiveAction label="Add reading" onClick={() => setOpen(true)} fabOnMobile={fabOnMobile} />
      )}
      {open ? (
        <ReadingForm
          allMeters={allMeters}
          knownUnits={knownUnits}
          defaultMeter={defaultMeter}
          defaultUnit={defaultUnit}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

interface FormProps {
  allMeters: string[];
  knownUnits: Map<string, string>;
  defaultMeter?: string;
  defaultUnit?: string;
  onClose: () => void;
}

function ReadingForm({ allMeters, knownUnits, defaultMeter, defaultUnit, onClose }: FormProps) {
  const [meter, setMeter] = useState(defaultMeter ?? "");
  const [unit, setUnit] = useState(defaultUnit ?? "");
  // The unit follows the chosen meter's preset until the user edits it
  // themselves — then it's theirs and we stop touching it.
  const [unitAuto, setUnitAuto] = useState(true);
  const [date, setDate] = useState(todayIso());
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const valid = meter.trim().length > 0 && date !== "" && value !== "" && Number(value) >= 0;

  function onMeterChange(v: string) {
    setMeter(v);
    if (unitAuto) setUnit(knownUnits.get(v.trim().toLowerCase()) ?? "");
  }

  function onUnitChange(v: string) {
    setUnit(v);
    setUnitAuto(false);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    // Field names match meterReadingSchema in src/lib/validation.ts.
    const fd = new FormData();
    fd.set("meter", meter.trim());
    fd.set("date", date);
    fd.set("value", value);
    fd.set("unit", unit.trim());
    fd.set("notes", notes.trim());

    startTransition(async () => {
      try {
        await createReading(fd);
        toast.success("Reading saved", `${meter.trim()} · ${formatReading(Number(value), unit.trim() || null)}`);
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
      title="Add meter reading"
      description="Log a reading; usage is worked out from the previous one."
      onSubmit={onSubmit}
      submitLabel="Save reading"
      pending={pending}
      submitDisabled={!valid}
      maxWidth="xs"
    >
      <Stack spacing={2.5}>
        <Autocomplete
          freeSolo
          options={allMeters}
          inputValue={meter}
          onInputChange={(_, v) => onMeterChange(v)}
          renderInput={(params) => (
            <TextField {...params} label="Meter" placeholder="e.g. Electricity" required autoFocus={!defaultMeter} />
          )}
        />

        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: "2fr 1fr" }}>
          <TextField
            label="Reading"
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            autoFocus={Boolean(defaultMeter)}
            slotProps={{ htmlInput: { min: 0, step: "any" } }}
          />
          <TextField
            label="Unit"
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            placeholder="kWh"
            slotProps={{ htmlInput: { maxLength: 20 } }}
          />
        </Box>

        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          slotProps={{ inputLabel: { shrink: true } }}
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
