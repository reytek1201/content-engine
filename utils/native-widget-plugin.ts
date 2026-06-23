import type { WidgetSnapshot } from "@/types/widget-snapshot";
import { isNativeAppRuntime } from "@/utils/is-native-app";
import { getLastCampaignId } from "@/utils/last-campaign-preference";
import {
  buildSignedOutWidgetSnapshot,
  buildWidgetSnapshotForCandidate,
  type WidgetCampaignCandidate,
} from "@/utils/widget-snapshot";
import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativeWidgetPlugin {
  setSnapshot(options: { snapshot: string }): Promise<void>;
  clearSnapshot(): Promise<void>;
}

const NativeWidget = registerPlugin<NativeWidgetPlugin>("NativeWidget");

export function isIosWidgetBridgeAvailable(): boolean {
  return isNativeAppRuntime() && Capacitor.getPlatform() === "ios";
}

export function isAndroidWidgetBridgeAvailable(): boolean {
  return isNativeAppRuntime() && Capacitor.getPlatform() === "android";
}

export function isNativeWidgetBridgeAvailable(): boolean {
  return isIosWidgetBridgeAvailable() || isAndroidWidgetBridgeAvailable();
}

function widgetPluginAvailable(): boolean {
  return (
    isNativeWidgetBridgeAvailable() && Capacitor.isPluginAvailable("NativeWidget")
  );
}

function widgetSnapshotApiUrl(preferredCampaignId?: string | null): string {
  const params = new URLSearchParams();
  const campaignId = preferredCampaignId ?? getLastCampaignId();

  if (campaignId) {
    params.set("campaignId", campaignId);
  }

  const query = params.toString();
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "";

  return `${origin}/api/widget/snapshot${query ? `?${query}` : ""}`;
}

function logWidgetSyncWarning(message: string, error?: unknown): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.warn(`[widget] ${message}`, error);
}

export async function writeWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  if (!widgetPluginAvailable()) {
    logWidgetSyncWarning("NativeWidget plugin unavailable");
    return;
  }

  try {
    await NativeWidget.setSnapshot({
      snapshot: JSON.stringify(snapshot),
    });
  } catch (error) {
    logWidgetSyncWarning("Failed to write widget snapshot", error);
  }
}

export async function clearWidgetSnapshot(): Promise<void> {
  if (!widgetPluginAvailable()) {
    return;
  }

  try {
    await NativeWidget.clearSnapshot();
  } catch (error) {
    logWidgetSyncWarning("Failed to clear widget snapshot", error);
  }
}

export async function fetchAndSyncWidgetSnapshot(
  preferredCampaignId?: string | null,
): Promise<void> {
  if (!widgetPluginAvailable()) {
    logWidgetSyncWarning("NativeWidget plugin unavailable");
    return;
  }

  try {
    const response = await fetch(widgetSnapshotApiUrl(preferredCampaignId), {
      credentials: "include",
    });

    if (response.status === 401) {
      await writeWidgetSnapshot(buildSignedOutWidgetSnapshot());
      return;
    }

    if (!response.ok) {
      logWidgetSyncWarning(`Snapshot API returned ${response.status}`);
      return;
    }

    const snapshot = (await response.json()) as WidgetSnapshot;
    await writeWidgetSnapshot(snapshot);
  } catch (error) {
    logWidgetSyncWarning("Failed to fetch widget snapshot", error);
  }
}

export async function syncWidgetSnapshotFromCandidate(
  campaign: WidgetCampaignCandidate | null,
): Promise<void> {
  await writeWidgetSnapshot(buildWidgetSnapshotForCandidate(campaign));
}
