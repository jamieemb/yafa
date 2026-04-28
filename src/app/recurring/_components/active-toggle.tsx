"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setRecurringItemActive } from "../actions";

interface Props {
  id: string;
  active: boolean;
}

export function ActiveToggle({ id, active }: Props) {
  const [pending, startTransition] = useTransition();

  function onChange(next: boolean) {
    startTransition(async () => {
      try {
        await setRecurringItemActive(id, next);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  return (
    <Switch
      checked={active}
      onCheckedChange={onChange}
      disabled={pending}
      size="sm"
      aria-label="Toggle active"
    />
  );
}
