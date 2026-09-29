"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import AddRounded from "@mui/icons-material/AddRounded";
import { toast } from "@/components/toast";
import { formatGBP } from "@/lib/money";
import { addIncomeFromSuggestion } from "../actions";

export interface IncomeSuggestion {
  key: string;
  label: string;
  person: string | null;
  amount: number;
  bankAccount: string | null;
  /** e.g. "August" — where the suggestion came from. */
  sourceMonth: string;
}

interface Props {
  monthIso: string;
  suggestions: IncomeSuggestion[];
}

/** "Add again" rows for income seen in earlier months but missing this month. */
export function IncomeSuggestions({ monthIso, suggestions }: Props) {
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function add(s: IncomeSuggestion) {
    startTransition(async () => {
      try {
        await addIncomeFromSuggestion(monthIso, {
          label: s.label,
          person: s.person,
          amount: s.amount,
          bankAccount: s.bankAccount,
        });
        setAdded((prev) => new Set(prev).add(s.key));
        toast.success("Added", `${s.person ? `${s.person} · ` : ""}${s.label} · ${formatGBP(s.amount)}`);
      } catch (err) {
        toast.error("Could not add income", err instanceof Error ? err.message : undefined);
      }
    });
  }

  const remaining = suggestions.filter((s) => !added.has(s.key));
  if (remaining.length === 0) return null;

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="p" sx={{ mb: 1 }}>
        From previous months
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {remaining.map((s) => (
          <Box
            key={s.key}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              py: 1,
              borderTop: "1px solid",
              borderColor: "divider",
              "&:first-of-type": { borderTop: 0 },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body1" noWrap>
                {s.person ? `${s.person} · ` : ""}
                {s.label}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                component="div"
                sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}
              >
                <span>
                  {formatGBP(s.amount)}
                  {s.bankAccount ? ` · ${s.bankAccount}` : ""}
                </span>
                <Chip size="small" variant="outlined" label={s.sourceMonth} sx={{ height: 18 }} />
              </Typography>
            </Box>
            <Button size="small" variant="tonal" startIcon={<AddRounded />} disabled={pending} onClick={() => add(s)}>
              Add
            </Button>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
