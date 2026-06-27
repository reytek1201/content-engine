import {
  createScheduledPlatformPost,
  getPlatformPostForCampaignExport,
  getPlatformPostForCampaignCarousel,
  isPlatformPostInFlight,
  isPlatformPostScheduled,
} from "@/utils/platform-post-store";
import { resolveVerticalVideoExport } from "@/utils/platforms/resolve-video-export";
import { resolveCarouselSlidesForCampaign } from "@/utils/platforms/resolve-carousel-slides";
import { assertPlatformPublishAllowed } from "@/utils/platform-connection-limits";
import { getYouTubeConnectionRow } from "@/utils/youtube/connection-store";
import { hasYouTubeUploadScope } from "@/utils/platforms/scopes";
import { getTikTokConnectionRow } from "@/utils/tiktok/connection-store";
import { hasTikTokPublishScope } from "@/utils/platforms/scopes";
import { getInstagramConnectionRow } from "@/utils/instagram/connection-store";
import { hasInstagramPublishScope } from "@/utils/platforms/scopes";
import { isUsageLimitError } from "@/utils/usage-limits";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TikTokPublishSettingsSchema = z.object({
  privacyLevel: z.string().min(1),
  title: z.string().min(1).max(2200),
  allowComment: z.boolean(),
  allowDuet: z.boolean(),
  allowStitch: z.boolean(),
  commercialDisclosure: z.boolean(),
  yourBrand: z.boolean(),
  brandedContent: z.boolean(),
});

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  platform: z.enum(["youtube", "tiktok", "instagram"]),
  /** Distinguish IG Reel (export-based) vs IG Carousel (null) */
  publishKind: z.enum(["video", "carousel"]).optional().default("video"),
  exportId: z.string().uuid().optional(),
  scheduledFor: z.string().datetime({ offset: true }),
  publishSettings: TikTokPublishSettingsSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { campaignId, platform, publishKind, exportId, scheduledFor, publishSettings } =
      parsed.data;

    const scheduledAt = new Date(scheduledFor);

    if (scheduledAt <= new Date()) {
      return NextResponse.json(
        { success: false, error: "Scheduled time must be in the future." },
        { status: 422 },
      );
    }

    await assertPlatformPublishAllowed(user.id, platform);

    // Ownership check
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, user_id")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Validate content is ready (same gating as "Post now")
    const isCarousel = platform === "instagram" && publishKind === "carousel";

    let resolvedExportId: string | null = null;

    if (isCarousel) {
      // Verify 4:5 images are ready (throws if not)
      await resolveCarouselSlidesForCampaign(supabase, campaignId);
    } else {
      try {
        const videoExport = await resolveVerticalVideoExport(
          supabase,
          campaignId,
          exportId,
        );
        resolvedExportId = videoExport.id;
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: "No completed video export found. Export a video first, then schedule.",
          },
          { status: 422 },
        );
      }
    }

    // Validate connection and scopes at schedule time
    if (platform === "youtube") {
      const conn = await getYouTubeConnectionRow(user.id);

      if (!conn) {
        return NextResponse.json(
          { success: false, error: "Connect YouTube in Settings before scheduling." },
          { status: 422 },
        );
      }

      if (!hasYouTubeUploadScope(conn.scopes)) {
        return NextResponse.json(
          {
            success: false,
            error: "Grant YouTube upload permission before scheduling.",
            code: "UPLOAD_SCOPE_REQUIRED",
          },
          { status: 403 },
        );
      }
    } else if (platform === "tiktok") {
      if (!publishSettings) {
        return NextResponse.json(
          { success: false, error: "TikTok publish settings are required." },
          { status: 422 },
        );
      }

      const conn = await getTikTokConnectionRow(user.id);

      if (!conn) {
        return NextResponse.json(
          { success: false, error: "Connect TikTok in Settings before scheduling." },
          { status: 422 },
        );
      }

      if (!hasTikTokPublishScope(conn.scopes)) {
        return NextResponse.json(
          {
            success: false,
            error: "Grant TikTok posting permission before scheduling.",
            code: "PUBLISH_SCOPE_REQUIRED",
          },
          { status: 403 },
        );
      }
    } else if (platform === "instagram") {
      const conn = await getInstagramConnectionRow(user.id);

      if (!conn) {
        return NextResponse.json(
          { success: false, error: "Connect Instagram in Settings before scheduling." },
          { status: 422 },
        );
      }

      if (!hasInstagramPublishScope(conn.scopes)) {
        return NextResponse.json(
          {
            success: false,
            error: "Grant Instagram publishing permission before scheduling.",
            code: "PUBLISH_SCOPE_REQUIRED",
          },
          { status: 403 },
        );
      }
    }

    // Check for existing active post (published, in-flight, or already scheduled)
    if (isCarousel) {
      const existing = await getPlatformPostForCampaignCarousel(user.id, campaignId);

      if (existing?.status === "published") {
        return NextResponse.json(
          {
            success: false,
            error: "This carousel is already published to Instagram.",
            code: "ALREADY_PUBLISHED",
          },
          { status: 409 },
        );
      }

      if (existing && isPlatformPostInFlight(existing.status)) {
        return NextResponse.json(
          {
            success: false,
            error: "This carousel is currently being published to Instagram.",
            code: "PUBLISH_IN_PROGRESS",
          },
          { status: 409 },
        );
      }

      if (existing && isPlatformPostScheduled(existing.status)) {
        return NextResponse.json(
          {
            success: false,
            error: "This carousel already has a scheduled post. Cancel it before creating a new one.",
            code: "ALREADY_SCHEDULED",
          },
          { status: 409 },
        );
      }
    } else if (resolvedExportId) {
      const existing = await getPlatformPostForCampaignExport(
        user.id,
        campaignId,
        resolvedExportId,
        platform,
      );

      if (existing?.status === "published") {
        return NextResponse.json(
          {
            success: false,
            error: "This export is already published.",
            code: "ALREADY_PUBLISHED",
          },
          { status: 409 },
        );
      }

      if (existing && isPlatformPostInFlight(existing.status)) {
        return NextResponse.json(
          {
            success: false,
            error: "This export is currently being published.",
            code: "PUBLISH_IN_PROGRESS",
          },
          { status: 409 },
        );
      }

      if (existing && isPlatformPostScheduled(existing.status)) {
        return NextResponse.json(
          {
            success: false,
            error: "This export already has a scheduled post. Cancel it before creating a new one.",
            code: "ALREADY_SCHEDULED",
          },
          { status: 409 },
        );
      }
    }

    const post = await createScheduledPlatformPost({
      userId: user.id,
      campaignId,
      platform,
      exportId: resolvedExportId,
      scheduledFor: scheduledAt.toISOString(),
      publishSettings: publishSettings
        ? (publishSettings as Record<string, unknown>)
        : null,
    });

    return NextResponse.json({ success: true, post });
  } catch (error) {
    if (isUsageLimitError(error)) {
      return NextResponse.json(error.toJSON(), { status: 429 });
    }

    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
