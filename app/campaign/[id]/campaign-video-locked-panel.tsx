"use client";

import CampaignLockedNotice from "@/app/campaign/[id]/campaign-locked-notice";
import Link from "next/link";

interface CampaignVideoLockedPanelProps {
  planLabel: string;
  tier: string;
  upgradeUrl?: string;
}

export default function CampaignVideoLockedPanel({
  planLabel,
  tier,
  upgradeUrl = "/settings/usage",
}: CampaignVideoLockedPanelProps) {
  const isFreeTier = tier === "free";

  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 sm:rounded-xl sm:p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">9:16 video</h3>
        <p className="text-xs leading-5 text-muted-foreground">
          Export a reel-ready MP4 with AI voiceover — required before posting to
          YouTube Shorts.
        </p>
      </div>

      <CampaignLockedNotice
        variant="action"
        className="mt-4"
        title={
          isFreeTier
            ? "Video export is a paid feature"
            : "No video credits remaining"
        }
        description={
          isFreeTier
            ? `Your ${planLabel} plan includes carousel and narration file exports. Upgrade to Creator or Agency Pro for monthly video credits.`
            : `You've used all video credits on your ${planLabel} plan this period. Upgrade or wait for your credits to reset.`
        }
      >
        <Link
          href={upgradeUrl}
          className="inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
        >
          View plans & usage
        </Link>
      </CampaignLockedNotice>
    </div>
  );
}
