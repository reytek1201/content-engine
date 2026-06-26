import type { UsageSummary } from "@/types/usage";

/** Confirm-sheet line item — matches Settings → Usage campaign numbers. */
export function formatCampaignCreditConfirmLine(usage: UsageSummary): string {
  const limit = usage.limits.campaigns;
  const remainingAfter = Math.max(0, usage.remaining.campaigns - 1);

  return `Uses 1 of your ${limit} campaigns this month — ${remainingAfter} remaining`;
}
