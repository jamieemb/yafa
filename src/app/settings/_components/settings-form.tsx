"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  THEMES,
  THEME_LABELS,
  THEME_DESCRIPTIONS,
  THEME_PREVIEWS,
  type Theme,
} from "@/lib/themes";
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

export function SettingsForm({ initial }: Props) {
  // UI keeps percentages as 0..100 strings to feed number inputs; we
  // convert back to 0..1 server-side.
  const [savings, setSavings] = useState(
    Math.round(initial.savingsPercent * 1000) / 10 + "",
  );
  const [invest, setInvest] = useState(
    Math.round(initial.investPercent * 1000) / 10 + "",
  );
  const [free, setFree] = useState(
    Math.round(initial.freePercent * 1000) / 10 + "",
  );
  const [low, setLow] = useState(String(initial.giftLow));
  const [medium, setMedium] = useState(String(initial.giftMedium));
  const [high, setHigh] = useState(String(initial.giftHigh));
  const [theme, setTheme] = useState<Theme>(initial.theme);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const sum = useMemo(() => {
    const a = Number(savings) || 0;
    const b = Number(invest) || 0;
    const c = Number(free) || 0;
    return a + b + c;
  }, [savings, invest, free]);
  const sumOk = Math.abs(sum - 100) < 0.01;

  function resetSplit() {
    setSavings("40");
    setInvest("35");
    setFree("25");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sumOk) {
      toast.error(`Splits must total 100% — currently ${sum.toFixed(1)}%`);
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set("theme", theme);
    startTransition(async () => {
      try {
        await updateSettings(formData);
        // Pull a fresh RSC payload so the layout re-renders with the
        // new theme class on <html>, immediately re-skinning the page.
        router.refresh();
        toast.success("Settings saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <Section
        eyebrow="Discretionary split"
        title="After bills are paid"
        meta="Must total 100%"
      >
        <div className="grid grid-cols-3 gap-4">
          <Field
            label="Savings %"
            id="savingsPercent"
            value={savings}
            onChange={setSavings}
          />
          <Field
            label="Investments %"
            id="investPercent"
            value={invest}
            onChange={setInvest}
          />
          <Field
            label="Free spend %"
            id="freePercent"
            value={free}
            onChange={setFree}
          />
        </div>
        <div className="flex items-center justify-between gap-3 mt-2">
          <p
            className={`text-[11px] tabular-nums ${
              sumOk ? "text-muted-foreground" : "text-negative"
            }`}
          >
            Total: {sum.toFixed(1)}%
          </p>
          <button
            type="button"
            onClick={resetSplit}
            className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            Reset to recommended (40 / 35 / 25)
          </button>
        </div>
      </Section>

      <Section
        eyebrow="Appearance"
        title="Theme"
        meta="Applies on save"
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <ThemeCard
              key={t}
              theme={t}
              selected={theme === t}
              onSelect={() => setTheme(t)}
            />
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Gift budgets"
        title="By importance"
        meta="Default amount per tier (£)"
      >
        <div className="grid grid-cols-3 gap-4">
          <Field
            label="Low"
            id="giftLow"
            value={low}
            onChange={setLow}
            prefix="£"
          />
          <Field
            label="Medium"
            id="giftMedium"
            value={medium}
            onChange={setMedium}
            prefix="£"
          />
          <Field
            label="High"
            id="giftHigh"
            value={high}
            onChange={setHigh}
            prefix="£"
          />
        </div>
        <p className="text-[11px] mt-2 text-muted-foreground">
          Calendar events use these defaults when an importance is set.
        </p>
      </Section>

      <div className="flex justify-end gap-2 border-t pt-6">
        <Button type="submit" disabled={pending || !sumOk}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  eyebrow,
  title,
  meta,
  children,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-end justify-between gap-3 border-b pb-3">
        <div>
          <p className="label-eyebrow">{eyebrow}</p>
          <h2 className="text-base font-semibold mt-0.5">{title}</h2>
        </div>
        {meta ? (
          <p className="text-[11px] text-muted-foreground">{meta}</p>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: Theme;
  selected: boolean;
  onSelect: () => void;
}) {
  const preview = THEME_PREVIEWS[theme];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group relative rounded-md border p-3 text-left transition-colors",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "hover:border-foreground/30",
      )}
      style={{
        background: preview.bg,
        color: preview.bg === "#F0EEEB" ? "#13181B" : "#F8F8F2",
      }}
    >
      {/* Preview "card" inside the swatch */}
      <div
        className="rounded-sm p-2.5 mb-2"
        style={{ background: preview.card }}
      >
        <div className="flex gap-1.5">
          <Swatch color={preview.primary} />
          <Swatch color={preview.accent} />
          <Swatch color={preview.positive} />
          <Swatch color={preview.negative} />
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold">{THEME_LABELS[theme]}</p>
        {selected ? (
          <span
            className="rounded-full size-4 flex items-center justify-center"
            style={{ background: preview.primary, color: preview.bg }}
          >
            <Check className="size-2.5" strokeWidth={3} />
          </span>
        ) : null}
      </div>
      <p className="text-[11px] mt-0.5 opacity-70">
        {THEME_DESCRIPTIONS[theme]}
      </p>
    </button>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="size-4 rounded-sm shrink-0"
      style={{ background: color }}
    />
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  prefix,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {prefix ? `${label} (${prefix})` : label}
      </Label>
      <Input
        id={id}
        name={id}
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
}
