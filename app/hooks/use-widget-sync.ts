"use client";

import {
  buildWidgetSnapshotFromJourney,
  type WidgetCampaignCandidate,
} from "@/utils/widget-snapshot";
import {
  fetchAndSyncWidgetSnapshot,
  syncWidgetSnapshotFromCandidate,
  writeWidgetSnapshot,
} from "@/utils/native-widget-plugin";
import { setLastCampaignId } from "@/utils/last-campaign-preference";
import type { CampaignJourneyInput } from "@/utils/campaign-progress";
import { useEffect } from "react";

export function useCampaignWidgetSync(input: {
  campaignId: string;
  title: string;
  journeyInput: CampaignJourneyInput;
  enabled?: boolean;
}) {
  const { campaignId, title, journeyInput, enabled = true } = input;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setLastCampaignId(campaignId);
  }, [campaignId, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const snapshot = buildWidgetSnapshotFromJourney({
      campaignId,
      title,
      journeyInput,
    });

    void writeWidgetSnapshot(snapshot);
  }, [campaignId, title, journeyInput, enabled]);
}

export function useCampaignsListWidgetSync(
  candidate: WidgetCampaignCandidate | null,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    void syncWidgetSnapshotFromCandidate(candidate);
  }, [candidate, enabled]);
}

export function useWidgetRefreshOnPull(enabled = true) {
  return async function refreshWidgetSnapshot() {
    if (!enabled) {
      return;
    }

    await fetchAndSyncWidgetSnapshot();
  };
}
