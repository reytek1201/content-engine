import SettingsContent from "@/app/settings/settings-content";
import { createClient } from "@/utils/supabase/server";
import { appRobots } from "@/utils/site-metadata";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  robots: appRobots,
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <SettingsContent user={user} />;
}
