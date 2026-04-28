"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SPEND_CATEGORIES,
  type SpendCategory,
} from "@/lib/categories";
import { setTransactionCategory } from "../actions";

const UNCATEGORISED = "__uncategorised__";

interface Props {
  id: string;
  category: string | null;
  kind: string; // SPEND | PAYMENT | REFUND
}

export function CategoryCell({ id, category, kind }: Props) {
  const [pending, startTransition] = useTransition();

  // Payments and refunds aren't user-categorisable spend — they have a
  // fixed identity. Show a static label instead of the dropdown.
  if (kind === "PAYMENT") {
    return <KindLabel kind="payment" />;
  }
  if (kind === "REFUND") {
    return <KindLabel kind="refund" hint={category} />;
  }

  function onChange(next: string | null) {
    const cat = next === UNCATEGORISED || next === null ? null : (next as SpendCategory);
    startTransition(async () => {
      try {
        await setTransactionCategory(id, cat);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  return (
    <Select
      value={category ?? UNCATEGORISED}
      onValueChange={onChange}
      disabled={pending}
    >
      <SelectTrigger size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNCATEGORISED}>
          <span className="text-muted-foreground">Uncategorised</span>
        </SelectItem>
        {SPEND_CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function KindLabel({
  kind,
  hint,
}: {
  kind: "payment" | "refund";
  hint?: string | null;
}) {
  const label = kind === "payment" ? "Card Payment" : "Refund";
  const tone =
    kind === "payment"
      ? "bg-muted text-muted-foreground"
      : "bg-positive/15 text-positive";
  return (
    <div className="flex items-center gap-2">
      <span
        className={`rounded-sm text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 ${tone}`}
      >
        {label}
      </span>
      {hint ? (
        <span className="text-[11px] text-muted-foreground/70 truncate">
          offsets {hint}
        </span>
      ) : null}
    </div>
  );
}
