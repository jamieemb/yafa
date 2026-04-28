import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./_components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-8">
      <div className="border-b pb-6">
        <p className="label-eyebrow">Configuration</p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
          Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-1.5">
          Discretionary allocation rules and gift-budget defaults.
        </p>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
