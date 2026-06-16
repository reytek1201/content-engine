import CampaignWorkspace from "@/app/campaign/[id]/campaign-workspace";
import { createClient } from "@/utils/supabase/server";
import { appRobots } from "@/utils/site-metadata";
import type { Campaign, Slide } from "@/types/campaign";
import type { PlatformCaption } from "@/types/captions";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campaign",
  robots: appRobots,
};

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
    redirect("/login");
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (campaignError || !campaign) {
    notFound();
  }

  const [slidesResult, captionsResult] = await Promise.all([
    supabase
      .from("slides")
      .select("id, campaign_id, slide_index, text_overlay, voiceover_script, image_url, fal_request_id, created_at, updated_at")
      .eq("campaign_id", id)
      .order("slide_index", { ascending: true }),
    supabase
      .from("platform_captions")
      .select("*")
      .eq("campaign_id", id)
      .order("platform", { ascending: true }),
  ]);

  if (slidesResult.error) {
    notFound();
  }

  const slides = slidesResult.data;
  const captions = captionsResult.data;

  return (
    <CampaignWorkspace
      initialCampaign={campaign as Campaign}
      initialSlides={(slides ?? []) as Slide[]}
      initialCaptions={(captions ?? []) as PlatformCaption[]}
      userId={user.id}
    />
  );
}
