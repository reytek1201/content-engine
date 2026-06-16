import { createAdminClient } from "@/utils/supabase/admin";
import { getFirebaseServiceAccount, isFcmConfigured } from "@/utils/fcm-config";
import { GoogleAuth } from "google-auth-library";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

interface CampaignPushPayload {
  campaignId: string;
  title: string;
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
  data: CampaignPushPayload,
): Promise<boolean> {
  const serviceAccount = getFirebaseServiceAccount();

  if (!serviceAccount) {
    return false;
  }

  const accessToken = await getFcmAccessToken();

  if (!accessToken) {
    return false;
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
          data: {
            campaignId: data.campaignId,
            title: data.title,
          },
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
    return true;
  }

  const errorBody = await response.text();

  if (
    errorBody.includes("NOT_FOUND") ||
    errorBody.includes("UNREGISTERED") ||
    errorBody.includes("INVALID_ARGUMENT")
  ) {
    return false;
  }

  console.error("FCM send failed:", response.status, errorBody);
  return false;
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

  const { data: tokens, error: tokensError } = await supabase
    .from("push_device_tokens")
    .select("id, token")
    .eq("user_id", campaign.user_id);

  if (tokensError || !tokens?.length) {
    return;
  }

  const campaignTitle = campaign.title?.trim() || "Your campaign";
  const notification = {
    title: "Images ready",
    body: `${campaignTitle} — all slide images are ready to review.`,
  };
  const payload: CampaignPushPayload = {
    campaignId,
    title: campaignTitle,
  };

  const staleTokenIds: string[] = [];

  await Promise.all(
    tokens.map(async (entry) => {
      const delivered = await sendFcmToDevice(
        entry.token,
        notification,
        payload,
      );

      if (!delivered) {
        staleTokenIds.push(entry.id);
      }
    }),
  );

  if (staleTokenIds.length > 0) {
    await supabase.from("push_device_tokens").delete().in("id", staleTokenIds);
  }
}
