"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATEMENT_SOURCES,
  STATEMENT_SOURCE_LABELS,
  type StatementSource,
} from "@/lib/categories";
import { importStatement } from "../actions";

export function ImportForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [source, setSource] = useState<StatementSource>("NATWEST");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("source", source);

    startTransition(async () => {
      try {
        const result = await importStatement(formData);
        toast.success(
          `Imported ${result.imported}` +
            (result.skipped ? ` · skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}` : "") +
            (result.payments
              ? ` · ${result.payments} payment${result.payments === 1 ? "" : "s"} hidden`
              : "") +
            (result.refunds
              ? ` · ${result.refunds} refund${result.refunds === 1 ? "" : "s"}`
              : "") +
            (result.autoCategorised
              ? ` · auto-categorised ${result.autoCategorised}`
              : "") +
            (result.needsReview
              ? ` · ${result.needsReview} need review`
              : ""),
        );
        formRef.current?.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="rounded-lg border bg-card p-6 space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <div className="space-y-2">
          <Label htmlFor="file">Statement CSV</Label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80 file:cursor-pointer cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Provider</Label>
          <Select
            name="source"
            value={source}
            onValueChange={(v) => setSource((v ?? "NATWEST") as StatementSource)}
          >
            <SelectTrigger id="source" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATEMENT_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATEMENT_SOURCE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Upload className="size-4" />
          {pending ? "Importing…" : "Import"}
        </Button>
      </div>
    </form>
  );
}
