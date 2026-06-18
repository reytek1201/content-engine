import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAppBaseUrl } from "@/utils/fal";
import { advanceVideoExportIfReady } from "@/utils/advance-video-export";
import { parseVideoExportMetadata } from "@/utils/fal-video";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
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

    const { data: exportRow, error: exportError } = await supabase
      .from("exports")
      .select(
        "id, campaign_id, export_type, status, output_url, error_message, fal_request_id, metadata, created_at, updated_at",
      )
      .eq("id", id)
      .single();

    if (exportError || !exportRow) {
      return NextResponse.json(
        { success: false, error: "Export not found" },
        { status: 404 },
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("user_id")
      .eq("id", exportRow.campaign_id)
      .single();

    if (campaignError || !campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // If still processing, check Fal's queue directly and advance the pipeline
    // if the job has completed — this makes video export work even when webhook
    // delivery fails (wrong NEXT_PUBLIC_APP_URL, deployment protection, etc.).
    if (exportRow.status === "processing" && exportRow.export_type === "video") {
      try {
        await advanceVideoExportIfReady(exportRow, getAppBaseUrl(request));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Video export advancement failed";

        if (exportRow.status === "processing") {
          const admin = createAdminClient();
          await admin
            .from("exports")
            .update({
              status: "failed",
              error_message: message,
            })
            .eq("id", id);
        }
      }

      // Re-read so we return the latest status after any advancement.
      const { data: refreshed } = await supabase
        .from("exports")
        .select("status, output_url, error_message, metadata")
        .eq("id", id)
        .single();

      if (refreshed) {
        exportRow.status = refreshed.status;
        exportRow.output_url = refreshed.output_url;
        exportRow.error_message = refreshed.error_message;
        exportRow.metadata = refreshed.metadata;
      }
    }

    const metadata = parseVideoExportMetadata(exportRow.metadata);

    return NextResponse.json({
      success: true,
      export: {
        id: exportRow.id,
        campaignId: exportRow.campaign_id,
        exportType: exportRow.export_type,
        status: exportRow.status,
        stage: metadata?.stage ?? null,
        outputUrl: exportRow.output_url,
        errorMessage: exportRow.error_message,
        createdAt: exportRow.created_at,
        updatedAt: exportRow.updated_at,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
