"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPEND_CATEGORIES, type SpendCategory } from "@/lib/categories";
import { categoriseFromReview, dismissTransaction } from "../actions";

const PLACEHOLDER = "__choose__";

interface Props {
  id: string;
}

export function ReviewActions({ id }: Props) {
  const [value, setValue] = useState<string>(PLACEHOLDER);
  const [pending, startTransition] = useTransition();

  function onChange(next: string | null) {
    if (!next || next === PLACEHOLDER) return;
    const cat = next as SpendCategory;
    setValue(next);
    startTransition(async () => {
      try {
        const result = await categoriseFromReview(id, cat);
        if (result.cascaded > 0) {
          toast.success(
            `Categorised + ${result.cascaded} similar (rule: ${result.pattern})`,
          );
        } else if (result.pattern) {
          toast.success(`Categorised (rule: ${result.pattern})`);
        } else {
          toast.success("Categorised");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
        setValue(PLACEHOLDER);
      }
    });
  }

  function onDismiss() {
    startTransition(async () => {
      try {
        await dismissTransaction(id);
        toast.success("Dismissed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      <Select value={value} onValueChange={onChange} disabled={pending}>
        <SelectTrigger size="sm" className="w-44">
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          {SPEND_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Dismiss without categorising"
        onClick={onDismiss}
        disabled={pending}
        className="text-muted-foreground"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
