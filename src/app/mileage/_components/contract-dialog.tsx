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
import { createContract, updateContract } from "../actions";

interface InitialContract {
  id: string;
  label: string;
  startDate: Date;
  startOdometer: number;
  annualAllowance: number;
  termYears: number;
  notes: string | null;
}

interface Props {
  initial?: InitialContract;
  triggerLabel?: string;
  triggerVariant?: "default" | "ghost" | "outline";
}

function dateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function ContractDialog({
  initial,
  triggerLabel,
  triggerVariant = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(initial);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={triggerVariant} size={isEdit ? "sm" : "default"} />
        }
      >
        {isEdit ? (
          (triggerLabel ?? "Edit")
        ) : (
          <>
            <Plus className="size-4" />
            {triggerLabel ?? "Set up tracking"}
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit mileage contract" : "Set up mileage tracking"}
          </DialogTitle>
          <DialogDescription>
            Your PCP/lease allowance and where tracking starts from.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ContractForm
            initial={initial}
            isEdit={isEdit}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ContractForm({
  initial,
  isEdit,
  onDone,
}: {
  initial?: InitialContract;
  isEdit: boolean;
  onDone: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [startDate, setStartDate] = useState(dateInputValue(initial?.startDate));
  const [startOdometer, setStartOdometer] = useState(
    initial?.startOdometer != null ? String(initial.startOdometer) : "0",
  );
  const [annualAllowance, setAnnualAllowance] = useState(
    initial?.annualAllowance != null ? String(initial.annualAllowance) : "8000",
  );
  const [termYears, setTermYears] = useState(
    initial?.termYears != null ? String(initial.termYears) : "4",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();

  const total =
    Number(annualAllowance || 0) * Number(termYears || 0);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (initial) {
          await updateContract(initial.id, formData);
          toast.success("Updated");
        } else {
          await createContract(formData);
          toast.success("Tracking set up");
        }
        onDone();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Vehicle / contract</Label>
        <Input
          id="label"
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Honda Civic PCP"
          required
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Tracking starts</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startOdometer">Starting odometer</Label>
          <Input
            id="startOdometer"
            name="startOdometer"
            type="number"
            step="1"
            min="0"
            value={startOdometer}
            onChange={(e) => setStartOdometer(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="annualAllowance">Annual allowance (mi)</Label>
          <Input
            id="annualAllowance"
            name="annualAllowance"
            type="number"
            step="100"
            min="1"
            value={annualAllowance}
            onChange={(e) => setAnnualAllowance(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="termYears">Term (years)</Label>
          <Input
            id="termYears"
            name="termYears"
            type="number"
            step="1"
            min="1"
            max="20"
            value={termYears}
            onChange={(e) => setTermYears(e.target.value)}
            required
          />
        </div>
      </div>

      {total > 0 ? (
        <p className="text-[12px] text-muted-foreground">
          Total allowance over the term:{" "}
          <span className="font-mono tabular-nums text-foreground">
            {total.toLocaleString("en-GB")} miles
          </span>
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Optional — e.g. excess mileage charge per mile"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Start tracking"}
        </Button>
      </DialogFooter>
    </form>
  );
}
