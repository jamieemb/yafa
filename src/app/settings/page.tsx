import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./_components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Appearance, discretionary allocation rules and gift-budget defaults."
      />
      <SettingsForm initial={settings} />
    </>
  );
}
