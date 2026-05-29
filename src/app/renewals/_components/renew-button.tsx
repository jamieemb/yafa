"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { advanceDueDate, type RenewalRecurrence } from "@/lib/admin";
import { markRenewed } from "../actions";

interface Props {
  id: string;
  recurrence: string;
  dueDate: Date;
}

// "Mark renewed" — rolls the due date forward by one recurrence period
// (or archives a one-off). Reversible via Edit, so no confirm step.
export function RenewButton({ id, recurrence, dueDate }: Props) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        await markRenewed(id);
        const next = advanceDueDate(dueDate, recurrence as RenewalRecurrence);
        toast.success(
          next
            ? `Renewed — next due ${format(next, "d MMM yyyy")}`
            : "Archived (one-off renewal)",
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={pending}
      aria-label="Mark renewed"
      title="Mark renewed — roll the due date forward"
      className="text-muted-foreground hover:text-primary"
    >
      <RefreshCw className="size-4" />
    </Button>
  );
}
