import { ApnsClient, Notification, ApnsError } from "apns2";
import { getApnsConfig } from "@/utils/apns-config";
import type { PushDataPayload } from "@/utils/send-campaign-push";

export type ApnsEnvironment = "sandbox" | "production";

export interface ApnsSendResult {
  ok: boolean;
  error?: string;
  stale?: boolean;
  apnsEnvironment?: ApnsEnvironment;
  environmentHint?: string;
  diagnostics?: Partial<Record<ApnsEnvironment, string>>;
}

function createApnsClient(useSandbox: boolean): ApnsClient | null {
  const config = getApnsConfig();

  if (!config) {
    return null;
  }

  return new ApnsClient({
    team: config.teamId,
    keyId: config.keyId,
    signingKey: config.privateKey,
    defaultTopic: config.bundleId,
    host: useSandbox
      ? "api.sandbox.push.apple.com"
      : "api.push.apple.com",
  });
}

function normalizeDeviceToken(token: string): string {
  return token.replace(/[<>\s]/g, "");
}

function apnsEnvironmentLabel(useSandbox: boolean): ApnsEnvironment {
  return useSandbox ? "sandbox" : "production";
}

function environmentHintFor(useSandbox: boolean): string {
  return useSandbox
    ? "This device uses the APNs sandbox. Set APNS_USE_SANDBOX=true on Vercel Production."
    : "This device uses production APNs (TestFlight / App Store). Set APNS_USE_SANDBOX=false or remove it on Vercel Production.";
}

function mapApnsError(error: unknown): ApnsSendResult {
  if (error instanceof ApnsError) {
    const stale =
      error.reason === "Unregistered" || error.statusCode === 410;

    return {
      ok: false,
      error: error.reason,
      stale,
    };
  }

  const message = error instanceof Error ? error.message : "APNs send failed";
  return { ok: false, error: message };
}

export async function sendApnsToDevice(
  deviceToken: string,
  notification: { title: string; body: string },
  data: PushDataPayload = {},
  options?: { useSandbox?: boolean },
): Promise<ApnsSendResult> {
  const config = getApnsConfig();

  if (!config) {
    return { ok: false, error: "APNs is not configured" };
  }

  const useSandbox = options?.useSandbox ?? config.useSandbox;
  const client = createApnsClient(useSandbox);

  if (!client) {
    return { ok: false, error: "APNs is not configured" };
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

  try {
    const apnsNotification = new Notification(
      normalizeDeviceToken(deviceToken),
      {
        alert: {
          title: notification.title,
          body: notification.body,
        },
        sound: "default",
        contentAvailable: true,
        data: dataPayload,
      },
    );

    await client.send(apnsNotification);

    return {
      ok: true,
      apnsEnvironment: apnsEnvironmentLabel(useSandbox),
    };
  } catch (error) {
    const mapped = mapApnsError(error);
    return {
      ...mapped,
      apnsEnvironment: apnsEnvironmentLabel(useSandbox),
    };
  }
}

/** Try configured APNs host first, then the alternate on BadDeviceToken. */
export async function sendApnsToDeviceWithFallback(
  deviceToken: string,
  notification: { title: string; body: string },
  data: PushDataPayload = {},
): Promise<ApnsSendResult> {
  const config = getApnsConfig();

  if (!config) {
    return { ok: false, error: "APNs is not configured" };
  }

  const primarySandbox = config.useSandbox;
  const primary = await sendApnsToDevice(deviceToken, notification, data, {
    useSandbox: primarySandbox,
  });

  if (primary.ok) {
    return primary;
  }

  if (primary.error !== "BadDeviceToken") {
    return primary;
  }

  const alternateSandbox = !primarySandbox;
  const secondary = await sendApnsToDevice(deviceToken, notification, data, {
    useSandbox: alternateSandbox,
  });

  if (secondary.ok) {
    return {
      ...secondary,
      environmentHint: environmentHintFor(alternateSandbox),
    };
  }

  return {
    ok: false,
    error: secondary.error ?? primary.error,
    stale: Boolean(primary.stale || secondary.stale),
    diagnostics: {
      production: primarySandbox
        ? (secondary.error ?? "ok")
        : (primary.error ?? "ok"),
      sandbox: primarySandbox
        ? (primary.error ?? "ok")
        : (secondary.error ?? "ok"),
    },
  };
}

/** Probe both APNs hosts (for dev test UI). */
export async function probeApnsEnvironments(
  deviceToken: string,
  notification: { title: string; body: string },
  data: PushDataPayload = {},
): Promise<ApnsSendResult> {
  const [production, sandbox] = await Promise.all([
    sendApnsToDevice(deviceToken, notification, data, { useSandbox: false }),
    sendApnsToDevice(deviceToken, notification, data, { useSandbox: true }),
  ]);

  if (production.ok) {
    return {
      ...production,
      environmentHint: environmentHintFor(false),
      diagnostics: {
        production: "ok",
        sandbox: sandbox.error ?? "ok",
      },
    };
  }

  if (sandbox.ok) {
    return {
      ...sandbox,
      environmentHint: environmentHintFor(true),
      diagnostics: {
        production: production.error ?? "failed",
        sandbox: "ok",
      },
    };
  }

  return {
    ok: false,
    error: production.error ?? sandbox.error ?? "APNs send failed",
    stale: Boolean(production.stale || sandbox.stale),
    diagnostics: {
      production: production.error ?? "failed",
      sandbox: sandbox.error ?? "failed",
    },
  };
}

export function formatApnsFailureMessage(result: ApnsSendResult): string {
  if (result.ok) {
    return "Push delivered.";
  }

  if (result.environmentHint) {
    return result.environmentHint;
  }

  if (result.diagnostics) {
    const production = result.diagnostics.production ?? "unknown";
    const sandbox = result.diagnostics.sandbox ?? "unknown";

    if (production === "BadDeviceToken" && sandbox === "BadDeviceToken") {
      return [
        "Apple rejected this device token on both production and sandbox APNs.",
        "Try a fresh TestFlight build with Push Notifications enabled in Xcode, then turn notifications off and on in Settings.",
      ].join(" ");
    }

    return `Production APNs: ${production}. Sandbox APNs: ${sandbox}.`;
  }

  if (result.error === "BadDeviceToken") {
    return "Apple rejected this device token for the current APNs environment. The server will try the alternate environment automatically for real notifications.";
  }

  return result.error ?? "APNs send failed";
}
