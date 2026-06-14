import NewCampaignContent from "@/app/new/new-campaign-content";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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
