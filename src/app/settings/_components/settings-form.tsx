"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import { toast } from "@/components/toast";
import { SectionHeader } from "@/components/page-header";
import { useAppTheme } from "@/components/theme-registry";
import { THEMES, THEME_DESCRIPTIONS, THEME_LABELS, type Theme } from "@/lib/themes";
import { updateSettings } from "../actions";

interface Props {
  initial: {
    savingsPercent: number; // 0..1
    investPercent: number;
    freePercent: number;
    giftLow: number;
    giftMedium: number;
    giftHigh: number;
    theme: Theme;
  };
}

function pct(v: number): string {
  return String(Math.round(v * 1000) / 10);
}

export function SettingsForm({ initial }: Props) {
  const router = useRouter();
  const { preference, setPreference } = useAppTheme(initial.theme);
  const [pending, startTransition] = useTransition();

  // Percentages are edited as 0..100 and stored as 0..1 server-side.
  const [savings, setSavings] = useState(pct(initial.savingsPercent));
  const [invest, setInvest] = useState(pct(initial.investPercent));
  const [free, setFree] = useState(pct(initial.freePercent));
  const [low, setLow] = useState(String(initial.giftLow));
  const [medium, setMedium] = useState(String(initial.giftMedium));
  const [high, setHigh] = useState(String(initial.giftHigh));

  const sum = useMemo(
    () => (Number(savings) || 0) + (Number(invest) || 0) + (Number(free) || 0),
    [savings, invest, free],
  );
  const sumOk = Math.abs(sum - 100) < 0.01;

  function resetSplit() {
    setSavings("40");
    setInvest("35");
    setFree("25");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sumOk) {
      toast.error("Splits must total 100%", `Currently ${sum.toFixed(1)}%`);
      return;
    }
    const fd = new FormData();
    fd.set("savingsPercent", savings);
    fd.set("investPercent", invest);
    fd.set("freePercent", free);
    fd.set("giftLow", low);
    fd.set("giftMedium", medium);
    fd.set("giftHigh", high);
    fd.set("theme", preference);

    startTransition(async () => {
      try {
        await updateSettings(fd);
        router.refresh();
        toast.success("Settings saved");
      } catch (err) {
        toast.error("Could not save settings", err instanceof Error ? err.message : undefined);
      }
    });
  }

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Stack spacing={4}>
        <section>
          <SectionHeader eyebrow="Appearance" title="Theme" meta="Applies immediately" />
          <Card>
            <CardContent>
              <FormControl component="fieldset" fullWidth>
                <RadioGroup
                  name="theme"
                  aria-label="Colour scheme"
                  value={preference}
                  onChange={(_, value) => setPreference(value as Theme)}
                >
                  {THEMES.map((t) => (
                    <FormControlLabel
                      key={t}
                      value={t}
                      control={<Radio />}
                      sx={{ alignItems: "flex-start", py: 0.75, mr: 0 }}
                      label={
                        <Box sx={{ pt: "9px" }}>
                          <Typography variant="body1">{THEME_LABELS[t]}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {THEME_DESCRIPTIONS[t]}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>
        </section>

        <section>
          <SectionHeader eyebrow="Discretionary split" title="After bills are paid" meta="Must total 100%" />
          <Card>
            <CardContent>
              <Stack spacing={2.5}>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}>
                  <PercentField id="savingsPercent" label="Savings" value={savings} onChange={setSavings} />
                  <PercentField id="investPercent" label="Investments" value={invest} onChange={setInvest} />
                  <PercentField id="freePercent" label="Free spend" value={free} onChange={setFree} />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Typography variant="body2" color={sumOk ? "text.secondary" : "error"} className="tabular">
                    Total: {sum.toFixed(1)}%
                  </Typography>
                  <Button size="small" startIcon={<RestartAltRounded />} onClick={resetSplit}>
                    Reset to 40 / 35 / 25
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </section>

        <section>
          <SectionHeader eyebrow="Gift budgets" title="By importance" meta="Default per tier" />
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}>
                  <MoneyField id="giftLow" label="Low" value={low} onChange={setLow} />
                  <MoneyField id="giftMedium" label="Medium" value={medium} onChange={setMedium} />
                  <MoneyField id="giftHigh" label="High" value={high} onChange={setHigh} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Calendar events and people use these defaults when an importance is set.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </section>

        <Box sx={{ display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" } }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            startIcon={<SaveRounded />}
            disabled={pending || !sumOk}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function PercentField({ id, label, value, onChange }: FieldProps) {
  return (
    <TextField
      id={id}
      label={label}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode="decimal"
      slotProps={{
        input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
        htmlInput: { min: 0, max: 100, step: 0.1 },
      }}
    />
  );
}

function MoneyField({ id, label, value, onChange }: FieldProps) {
  return (
    <TextField
      id={id}
      label={label}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode="decimal"
      slotProps={{
        input: { startAdornment: <InputAdornment position="start">£</InputAdornment> },
        htmlInput: { min: 0, step: 1 },
      }}
    />
  );
}
