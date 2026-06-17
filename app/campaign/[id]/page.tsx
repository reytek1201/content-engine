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
  const typedCampaign = campaign as Campaign;

  let brandName: string | null = null;
  let initialPreferredVoicePersona: "warm" | "energetic" | "professional" = "warm";

  if (typedCampaign.brand_id) {
    const { data: brand } = await supabase
      .from("brands")
      .select("name, preferred_voice_persona")
      .eq("id", typedCampaign.brand_id)
      .eq("user_id", user.id)
      .maybeSingle();

    brandName = brand?.name ?? null;

    if (
      brand?.preferred_voice_persona === "warm" ||
      brand?.preferred_voice_persona === "energetic" ||
      brand?.preferred_voice_persona === "professional"
    ) {
      initialPreferredVoicePersona = brand.preferred_voice_persona;
    }
  }

  return (
    <CampaignWorkspace
      initialCampaign={typedCampaign}
      initialSlides={(slides ?? []) as Slide[]}
      initialCaptions={(captions ?? []) as PlatformCaption[]}
      userId={user.id}
      brandName={brandName}
      initialPreferredVoicePersona={initialPreferredVoicePersona}
    />
  );
}
