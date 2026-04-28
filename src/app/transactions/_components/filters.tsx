"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  STATEMENT_SOURCES,
  STATEMENT_SOURCE_LABELS,
  SPEND_CATEGORIES,
} from "@/lib/categories";

const ANY = "__any__";
const UNCAT = "__uncategorised__";

export function TransactionFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const source = params.get("source") ?? ANY;
  const category = params.get("category") ?? ANY;
  const review = params.get("review") === "1";
  const showPayments = params.get("payments") === "1";
  const showSettled = params.get("settled") === "1";

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `/transactions?${qs}` : "/transactions");
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Source</Label>
        <Select
          value={source}
          onValueChange={(v) => update({ source: v === ANY ? null : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All sources</SelectItem>
            {STATEMENT_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATEMENT_SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Category</Label>
        <Select
          value={category}
          onValueChange={(v) => update({ category: v === ANY ? null : v })}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All categories</SelectItem>
            <SelectItem value={UNCAT}>Uncategorised</SelectItem>
            {SPEND_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 pb-1.5">
        <Switch
          id="review-only"
          checked={review}
          onCheckedChange={(v) => update({ review: v ? "1" : null })}
        />
        <Label htmlFor="review-only" className="cursor-pointer">
          Needs review only
        </Label>
      </div>
      <div className="flex items-center gap-2 pb-1.5">
        <Switch
          id="show-payments"
          checked={showPayments}
          onCheckedChange={(v) => update({ payments: v ? "1" : null })}
        />
        <Label htmlFor="show-payments" className="cursor-pointer">
          Show payments &amp; refunds
        </Label>
      </div>
      <div className="flex items-center gap-2 pb-1.5">
        <Switch
          id="show-settled"
          checked={showSettled}
          onCheckedChange={(v) => update({ settled: v ? "1" : null })}
        />
        <Label htmlFor="show-settled" className="cursor-pointer">
          Show settled
        </Label>
      </div>
    </div>
  );
}
