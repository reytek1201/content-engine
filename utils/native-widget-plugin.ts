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

export async function writeWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  if (!isIosWidgetBridgeAvailable()) {
    return;
  }

  try {
    await NativeWidget.setSnapshot({
      snapshot: JSON.stringify(snapshot),
    });
  } catch {
    // Widget bridge unavailable or extension not installed.
  }
}

export async function clearWidgetSnapshot(): Promise<void> {
  if (!isIosWidgetBridgeAvailable()) {
    return;
  }

  try {
    await NativeWidget.clearSnapshot();
  } catch {
    // Widget bridge unavailable.
  }
}

export async function fetchAndSyncWidgetSnapshot(
  preferredCampaignId?: string | null,
): Promise<void> {
  if (!isIosWidgetBridgeAvailable()) {
    return;
  }

  try {
    const params = new URLSearchParams();

    const campaignId = preferredCampaignId ?? getLastCampaignId();

    if (campaignId) {
      params.set("campaignId", campaignId);
    }

    const query = params.toString();
    const response = await fetch(
      `/api/widget/snapshot${query ? `?${query}` : ""}`,
      { credentials: "include" },
    );

    if (response.status === 401) {
      await writeWidgetSnapshot(buildSignedOutWidgetSnapshot());
      return;
    }

    if (!response.ok) {
      return;
    }

    const snapshot = (await response.json()) as WidgetSnapshot;
    await writeWidgetSnapshot(snapshot);
  } catch {
    // Network or bridge failure — keep the last snapshot.
  }
}

export async function syncWidgetSnapshotFromCandidate(
  campaign: WidgetCampaignCandidate | null,
): Promise<void> {
  await writeWidgetSnapshot(buildWidgetSnapshotForCandidate(campaign));
}
