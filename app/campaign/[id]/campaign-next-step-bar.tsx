"use client";

import CampaignNextStepControls, {
  type CampaignNextStepInput,
} from "@/app/campaign/[id]/campaign-next-step-controls";
import type { CampaignWorkspaceTab } from "@/app/campaign/[id]/campaign-workspace-tab";
import { CAMPAIGN_NEXT_STEP_BAR_ID } from "@/utils/campaign-progress";

interface CampaignNextStepBarProps extends CampaignNextStepInput {
  onTabChange?: (tab: CampaignWorkspaceTab) => void;
}

export default function CampaignNextStepBar({
  onTabChange,
  ...props
}: CampaignNextStepBarProps) {
  return (
    <div
      id={CAMPAIGN_NEXT_STEP_BAR_ID}
      className="sticky top-0 z-40 -mx-4 border-b border-border bg-background px-4 py-2 sm:-mx-6 sm:px-6 sm:py-2.5 md:top-[4.5rem] md:-mx-10 md:px-10 md:py-3"
    >
      <div className="flex flex-col gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:gap-3 sm:rounded-2xl sm:p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <CampaignNextStepControls
          layout="sticky"
          onTabChange={onTabChange}
          {...props}
        />
      </div>
    </div>
  );
}
