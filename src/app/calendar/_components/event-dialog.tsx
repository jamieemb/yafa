"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface Props {
  initial?: EventInitial;
  giftAmounts: { LOW: number; MEDIUM: number; HIGH: number };
  triggerLabel?: string;
  triggerVariant?: "default" | "ghost" | "outline";
}

const NONE = "__none__";

export function EventDialog({
  initial,
  giftAmounts,
  triggerLabel,
  triggerVariant = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(initial);

  const triggerContent = isEdit ? (
    triggerLabel ?? "Edit"
  ) : (
    <>
      <Plus className="size-4" />
      {triggerLabel ?? "Add event"}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={triggerVariant} size={isEdit ? "sm" : "default"} />
        }
      >
        {triggerContent}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit event" : "New event"}
          </DialogTitle>
          <DialogDescription>
            Birthdays, parties, one-off purchases. Importance auto-fills the
            budget from your settings.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <EventForm
            initial={initial}
            giftAmounts={giftAmounts}
            isEdit={isEdit}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
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
  giftAmounts: { LOW: number; MEDIUM: number; HIGH: number };
  isEdit: boolean;
  onDone: () => void;
}

function EventForm({ initial, giftAmounts, isEdit, onDone }: FormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(dateInputValue(initial?.date));
  const [recursAnnually, setRecursAnnually] = useState(
    initial?.recursAnnually ?? false,
  );
  const [importance, setImportance] = useState<string>(
    initial?.importance ?? NONE,
  );
  const [amountOverride, setAmountOverride] = useState(
    initial?.amount != null ? String(initial.amount) : "",
  );
  const [person, setPerson] = useState(initial?.person ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();

  // Effective amount preview: explicit override wins, else lookup by importance
  const effectiveAmount = (() => {
    if (amountOverride.trim() !== "") return Number(amountOverride);
    if (importance === "LOW") return giftAmounts.LOW;
    if (importance === "MEDIUM") return giftAmounts.MEDIUM;
    if (importance === "HIGH") return giftAmounts.HIGH;
    return 0;
  })();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("recursAnnually", recursAnnually ? "true" : "false");
    if (importance === NONE) {
      formData.delete("importance");
    } else {
      formData.set("importance", importance);
    }

    startTransition(async () => {
      try {
        if (initial) {
          await updateCalendarEvent(initial.id, formData);
          toast.success("Updated");
        } else {
          await createCalendarEvent(formData);
          toast.success("Added");
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
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sarah's birthday, Wedding party"
          required
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2 flex flex-col">
          <Label>Recurs annually</Label>
          <div className="flex items-center gap-2 h-9">
            <Switch
              checked={recursAnnually}
              onCheckedChange={setRecursAnnually}
            />
            <span className="text-[12px] text-muted-foreground">
              {recursAnnually ? "Every year" : "One-off"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="importance">Importance</Label>
          <Select
            value={importance}
            onValueChange={(v) => setImportance(v ?? NONE)}
          >
            <SelectTrigger id="importance" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>
                <span className="text-muted-foreground">No tier</span>
              </SelectItem>
              {IMPORTANCE_LEVELS.map((lvl) => (
                <SelectItem key={lvl} value={lvl}>
                  <div className="flex items-baseline justify-between gap-3 w-full">
                    <span>{IMPORTANCE_LABELS[lvl]}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      £{giftAmounts[lvl as ImportanceLevel].toFixed(0)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount override (£)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            value={amountOverride}
            onChange={(e) => setAmountOverride(e.target.value)}
            placeholder="optional"
          />
        </div>
      </div>

      {effectiveAmount > 0 ? (
        <p className="text-[11px] text-muted-foreground -mt-2">
          Budget: <span className="font-mono tabular-nums">{formatGBP(effectiveAmount)}</span>
          {amountOverride.trim() !== ""
            ? " (manual override)"
            : importance !== NONE
              ? ` (from ${IMPORTANCE_LABELS[importance as ImportanceLevel]} tier)`
              : ""}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground -mt-2">
          No budget allocated.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="person">Person (optional)</Label>
        <Input
          id="person"
          name="person"
          placeholder="e.g. Mum, Sarah"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          maxLength={120}
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
          {pending ? "Saving…" : isEdit ? "Save" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}
