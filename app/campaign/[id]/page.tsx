import CampaignWorkspace from "@/app/campaign/[id]/campaign-workspace";
import { createClient } from "@/utils/supabase/server";
import type { Campaign, Slide } from "@/types/campaign";
import type { PlatformCaption } from "@/types/captions";
import { notFound, redirect } from "next/navigation";

interface CampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (campaignError || !campaign) {
    notFound();
  }

  const { data: slides, error: slidesError } = await supabase
    .from("slides")
    .select("*")
    .eq("campaign_id", id)
    .order("slide_index", { ascending: true });

  if (slidesError) {
    notFound();
  }

  const { data: captions } = await supabase
    .from("platform_captions")
    .select("*")
    .eq("campaign_id", id)
    .order("platform", { ascending: true });

  return (
    <CampaignWorkspace
      initialCampaign={campaign as Campaign}
      initialSlides={(slides ?? []) as Slide[]}
      initialCaptions={(captions ?? []) as PlatformCaption[]}
    />
  );
}
