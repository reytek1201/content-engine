import BrandsManager from "@/app/components/brands-manager";
import SettingsSubpageShell from "@/app/settings/settings-subpage-shell";
import { createClient } from "@/utils/supabase/server";
import { appRobots } from "@/utils/site-metadata";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brands",
  robots: appRobots,
};

export default async function BrandsSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SettingsSubpageShell
      title="Brands"
      description="Manage workspaces for each brand you create content for."
    >
      <BrandsManager />
    </SettingsSubpageShell>
  );
}
