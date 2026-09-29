"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import {
  STATEMENT_SOURCES,
  STATEMENT_SOURCE_LABELS,
  SPEND_CATEGORIES,
} from "@/lib/categories";

const ANY = "__any__";
const UNCAT = "__uncategorised__";

/**
 * Filter toolbar. Every control writes straight to the URL search
 * params so the Server Component page re-queries with the new filter.
 */
export function TransactionFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const source = params.get("source") ?? ANY;
  const category = params.get("category") ?? ANY;
  const review = params.get("review") === "1";
  const showPayments = params.get("payments") === "1";
  const showSettled = params.get("settled") === "1";

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `/transactions?${qs}` : "/transactions");
    });
  }

  return (
    <Card component="section" aria-label="Filters" sx={{ position: "relative", overflow: "hidden" }}>
      {pending ? (
        <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0 }} />
      ) : null}
      <CardContent
        sx={{
          display: "grid",
          gap: 2,
          alignItems: "center",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "minmax(0, 220px) minmax(0, 240px) minmax(0, 1fr)",
          },
        }}
      >
        <TextField
          select
          size="small"
          label="Source"
          value={source}
          onChange={(e) => update({ source: e.target.value === ANY ? null : e.target.value })}
        >
          <MenuItem value={ANY}>All sources</MenuItem>
          {STATEMENT_SOURCES.map((s) => (
            <MenuItem key={s} value={s}>
              {STATEMENT_SOURCE_LABELS[s]}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Category"
          value={category}
          onChange={(e) => update({ category: e.target.value === ANY ? null : e.target.value })}
        >
          <MenuItem value={ANY}>All categories</MenuItem>
          <MenuItem value={UNCAT}>Uncategorised</MenuItem>
          {SPEND_CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 16px",
            gridColumn: { xs: "1 / -1", md: "auto" },
          }}
        >
          <FormControlLabel
            control={
              <Switch checked={review} onChange={(_, v) => update({ review: v ? "1" : null })} />
            }
            label="Needs review only"
            sx={{ ml: 0, gap: 1.5 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={showPayments}
                onChange={(_, v) => update({ payments: v ? "1" : null })}
              />
            }
            label="Show payments & refunds"
            sx={{ ml: 0, gap: 1.5 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={showSettled}
                onChange={(_, v) => update({ settled: v ? "1" : null })}
              />
            }
            label="Show settled"
            sx={{ ml: 0, gap: 1.5 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
