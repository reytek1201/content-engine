import { buildSignedOutWidgetSnapshot } from "@/utils/widget-snapshot";
import { buildWidgetSnapshotForUser } from "@/utils/widget-snapshot-server";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(buildSignedOutWidgetSnapshot(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const preferredCampaignId = searchParams.get("campaignId");

    const snapshot = await buildWidgetSnapshotForUser(
      supabase,
      user.id,
      preferredCampaignId,
    );

    return NextResponse.json(snapshot);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
