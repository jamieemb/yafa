"use client";

import { useTransition } from "react";
import Button from "@mui/material/Button";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import { toast } from "@/components/toast";
import { copyEntriesFromMonth } from "../actions";

interface Props {
  targetMonthIso: string;
  sourceMonthIso: string;
  sourceLabel: string;
}

/** Clones last month's income entries into the month being viewed. */
export function CopyFromButton({ targetMonthIso, sourceMonthIso, sourceLabel }: Props) {
  const [pending, startTransition] = useTransition();

  function onCopy() {
    startTransition(async () => {
      try {
        const cloned = await copyEntriesFromMonth(targetMonthIso, sourceMonthIso);
        if (cloned === 0) {
          toast.info("Nothing new to copy", "Those entries already exist this month.");
        } else {
          toast.success(
            `Copied ${cloned} entr${cloned === 1 ? "y" : "ies"}`,
            `From ${sourceLabel} — add the paid dates once the money lands.`,
          );
        }
      } catch (err) {
        toast.error("Copy failed", err instanceof Error ? err.message : undefined);
      }
    });
  }

  return (
    <Button
      variant="tonal"
      startIcon={<ContentCopyOutlined />}
      onClick={onCopy}
      disabled={pending}
    >
      {pending ? "Copying…" : `Copy from ${sourceLabel}`}
    </Button>
  );
}
