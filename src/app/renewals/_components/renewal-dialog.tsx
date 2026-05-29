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
  RENEWAL_CATEGORIES,
  RENEWAL_RECURRENCES,
  RENEWAL_RECURRENCE_LABELS,
} from "@/lib/admin";
import { createRenewal, updateRenewal } from "../actions";

interface InitialRenewal {
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
  initial?: InitialRenewal;
  subjectOptions?: string[];
  triggerLabel?: string;
  triggerVariant?: "default" | "ghost" | "outline";
}

export function RenewalDialog({
  initial,
  subjectOptions = [],
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
      {triggerLabel ?? "New renewal"}
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit renewal" : "New renewal"}</DialogTitle>
          <DialogDescription>
            Insurance, MOT, service, tax, a warranty or document expiry —
            anything with a renewal date.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RenewalForm
            initial={initial}
            subjectOptions={subjectOptions}
            isEdit={isEdit}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
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
  isEdit: boolean;
  onDone: () => void;
}

function RenewalForm({ initial, subjectOptions, isEdit, onDone }: FormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(
    initial?.category ?? RENEWAL_CATEGORIES[0],
  );
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [provider, setProvider] = useState(initial?.provider ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [dueDate, setDueDate] = useState(dateInputValue(initial?.dueDate));
  const [cost, setCost] = useState(
    initial?.cost != null ? String(initial.cost) : "",
  );
  const [recurrence, setRecurrence] = useState(initial?.recurrence ?? "ANNUAL");
  const [reminderDays, setReminderDays] = useState(
    initial?.reminderDays != null ? String(initial.reminderDays) : "30",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("active", active ? "true" : "false");

    startTransition(async () => {
      try {
        if (initial) {
          await updateRenewal(initial.id, formData);
          toast.success("Updated");
        } else {
          await createRenewal(formData);
          toast.success("Created");
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
          placeholder="e.g. Car insurance"
          required
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            name="category"
            value={category}
            onValueChange={(v) => setCategory(v ?? RENEWAL_CATEGORIES[0])}
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RENEWAL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            name="subject"
            list="renewal-subject-options"
            placeholder="e.g. Honda Civic, Home"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
          />
          <datalist id="renewal-subject-options">
            {subjectOptions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurrence">Recurrence</Label>
          <Select
            name="recurrence"
            value={recurrence}
            onValueChange={(v) => setRecurrence(v ?? "ANNUAL")}
          >
            <SelectTrigger id="recurrence" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RENEWAL_RECURRENCES.map((r) => (
                <SelectItem key={r} value={r}>
                  {RENEWAL_RECURRENCE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cost">Cost (£)</Label>
          <Input
            id="cost"
            name="cost"
            type="number"
            step="0.01"
            min="0"
            placeholder="optional"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reminderDays">Remind me (days before)</Label>
          <Input
            id="reminderDays"
            name="reminderDays"
            type="number"
            min={0}
            max={3650}
            value={reminderDays}
            onChange={(e) => setReminderDays(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Input
            id="provider"
            name="provider"
            placeholder="e.g. Aviva"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference">Reference</Label>
          <Input
            id="reference"
            name="reference"
            placeholder="Policy / account no."
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={120}
          />
        </div>
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

      <div className="flex items-center gap-2">
        <Switch id="active" checked={active} onCheckedChange={setActive} />
        <Label htmlFor="active" className="cursor-pointer">
          Active
        </Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
