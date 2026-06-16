import { createAdminClient } from "@/utils/supabase/admin";
import { getFirebaseServiceAccount, isFcmConfigured } from "@/utils/fcm-config";
import { GoogleAuth } from "google-auth-library";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

export interface PushDataPayload {
  campaignId?: string;
  title?: string;
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

export async function sendPushToUser(
  userId: string,
  notification: { title: string; body: string },
  data: PushDataPayload = {},
): Promise<SendPushToUserResult> {
  if (!isFcmConfigured()) {
    return {
      sent: 0,
      failed: 0,
      errors: ["FCM is not configured on the server"],
      staleTokenIds: [],
    };
  }

  const supabase = createAdminClient();

  const { data: tokens, error: tokensError } = await supabase
    .from("push_device_tokens")
    .select("id, token")
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

  const staleTokenIds: string[] = [];
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    tokens.map(async (entry) => {
      const result = await sendFcmToDevice(entry.token, notification, data);

      if (result.ok) {
        sent += 1;
        return;
      }

      failed += 1;

      if (result.error) {
        errors.push(result.error);
      }

      if (
        result.error?.includes("NOT_FOUND") ||
        result.error?.includes("UNREGISTERED") ||
        result.error?.includes("INVALID_ARGUMENT")
      ) {
        staleTokenIds.push(entry.id);
      }
    }),
  );

  if (staleTokenIds.length > 0) {
    await supabase.from("push_device_tokens").delete().in("id", staleTokenIds);
  }

  return { sent, failed, errors, staleTokenIds };
}

export async function sendTestPushToUser(
  userId: string,
  options?: { campaignId?: string },
): Promise<SendPushToUserResult> {
  return sendPushToUser(
    userId,
    {
      title: "Test notification",
      body: "SlidePress push is working.",
    },
    options?.campaignId
      ? { campaignId: options.campaignId, title: "Test campaign" }
      : {},
  );
}

export async function maybeSendCampaignImagesReadyPush(
  campaignId: string,
): Promise<void> {
  if (!isFcmConfigured()) {
    return;
  }

  const supabase = createAdminClient();

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

  await sendPushToUser(campaign.user_id, {
    title: "Images ready",
    body: `${campaignTitle} — all slide images are ready to review.`,
  }, {
    campaignId,
    title: campaignTitle,
  });
}
