"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { METER_PRESETS } from "@/lib/admin";
import { createReading } from "../actions";

interface Props {
  // Existing meter labels (merged with presets for the datalist).
  meterOptions?: string[];
  // Pre-select a meter + unit when adding from a specific meter's card.
  defaultMeter?: string;
  defaultUnit?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "ghost" | "outline";
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
  triggerLabel,
  triggerVariant = "default",
}: Props) {
  const [open, setOpen] = useState(false);

  const allMeters = Array.from(
    new Set([...METER_PRESETS.map((p) => p.meter), ...meterOptions]),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={triggerVariant} size={defaultMeter ? "sm" : "default"} />
        }
      >
        {defaultMeter ? (
          triggerLabel ?? "Add reading"
        ) : (
          <>
            <Plus className="size-4" />
            {triggerLabel ?? "Add reading"}
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add meter reading</DialogTitle>
          <DialogDescription>
            Log a reading; usage is worked out from the previous one.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ReadingForm
            allMeters={allMeters}
            defaultMeter={defaultMeter}
            defaultUnit={defaultUnit}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReadingForm({
  allMeters,
  defaultMeter,
  defaultUnit,
  onDone,
}: {
  allMeters: string[];
  defaultMeter?: string;
  defaultUnit?: string;
  onDone: () => void;
}) {
  const [meter, setMeter] = useState(defaultMeter ?? "");
  const [unit, setUnit] = useState(defaultUnit ?? "");
  const [date, setDate] = useState(todayIso());
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  // Prefill the unit from a known preset when the meter matches and the
  // unit field is still empty (don't clobber a manual entry).
  function onMeterChange(v: string) {
    setMeter(v);
    if (!unit) {
      const preset = METER_PRESETS.find(
        (p) => p.meter.toLowerCase() === v.trim().toLowerCase(),
      );
      if (preset) setUnit(preset.unit);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createReading(formData);
        toast.success("Reading saved");
        onDone();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="meter">Meter</Label>
        <Input
          id="meter"
          name="meter"
          list="meter-options"
          value={meter}
          onChange={(e) => onMeterChange(e.target.value)}
          placeholder="e.g. Electricity"
          required
          maxLength={60}
          autoFocus
        />
        <datalist id="meter-options">
          {allMeters.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">Reading</Label>
          <Input
            id="value"
            name="value"
            type="number"
            step="any"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            name="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. kWh, m³"
            maxLength={20}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          name="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Optional"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save reading"}
        </Button>
      </DialogFooter>
    </form>
  );
}
