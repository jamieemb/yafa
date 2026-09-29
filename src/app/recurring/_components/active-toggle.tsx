"use client";

import { useOptimistic, useTransition } from "react";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import { toast } from "@/components/toast";
import { setRecurringItemActive } from "../actions";

interface Props {
  id: string;
  active: boolean;
  name: string;
}

export function ActiveToggle({ id, active, name }: Props) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(active);

  function onChange(next: boolean) {
    startTransition(async () => {
      setOptimistic(next);
      try {
        await setRecurringItemActive(id, next);
      } catch (err) {
        toast.error("Could not update", err instanceof Error ? err.message : undefined);
      }
    });
  }

  return (
    <Tooltip title={optimistic ? "Active — tap to pause" : "Paused — tap to activate"}>
      <Switch
        checked={optimistic}
        onChange={(_, v) => onChange(v)}
        disabled={pending}
        size="small"
        slotProps={{ input: { "aria-label": `${name} active` } }}
      />
    </Tooltip>
  );
}
