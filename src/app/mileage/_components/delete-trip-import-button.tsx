"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteTripImport } from "../trip-actions";

interface Props {
  id: string;
  filename: string;
  tripCount: number;
}

export function DeleteTripImportButton({ id, filename, tripCount }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      try {
        await deleteTripImport(id);
        toast.success("Import removed");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete import ${filename}`}
            className="text-muted-foreground hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove this import?</DialogTitle>
          <DialogDescription>
            The {tripCount} trip{tripCount === 1 ? "" : "s"} from
            &ldquo;{filename}&rdquo; will be deleted and the mileage metrics
            recalculated.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Removing…" : "Remove import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
