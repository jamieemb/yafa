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
  BUDGET_CATEGORIES,
  FREQUENCIES,
  FREQUENCY_LABELS,
} from "@/lib/categories";
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
  initial?: InitialItem;
  accountOptions?: string[];
  triggerLabel?: string;
  triggerVariant?: "default" | "ghost" | "outline";
}

export function RecurringDialog({
  initial,
  accountOptions = [],
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
      {triggerLabel ?? "New item"}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size={isEdit ? "sm" : "default"}
          />
        }
      >
        {triggerContent}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit recurring item" : "New recurring item"}
          </DialogTitle>
          <DialogDescription>
            A bill, subscription, finance payment, or budget allocation.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RecurringForm
            initial={initial}
            accountOptions={accountOptions}
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
  initial?: InitialItem;
  accountOptions: string[];
  isEdit: boolean;
  onDone: () => void;
}

function RecurringForm({ initial, accountOptions, isEdit, onDone }: FormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(
    initial?.amount !== undefined ? String(initial.amount) : "",
  );
  const [budgetCategory, setBudgetCategory] = useState(
    initial?.budgetCategory ?? BUDGET_CATEGORIES[0],
  );
  const [bankAccount, setBankAccount] = useState(initial?.bankAccount ?? "");
  const [frequency, setFrequency] = useState(initial?.frequency ?? "MONTHLY");
  const [dayOfMonth, setDayOfMonth] = useState(
    initial?.dayOfMonth != null ? String(initial.dayOfMonth) : "",
  );
  const [endDate, setEndDate] = useState(dateInputValue(initial?.endDate));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("active", active ? "true" : "false");
    formData.set("direction", "OUT");

    startTransition(async () => {
      try {
        if (initial) {
          await updateRecurringItem(initial.id, formData);
          toast.success("Updated");
        } else {
          await createRecurringItem(formData);
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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (£)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="frequency">Frequency</Label>
          <Select
            name="frequency"
            value={frequency}
            onValueChange={(v) => setFrequency(v ?? "MONTHLY")}
          >
            <SelectTrigger id="frequency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((f) => (
                <SelectItem key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="budgetCategory">Pot</Label>
          <Select
            name="budgetCategory"
            value={budgetCategory}
            onValueChange={(v) => setBudgetCategory(v ?? BUDGET_CATEGORIES[0])}
          >
            <SelectTrigger id="budgetCategory" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankAccount">Bank account</Label>
          <Input
            id="bankAccount"
            name="bankAccount"
            list="recurring-account-options"
            placeholder="e.g. Monzo Joint"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            maxLength={60}
          />
          <datalist id="recurring-account-options">
            {accountOptions.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dayOfMonth">Day of month</Label>
          <Input
            id="dayOfMonth"
            name="dayOfMonth"
            type="number"
            min={1}
            max={31}
            placeholder="optional"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Final payment</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank for ongoing
          </p>
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
        <Switch
          id="active"
          checked={active}
          onCheckedChange={setActive}
        />
        <Label htmlFor="active" className="cursor-pointer">
          Active
        </Label>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onDone}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
