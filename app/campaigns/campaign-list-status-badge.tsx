import type { CampaignListStatus } from "@/utils/campaign-list-status";
import { campaignListStatusBadgeClasses } from "@/utils/campaign-list-status";

interface CampaignListStatusBadgeProps {
  status: CampaignListStatus;
}

export default function CampaignListStatusBadge({
  status,
}: CampaignListStatusBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${campaignListStatusBadgeClasses(status.tone)}`}
    >
      {status.label}
    </span>
  );
}
