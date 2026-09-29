"use client";

import { useTransition } from "react";
import Button from "@mui/material/Button";
import { toast } from "@/components/toast";
import { reopenPlan } from "../actions";

/** Clears the month's ticks so the wizard can be run again. */
export function ReopenButton({ monthIso }: { monthIso: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      color="inherit"
      size="small"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await reopenPlan(monthIso);
            toast.success("Setup reopened");
          } catch (err) {
            toast.error("Could not reopen", err instanceof Error ? err.message : undefined);
          }
        })
      }
    >
      Run again
    </Button>
  );
}
