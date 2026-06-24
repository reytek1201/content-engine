import { createAdminClient } from "@/utils/supabase/admin";
import { getFirebaseServiceAccount, isFcmConfigured } from "@/utils/fcm-config";
import { userWantsPushNotification } from "@/utils/push-notification-preferences";
import { buildWidgetSnapshotForUser } from "@/utils/widget-snapshot-server";
import {
  formatApnsFailureMessage,
  probeApnsEnvironments,
  sendApnsToDeviceWithFallback,
} from "@/utils/send-apns";
import type { ApnsEnvironment } from "@/utils/send-apns";
import { isPushConfigured } from "@/utils/push-config";
import { GoogleAuth } from "google-auth-library";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

export interface PushDataPayload {
  campaignId?: string;
  title?: string;
  tab?: string;
  widgetSnapshot?: string;
}

interface FcmSendResult {
  ok: boolean;
  error?: string;
}

async function getFcmAccessToken(): Promise<string | null> {
  const serviceAccount = getFirebaseServiceAccount();

  if (!serviceAccount) {
    return null;
  }

  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: [FCM_SCOPE],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token ?? null;
}

async function sendFcmToDevice(
  deviceToken: string,
  notification: { title: string; body: string },
  data: PushDataPayload,
): Promise<FcmSendResult> {
  const serviceAccount = getFirebaseServiceAccount();

  if (!serviceAccount) {
    return { ok: false, error: "FCM is not configured" };
  }

  const accessToken = await getFcmAccessToken();

  if (!accessToken) {
    return { ok: false, error: "Could not obtain FCM access token" };
  }

  const dataPayload: Record<string, string> = {};

  if (data.campaignId) {
    dataPayload.campaignId = data.campaignId;
  }

  if (data.title) {
    dataPayload.title = data.title;
  }

  if (data.tab) {
    dataPayload.tab = data.tab;
  }

  if (data.widgetSnapshot) {
    dataPayload.widgetSnapshot = data.widgetSnapshot;
  }

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification,
          ...(Object.keys(dataPayload).length > 0 ? { data: dataPayload } : {}),
          android: {
            priority: "HIGH",
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                "content-available": 1,
              },
            },
          },
        },
      }),
    },
  );

  if (response.ok) {
    return { ok: true };
  }

  const errorBody = await response.text();

  if (
    errorBody.includes("NOT_FOUND") ||
    errorBody.includes("UNREGISTERED") ||
    errorBody.includes("INVALID_ARGUMENT")
  ) {
    return { ok: false, error: errorBody };
  }

  console.error("FCM send failed:", response.status, errorBody);
  return { ok: false, error: `${response.status}: ${errorBody}` };
}

export interface SendPushToUserResult {
  sent: number;
  failed: number;
  errors: string[];
  staleTokenIds: string[];
}

export interface SendTestPushResult extends SendPushToUserResult {
  apnsEnvironment?: ApnsEnvironment;
  environmentHint?: string;
  diagnostics?: Partial<Record<ApnsEnvironment, string>>;
}

async function attachWidgetSnapshotToPushData(
  userId: string,
  data: PushDataPayload,
): Promise<PushDataPayload> {
  if (!data.campaignId) {
    return data;
  }

  try {
    const supabase = createAdminClient();
    const snapshot = await buildWidgetSnapshotForUser(
      supabase,
      userId,
      data.campaignId,
    );

    return {
      ...data,
      widgetSnapshot: JSON.stringify(snapshot),
    };
  } catch (error) {
    console.error("Failed to build widget snapshot for push:", error);
    return data;
  }
}

async function sendPushToTokenEntries(
  tokens: Array<{ id: string; token: string; platform: string }>,
  notification: { title: string; body: string },
  data: PushDataPayload,
  options?: { removeStaleTokens?: boolean },
): Promise<SendPushToUserResult> {
  const removeStaleTokens = options?.removeStaleTokens ?? true;
  const staleTokenIds: string[] = [];
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    tokens.map(async (entry) => {
      const result =
        entry.platform === "ios"
          ? await sendApnsToDeviceWithFallback(entry.token, notification, data)
          : await sendFcmToDevice(entry.token, notification, data);

      if (result.ok) {
        sent += 1;
        return;
      }

      failed += 1;

      const errorMessage =
        entry.platform === "ios"
          ? formatApnsFailureMessage(result)
          : (result.error ?? "FCM send failed");

      errors.push(errorMessage);

      const stale =
        entry.platform === "ios"
          ? "stale" in result && result.stale === true
          : result.error?.includes("NOT_FOUND") ||
            result.error?.includes("UNREGISTERED") ||
            result.error?.includes("INVALID_ARGUMENT");

      if (stale && removeStaleTokens) {
        staleTokenIds.push(entry.id);
      }
    }),
  );

  if (removeStaleTokens && staleTokenIds.length > 0) {
    const supabase = createAdminClient();
    await supabase.from("push_device_tokens").delete().in("id", staleTokenIds);
  }

  return { sent, failed, errors, staleTokenIds };
}

export async function sendPushToUser(
  userId: string,
  notification: { title: string; body: string },
  data: PushDataPayload = {},
): Promise<SendPushToUserResult> {
  if (!isPushConfigured()) {
    return {
      sent: 0,
      failed: 0,
      errors: ["Push is not configured on the server"],
      staleTokenIds: [],
    };
  }

  const supabase = createAdminClient();

  const { data: tokens, error: tokensError } = await supabase
    .from("push_device_tokens")
    .select("id, token, platform")
    .eq("user_id", userId);

  if (tokensError) {
    return {
      sent: 0,
      failed: 0,
      errors: [tokensError.message],
      staleTokenIds: [],
    };
  }

  if (!tokens?.length) {
    return {
      sent: 0,
      failed: 0,
      errors: ["No push tokens registered for this account"],
      staleTokenIds: [],
    };
  }

  return sendPushToTokenEntries(tokens, notification, data);
}

export async function sendTestPushToUser(
  userId: string,
  options?: {
    campaignId?: string;
    deviceToken?: string;
    platform?: "ios" | "android";
  },
): Promise<SendTestPushResult> {
  if (!isPushConfigured()) {
    return {
      sent: 0,
      failed: 0,
      errors: ["Push is not configured on the server"],
      staleTokenIds: [],
    };
  }

  const notification = {
    title: "Test notification",
    body: "SlidePress push is working.",
  };
  const data: PushDataPayload = options?.campaignId
    ? { campaignId: options.campaignId, title: "Test campaign" }
    : {};

  const supabase = createAdminClient();

  if (options?.deviceToken) {
    const platform = options.platform ?? "ios";

    if (platform === "android") {
      const result = await sendFcmToDevice(options.deviceToken, notification, data);
      return {
        sent: result.ok ? 1 : 0,
        failed: result.ok ? 0 : 1,
        errors: result.ok ? [] : [result.error ?? "FCM send failed"],
        staleTokenIds: [],
      };
    }

    const result = await probeApnsEnvironments(
      options.deviceToken,
      notification,
      data,
    );

    return {
      sent: result.ok ? 1 : 0,
      failed: result.ok ? 0 : 1,
      errors: result.ok ? [] : [formatApnsFailureMessage(result)],
      staleTokenIds: [],
      apnsEnvironment: result.apnsEnvironment,
      environmentHint: result.environmentHint,
      diagnostics: result.diagnostics,
    };
  }

  const { data: tokens, error: tokensError } = await supabase
    .from("push_device_tokens")
    .select("id, token, platform")
    .eq("user_id", userId);

  if (tokensError) {
    return {
      sent: 0,
      failed: 0,
      errors: [tokensError.message],
      staleTokenIds: [],
    };
  }

  if (!tokens?.length) {
    return {
      sent: 0,
      failed: 0,
      errors: ["No push tokens registered for this account"],
      staleTokenIds: [],
    };
  }

  const iosToken = tokens.find((entry) => entry.platform === "ios");

  if (iosToken) {
    const result = await probeApnsEnvironments(iosToken.token, notification, data);

    return {
      sent: result.ok ? 1 : 0,
      failed: result.ok ? 0 : 1,
      errors: result.ok ? [] : [formatApnsFailureMessage(result)],
      staleTokenIds: [],
      apnsEnvironment: result.apnsEnvironment,
      environmentHint: result.environmentHint,
      diagnostics: result.diagnostics,
    };
  }

  return sendPushToTokenEntries(tokens, notification, data, {
    removeStaleTokens: false,
  });
}

export async function maybeSendCampaignDraftReadyPush(
  campaignId: string,
): Promise<void> {
  if (!isPushConfigured()) {
    return;
  }

  const supabase = createAdminClient();

  const { data: campaignPreview, error: previewError } = await supabase
    .from("campaigns")
    .select("user_id, title, status, images_ready_notified_at")
    .eq("id", campaignId)
    .maybeSingle();

  if (
    previewError ||
    !campaignPreview ||
    campaignPreview.status !== "completed" ||
    campaignPreview.images_ready_notified_at
  ) {
    return;
  }

  const { count: captionsCount, error: captionsError } = await supabase
    .from("platform_captions")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if (captionsError || (captionsCount ?? 0) === 0) {
    return;
  }

  if (
    !(await userWantsPushNotification(
      campaignPreview.user_id,
      "images_ready",
    ))
  ) {
    return;
  }

  const { data: campaign, error: claimError } = await supabase
    .from("campaigns")
    .update({ images_ready_notified_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("status", "completed")
    .is("images_ready_notified_at", null)
    .select("user_id, title")
    .maybeSingle();

  if (claimError || !campaign) {
    return;
  }

  const campaignTitle = campaign.title?.trim() || "Your campaign";

  const pushData = await attachWidgetSnapshotToPushData(campaign.user_id, {
    campaignId,
    title: campaignTitle,
  });

  await sendPushToUser(campaign.user_id, {
    title: "Draft ready",
    body: `${campaignTitle} — images and captions are ready to review.`,
  }, pushData);
}

/** @deprecated Use `maybeSendCampaignDraftReadyPush` */
export async function maybeSendCampaignImagesReadyPush(
  campaignId: string,
): Promise<void> {
  await maybeSendCampaignDraftReadyPush(campaignId);
}

export async function maybeSendVideoExportReadyPush(
  exportId: string,
): Promise<void> {
  if (!isPushConfigured()) {
    return;
  }

  const supabase = createAdminClient();

  const { data: exportPreview, error: previewError } = await supabase
    .from("exports")
    .select(
      "id, campaign_id, export_type, status, output_url, video_ready_notified_at",
    )
    .eq("id", exportId)
    .maybeSingle();

  if (
    previewError ||
    !exportPreview ||
    exportPreview.export_type !== "video" ||
    exportPreview.status !== "completed" ||
    !exportPreview.output_url ||
    exportPreview.video_ready_notified_at
  ) {
    return;
  }

  const { data: campaignPreview, error: campaignPreviewError } = await supabase
    .from("campaigns")
    .select("user_id, title")
    .eq("id", exportPreview.campaign_id)
    .single();

  if (campaignPreviewError || !campaignPreview) {
    return;
  }

  if (
    !(await userWantsPushNotification(
      campaignPreview.user_id,
      "video_export_ready",
    ))
  ) {
    return;
  }

  const { data: exportRow, error: claimError } = await supabase
    .from("exports")
    .update({ video_ready_notified_at: new Date().toISOString() })
    .eq("id", exportId)
    .eq("export_type", "video")
    .eq("status", "completed")
    .not("output_url", "is", null)
    .is("video_ready_notified_at", null)
    .select("campaign_id")
    .maybeSingle();

  if (claimError || !exportRow) {
    return;
  }

  const campaignTitle = campaignPreview.title?.trim() || "Your campaign";

  const pushData = await attachWidgetSnapshotToPushData(
    campaignPreview.user_id,
    {
      campaignId: exportRow.campaign_id,
      title: campaignTitle,
      tab: "publish",
    },
  );

  await sendPushToUser(
    campaignPreview.user_id,
    {
      title: "Video ready",
      body: `${campaignTitle} — your MP4 is ready to download or publish.`,
    },
    pushData,
  );
}

function platformPublishLabel(platform: string, exportId: string | null): string {
  if (platform === "youtube") {
    return "YouTube Shorts";
  }

  if (platform === "instagram") {
    return exportId ? "Instagram Reels" : "Instagram Carousel";
  }

  return "TikTok";
}

export async function maybeSendPlatformPublishPush(
  postId: string,
): Promise<void> {
  if (!isPushConfigured()) {
    return;
  }

  const supabase = createAdminClient();

  const { data: postPreview, error: previewError } = await supabase
    .from("platform_posts")
    .select(
      "id, user_id, campaign_id, platform, export_id, status, publish_notified_at",
    )
    .eq("id", postId)
    .maybeSingle();

  if (
    previewError ||
    !postPreview ||
    (postPreview.status !== "published" && postPreview.status !== "failed") ||
    postPreview.publish_notified_at
  ) {
    return;
  }

  if (
    !(await userWantsPushNotification(
      postPreview.user_id,
      "platform_publish",
    ))
  ) {
    return;
  }

  const { data: post, error: claimError } = await supabase
    .from("platform_posts")
    .update({ publish_notified_at: new Date().toISOString() })
    .eq("id", postId)
    .in("status", ["published", "failed"])
    .is("publish_notified_at", null)
    .select("user_id, campaign_id, platform, export_id, status")
    .maybeSingle();

  if (claimError || !post) {
    return;
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("title")
    .eq("id", post.campaign_id)
    .single();

  if (campaignError || !campaign) {
    return;
  }

  const campaignTitle = campaign.title?.trim() || "Your campaign";
  const platformLabel = platformPublishLabel(
    post.platform,
    (post as { export_id?: string | null }).export_id ?? null,
  );

  if (post.status === "published") {
    const pushData = await attachWidgetSnapshotToPushData(post.user_id, {
      campaignId: post.campaign_id,
      title: campaignTitle,
      tab: "publish",
    });

    await sendPushToUser(
      post.user_id,
      {
        title: `Published to ${platformLabel}`,
        body: `${campaignTitle} is live on ${platformLabel}.`,
      },
      pushData,
    );
    return;
  }

  const pushData = await attachWidgetSnapshotToPushData(post.user_id, {
    campaignId: post.campaign_id,
    title: campaignTitle,
    tab: "publish",
  });

  await sendPushToUser(
    post.user_id,
    {
      title: `${platformLabel} publish failed`,
      body: `${campaignTitle} — tap to open Publish and try again.`,
    },
    pushData,
  );
}
