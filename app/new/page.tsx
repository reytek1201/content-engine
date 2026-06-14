import NewCampaignContent from "@/app/new/new-campaign-content";
import { createClient } from "@/utils/supabase/server";
import { appRobots } from "@/utils/site-metadata";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New campaign",
  robots: appRobots,
};

export default async function NewCampaignPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/new");
  }

  return <NewCampaignContent user={user} />;
}
