import WidgetSettings from "@/app/components/widget-settings";
import SettingsSubpageShell from "@/app/settings/settings-subpage-shell";
import { appRobots } from "@/utils/site-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Widgets",
  robots: appRobots,
};

export default function WidgetsSettingsPage() {
  return (
    <SettingsSubpageShell
      title="Widgets"
      description="Add SlidePress to your home screen and see campaign progress at a glance."
    >
      <WidgetSettings />
    </SettingsSubpageShell>
  );
}
