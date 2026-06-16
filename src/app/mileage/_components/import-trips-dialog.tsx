"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importTrips } from "../trip-actions";

interface Props {
  contractId: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "ghost" | "outline";
}

export function ImportTripsDialog({
  contractId,
  triggerLabel,
  triggerVariant = "default",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} />}>
        <Upload className="size-4" />
        {triggerLabel ?? "Import trips"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import trip history</DialogTitle>
          <DialogDescription>
            Upload your vehicle&apos;s trip-history CSV. Re-uploading is safe —
            trips already recorded are skipped.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ImportForm contractId={contractId} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ImportForm({
  contractId,
  onDone,
}: {
  contractId: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await importTrips(contractId, formData);
        toast.success(
          `Imported ${res.imported} trip${res.imported === 1 ? "" : "s"}` +
            (res.skipped
              ? `, skipped ${res.skipped} duplicate${res.skipped === 1 ? "" : "s"}`
              : ""),
        );
        onDone();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">CSV file</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          The export with Start/End ODO, dates and Lat/Lon columns.
        </p>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Importing…" : "Import"}
        </Button>
      </DialogFooter>
    </form>
  );
}
