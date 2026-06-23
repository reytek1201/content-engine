import type { WidgetSnapshot } from "@/types/widget-snapshot";
import {
  fetchAndSyncWidgetSnapshot,
  isIosWidgetBridgeAvailable,
  writeWidgetSnapshot,
} from "@/utils/native-widget-plugin";

function parseEmbeddedWidgetSnapshot(
  value: unknown,
): WidgetSnapshot | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  try {
    return JSON.parse(value) as WidgetSnapshot;
  } catch {
    return null;
  }
}

export function getCampaignIdFromPushData(
  data: Record<string, unknown> | undefined,
): string | null {
  const campaignId = data?.campaignId;

  return typeof campaignId === "string" && campaignId.length > 0
    ? campaignId
    : null;
}

export async function syncWidgetFromPushData(
  data: Record<string, unknown> | undefined,
): Promise<void> {
  if (!isIosWidgetBridgeAvailable()) {
    return;
  }

  const embeddedSnapshot = parseEmbeddedWidgetSnapshot(data?.widgetSnapshot);

  if (embeddedSnapshot) {
    await writeWidgetSnapshot(embeddedSnapshot);
    return;
  }

  await fetchAndSyncWidgetSnapshot(getCampaignIdFromPushData(data));
}
