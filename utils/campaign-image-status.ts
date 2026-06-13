import { createClient } from "@/utils/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function markCampaignFailed(
  supabase: SupabaseServerClient,
  campaignId: string,
  message: string
) {
  await supabase
    .from("campaigns")
    .update({ status: "failed", error_message: message })
    .eq("id", campaignId);
}

export async function refreshCampaignImageStatus(
  supabase: SupabaseServerClient,
  campaignId: string
) {
  const { data: slides } = await supabase
    .from("slides")
    .select("image_url")
    .eq("campaign_id", campaignId);

  const allComplete =
    slides &&
    slides.length > 0 &&
    slides.every((slide) => Boolean(slide.image_url));

  await supabase
    .from("campaigns")
    .update({
      status: allComplete ? "completed" : "generating_images",
      error_message: null,
    })
    .eq("id", campaignId);
}
