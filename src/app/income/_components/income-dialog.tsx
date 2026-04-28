"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";
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
import { createIncomeEntry, updateIncomeEntry } from "../actions";

export interface IncomeInitial {
  id: string;
  month: Date;
  paidDate: Date | null;
  person: string | null;
  label: string;
  amount: number;
  bankAccount: string | null;
  notes: string | null;
}

interface Props {
  initial?: IncomeInitial;
  defaultMonthIso: string; // "YYYY-MM"
  personOptions?: string[];
  accountOptions?: string[];
  triggerLabel?: string;
  triggerVariant?: "default" | "ghost" | "outline";
}

export function IncomeDialog({
  initial,
  defaultMonthIso,
  personOptions = [],
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
      {triggerLabel ?? "Add income"}
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
            {isEdit ? "Edit income entry" : "New income entry"}
          </DialogTitle>
          <DialogDescription>
            Pay landing in the last week of a month usually funds the next
            budget month — we&apos;ll suggest the right one based on the
            date paid.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <IncomeForm
            initial={initial}
            defaultMonthIso={defaultMonthIso}
            personOptions={personOptions}
            accountOptions={accountOptions}
            isEdit={isEdit}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function monthInputValue(d: Date | null | undefined, fallback: string): string {
  if (!d) return fallback;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function dateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayLocalIso(): string {
  return dateInputValue(new Date());
}

// "If paid in the last 11 days of the month, treat as next month's
// budget" — covers everything from a 20th payday onward.
function inferBudgetMonthIsoFromPaidDate(paidIso: string): string {
  if (!paidIso) return "";
  const [y, m, d] = paidIso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const lateInMonth = d >= 20;
  const monthIndex = lateInMonth ? m : m - 1;
  const date = new Date(Date.UTC(y, monthIndex, 1));
  return monthInputValue(date, "");
}

interface FormProps {
  initial?: IncomeInitial;
  defaultMonthIso: string;
  personOptions: string[];
  accountOptions: string[];
  isEdit: boolean;
  onDone: () => void;
}

function IncomeForm({
  initial,
  defaultMonthIso,
  personOptions,
  accountOptions,
  isEdit,
  onDone,
}: FormProps) {
  // For new entries, default paidDate to today and let it drive the
  // budget month. For edits, use whatever's stored.
  const initialPaidIso = initial
    ? dateInputValue(initial.paidDate)
    : todayLocalIso();
  const initialMonthIso = initial
    ? monthInputValue(initial.month, defaultMonthIso)
    : initialPaidIso
      ? inferBudgetMonthIsoFromPaidDate(initialPaidIso) || defaultMonthIso
      : defaultMonthIso;

  const [paidDate, setPaidDate] = useState(initialPaidIso);
  const [month, setMonth] = useState(initialMonthIso);
  // Lock auto-update once the user has manually changed the month, so
  // their override isn't overwritten when they tweak paidDate after.
  const [monthIsAuto, setMonthIsAuto] = useState(!isEdit);

  const [person, setPerson] = useState(initial?.person ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [amount, setAmount] = useState(
    initial?.amount !== undefined ? String(initial.amount) : "",
  );
  const [bankAccount, setBankAccount] = useState(initial?.bankAccount ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();

  function onPaidDateChange(next: string) {
    setPaidDate(next);
    if (monthIsAuto && next) {
      const inferred = inferBudgetMonthIsoFromPaidDate(next);
      if (inferred) setMonth(inferred);
    }
  }

  function onMonthChange(next: string) {
    setMonth(next);
    setMonthIsAuto(false);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("month", `${month}-01T00:00:00Z`);
    formData.set("paidDate", paidDate ? `${paidDate}T00:00:00Z` : "");

    startTransition(async () => {
      try {
        if (initial) {
          await updateIncomeEntry(initial.id, formData);
          toast.success("Updated");
        } else {
          await createIncomeEntry(formData);
          toast.success("Added");
        }
        onDone();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  // Friendly preview line for the user
  let preview = "";
  if (paidDate && month) {
    const [y, m] = month.split("-").map(Number);
    const monthLabel = format(new Date(y!, (m ?? 1) - 1, 1), "MMMM yyyy");
    const paidLabel = format(new Date(paidDate), "d MMM");
    preview = `Paid ${paidLabel} → applied to ${monthLabel} budget`;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="paidDate">Paid on</Label>
          <Input
            id="paidDate"
            type="date"
            value={paidDate}
            onChange={(e) => onPaidDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="month">Budget month</Label>
          <Input
            id="month"
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            required
          />
        </div>
      </div>

      {preview ? (
        <p className="text-[11px] text-muted-foreground -mt-2">{preview}</p>
      ) : null}

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
          <Label htmlFor="person">Person</Label>
          <Input
            id="person"
            name="person"
            list="income-person-options"
            placeholder="e.g. Jamie"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            maxLength={60}
          />
          <datalist id="income-person-options">
            {personOptions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          name="label"
          placeholder="e.g. Salary, On-call"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankAccount">Lands in</Label>
        <Input
          id="bankAccount"
          name="bankAccount"
          list="income-account-options"
          placeholder="e.g. Monzo Joint"
          value={bankAccount}
          onChange={(e) => setBankAccount(e.target.value)}
          maxLength={60}
        />
        <datalist id="income-account-options">
          {accountOptions.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
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
        <Button
          type="button"
          variant="ghost"
          onClick={onDone}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}
