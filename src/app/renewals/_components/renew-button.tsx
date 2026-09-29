"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AutorenewRounded from "@mui/icons-material/AutorenewRounded";
import { toast } from "@/components/toast";
import { advanceDueDate, type RenewalRecurrence } from "@/lib/admin";
import { markRenewed } from "../actions";

interface Props {
  id: string;
  title: string;
  recurrence: string;
  dueDate: Date;
}

// "Mark renewed" — rolls the due date forward by one recurrence period
// (or archives a one-off). Reversible via Edit, so no confirm step.
export function RenewButton({ id, title, recurrence, dueDate }: Props) {
  const [pending, startTransition] = useTransition();
  const isOneOff = recurrence === "NONE";

  function onClick() {
    startTransition(async () => {
      try {
        await markRenewed(id);
        const next = advanceDueDate(dueDate, recurrence as RenewalRecurrence);
        if (next) {
          toast.success(`Renewed — next due ${format(next, "d MMM yyyy")}`, title);
        } else {
          toast.success("Archived", `${title} was a one-off renewal`);
        }
      } catch (err) {
        toast.error("Could not mark renewed", err instanceof Error ? err.message : undefined);
      }
    });
  }

  const label = isOneOff ? `Mark ${title} done` : `Mark ${title} renewed`;

  return (
    <Tooltip
      title={isOneOff ? "Mark done — archives this one-off" : "Mark renewed — rolls the due date forward"}
    >
      {/* span keeps the tooltip working while the button is disabled */}
      <span>
        <IconButton size="small" aria-label={label} onClick={onClick} disabled={pending}>
          <AutorenewRounded fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}
