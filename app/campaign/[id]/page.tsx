import CampaignWorkspace from "@/app/campaign/[id]/campaign-workspace";
import { isCampaignVisibleInList } from "@/utils/campaign-visibility";
import { createClient } from "@/utils/supabase/server";
import { appRobots } from "@/utils/site-metadata";
import type { Campaign, Slide, SlideImage } from "@/types/campaign";
import type { PlatformCaption } from "@/types/captions";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import { resolveVoicePersona } from "@/utils/tts/voice-catalog";
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

  const slides = slidesResult.data ?? [];
  const captions = captionsResult.data;
  const typedCampaign = campaign as Campaign;

  if (!isCampaignVisibleInList(typedCampaign.status) && slides.length === 0) {
    redirect("/campaigns");
  }

  const slideIds = slides.map((slide) => slide.id);

  let slideImages: SlideImage[] = [];

  if (slideIds.length > 0) {
    const { data } = await supabase
      .from("slide_images")
      .select("*")
      .in("slide_id", slideIds);

    slideImages = (data ?? []) as SlideImage[];
  }

  let brandName: string | null = null;
  let initialPreferredVoicePersona: VoicePersona = "warm";

  if (typedCampaign.brand_id) {
    const { data: brand } = await supabase
      .from("brands")
      .select("name, preferred_voice_persona")
      .eq("id", typedCampaign.brand_id)
      .eq("user_id", user.id)
      .maybeSingle();

    brandName = brand?.name ?? null;

    const resolvedPersona = resolveVoicePersona(brand?.preferred_voice_persona ?? "");
    if (resolvedPersona) {
      initialPreferredVoicePersona = resolvedPersona;
    }
  }

  return (
    <CampaignWorkspace
      initialCampaign={typedCampaign}
      initialSlides={slides as Slide[]}
      initialSlideImages={slideImages}
      initialCaptions={(captions ?? []) as PlatformCaption[]}
      userId={user.id}
      brandName={brandName}
      initialPreferredVoicePersona={initialPreferredVoicePersona}
    />
  );
}
