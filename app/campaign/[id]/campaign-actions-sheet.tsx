"use client";

import BottomSheet from "@/app/components/bottom-sheet";
import CampaignJourneyStrip from "@/app/campaign/[id]/campaign-journey-strip";
import type { CampaignJourneyStripInput } from "@/app/campaign/[id]/campaign-journey-input";
import type { CampaignWorkspaceTab } from "@/app/campaign/[id]/campaign-workspace-tab";

interface CampaignActionsSheetProps extends CampaignJourneyStripInput {
  open: boolean;
  onClose: () => void;
  onTabChange?: (tab: CampaignWorkspaceTab) => void;
}

export function CampaignActionsSheet({
  open,
  onClose,
  onTabChange,
  ...input
}: CampaignActionsSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Actions"
      titleId="campaign-actions-sheet-title"
      mobileOnly
      maxHeightClass="max-h-[85vh]"
    >
      <CampaignJourneyStrip
        layout="sheet"
        onTabChange={onTabChange}
        onSheetClose={onClose}
        {...input}
      />
    </BottomSheet>
  );
}
