"use client";

import {
  CAMPAIGN_WORKSPACE_TABS,
  type CampaignWorkspaceTab,
} from "@/app/campaign/[id]/campaign-workspace-tab";

interface CampaignMobileTabsProps {
  active: CampaignWorkspaceTab;
  onChange: (tab: CampaignWorkspaceTab) => void;
}

export default function CampaignMobileTabs({
  active,
  onChange,
}: CampaignMobileTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Campaign workspace"
      className="mt-4 flex gap-1 rounded-xl border border-border bg-card/40 p-1"
    >
      {CAMPAIGN_WORKSPACE_TABS.map((tab) => {
        const isActive = tab.id === active;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-secondary-foreground"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
