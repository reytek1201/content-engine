"use client";

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
        <h3 className="text-sm font-semibold text-foreground">Video</h3>
        <p className="text-xs leading-5 text-muted-foreground">
          Export a reel-ready MP4 with voiceover from your slides.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3">
        <p className="text-sm font-semibold text-amber-100">
          {isFreeTier
            ? "Video export is a paid feature"
            : "No video credits remaining"}
        </p>
        <p className="mt-1 text-xs leading-5 text-amber-100/80">
          {isFreeTier
            ? `Your ${planLabel} plan includes carousel and narration exports. Upgrade to Creator or Agency Pro for monthly video credits.`
            : `You've used all video credits on your ${planLabel} plan this period. Upgrade or wait for your credits to reset.`}
        </p>
        <Link
          href={upgradeUrl}
          className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
        >
          View plans & usage
        </Link>
      </div>
    </div>
  );
}
