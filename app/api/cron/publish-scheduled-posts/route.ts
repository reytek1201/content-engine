import {
  updatePlatformPost,
} from "@/utils/platform-post-store";
import {
  executePlatformPublish,
  classifyPublishFailureReason,
} from "@/utils/platforms/execute-platform-publish";
import type { PlatformPostPlatform } from "@/types/platform-post";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BATCH_SIZE = 20;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");

  return authHeader === `Bearer ${secret}`;
}

interface ScheduledPostRow {
  id: string;
  user_id: string;
  campaign_id: string;
  platform: PlatformPostPlatform;
  export_id: string | null;
  publish_settings: Record<string, unknown> | null;
  scheduled_for: string;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await admin
    .from("platform_posts")
    .select(
      "id, user_id, campaign_id, platform, export_id, publish_settings, scheduled_for",
    )
    .eq("status", "scheduled")
    .eq("schedule_status", "pending")
    .lte("scheduled_for", nowIso)
    .limit(BATCH_SIZE);

  if (error) {
    console.error("[cron/publish-scheduled-posts] query failed", error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  const due = (rows ?? []) as ScheduledPostRow[];
  let fired = 0;
  const failures: { postId: string; error: string }[] = [];

  for (const row of due) {
    try {
      await executePlatformPublish(
        row.id,
        row.user_id,
        row.campaign_id,
        row.platform,
        row.export_id,
        row.publish_settings,
      );

      await updatePlatformPost(row.id, {
        schedule_status: "posted",
        failure_reason: null,
      });

      fired += 1;
    } catch (err) {
      const reason = classifyPublishFailureReason(err, row.platform);

      console.error("[cron/publish-scheduled-posts] post failed", {
        postId: row.id,
        userId: row.user_id,
        platform: row.platform,
        reason,
      });

      try {
        await updatePlatformPost(row.id, {
          status: "failed",
          schedule_status: "failed",
          failure_reason: reason,
          error_message: reason,
        });
      } catch (updateErr) {
        console.error(
          "[cron/publish-scheduled-posts] failed to mark row as failed",
          updateErr,
        );
      }

      failures.push({ postId: row.id, error: reason });
    }
  }

  return NextResponse.json({
    success: failures.length === 0,
    fired,
    checked: due.length,
    failures: failures.length > 0 ? failures : undefined,
  });
}
