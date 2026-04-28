"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyEntriesFromMonth } from "../actions";

interface Props {
  targetMonthIso: string;
  sourceMonthIso: string;
  sourceLabel: string;
}

export function CopyFromButton({
  targetMonthIso,
  sourceMonthIso,
  sourceLabel,
}: Props) {
  const [pending, startTransition] = useTransition();

  function onCopy() {
    startTransition(async () => {
      try {
        const cloned = await copyEntriesFromMonth(targetMonthIso, sourceMonthIso);
        if (cloned === 0) {
          toast.info("Nothing new to copy — those entries already exist.");
        } else {
          toast.success(
            `Copied ${cloned} entr${cloned === 1 ? "y" : "ies"} from ${sourceLabel}`,
          );
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Copy failed");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onCopy}
      disabled={pending}
    >
      <Copy className="size-3.5" />
      {pending ? "Copying…" : `Copy from ${sourceLabel}`}
    </Button>
  );
}
