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
import { createPerson, updatePerson } from "../actions";

export interface PersonInitial {
  id: string;
  name: string;
  importance: string;
  birthday: Date | null;
  notes: string | null;
}

interface Props {
  initial?: PersonInitial;
  giftAmounts: { LOW: number; MEDIUM: number; HIGH: number };
  triggerLabel?: string;
  triggerVariant?: "default" | "ghost" | "outline";
}

export function PersonDialog({
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
      {triggerLabel ?? "Add person"}
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
          <DialogTitle>{isEdit ? "Edit person" : "New person"}</DialogTitle>
          <DialogDescription>
            Importance drives the default gift budget. Add a birthday and it
            shows up on the calendar.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <PersonForm
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
  initial?: PersonInitial;
  giftAmounts: { LOW: number; MEDIUM: number; HIGH: number };
  isEdit: boolean;
  onDone: () => void;
}

function PersonForm({ initial, giftAmounts, isEdit, onDone }: FormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [importance, setImportance] = useState<ImportanceLevel>(
    (initial?.importance as ImportanceLevel) ?? "MEDIUM",
  );
  const [birthday, setBirthday] = useState(dateInputValue(initial?.birthday));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("importance", importance);

    startTransition(async () => {
      try {
        if (initial) {
          await updatePerson(initial.id, formData);
          toast.success("Updated");
        } else {
          await createPerson(formData);
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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mum, Sarah"
          required
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="importance">Importance</Label>
          <Select
            value={importance}
            onValueChange={(v) => setImportance((v ?? "MEDIUM") as ImportanceLevel)}
          >
            <SelectTrigger id="importance" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMPORTANCE_LEVELS.map((lvl) => (
                <SelectItem key={lvl} value={lvl}>
                  <div className="flex items-baseline justify-between gap-3 w-full">
                    <span>{IMPORTANCE_LABELS[lvl]}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      £{giftAmounts[lvl].toFixed(0)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthday">Birthday</Label>
          <Input
            id="birthday"
            name="birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            placeholder="optional"
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground -mt-2">
        Default gift budget:{" "}
        <span className="font-mono tabular-nums">
          {formatGBP(giftAmounts[importance])}
        </span>{" "}
        ({IMPORTANCE_LABELS[importance]} tier)
      </p>

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
