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
import { addReading } from "../actions";

interface Props {
  contractId: string;
  // Latest odometer (or the starting odometer if no readings yet) — used to
  // show miles-since-last as you type.
  lastOdometer: number;
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

export function AddReadingDialog({
  contractId,
  lastOdometer,
  triggerLabel,
  triggerVariant = "default",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} />}>
        <Plus className="size-4" />
        {triggerLabel ?? "Add reading"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add odometer reading</DialogTitle>
          <DialogDescription>
            Miles driven is worked out from the previous reading.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ReadingForm
            contractId={contractId}
            lastOdometer={lastOdometer}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReadingForm({
  contractId,
  lastOdometer,
  onDone,
}: {
  contractId: string;
  lastOdometer: number;
  onDone: () => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const delta =
    odometer.trim() !== "" && Number.isFinite(Number(odometer))
      ? Number(odometer) - lastOdometer
      : null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await addReading(contractId, formData);
        toast.success("Reading added");
        onDone();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="odometer">Odometer (mi)</Label>
        <Input
          id="odometer"
          name="odometer"
          type="number"
          step="1"
          min="0"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          placeholder={`Last: ${lastOdometer.toLocaleString("en-GB")}`}
          required
          autoFocus
        />
        {delta != null ? (
          <p
            className={`text-[12px] ${
              delta < 0 ? "text-negative" : "text-muted-foreground"
            }`}
          >
            {delta < 0
              ? `${delta.toLocaleString("en-GB")} — below the last reading`
              : `+${delta.toLocaleString("en-GB")} miles since last reading`}
          </p>
        ) : null}
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
          {pending ? "Saving…" : "Add reading"}
        </Button>
      </DialogFooter>
    </form>
  );
}
