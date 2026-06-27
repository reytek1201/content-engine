"use client";

import CampaignCreationBriefContent from "@/app/campaign/[id]/campaign-creation-brief-content";
import BottomSheet from "@/app/components/bottom-sheet";

interface CampaignBriefSheetProps {
  open: boolean;
  onClose: () => void;
  topic: string;
  sourceUrl?: string | null;
  productReferenceUrl?: string | null;
  styleReferenceUrl?: string | null;
  logoReferenceUrl?: string | null;
}

export default function CampaignBriefSheet({
  open,
  onClose,
  topic,
  sourceUrl,
  productReferenceUrl,
  styleReferenceUrl,
  logoReferenceUrl,
}: CampaignBriefSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Creation brief"
      titleId="campaign-brief-title"
      description="Original topic and reference images from when this campaign was created."
      zIndexClass="z-[70]"
      maxHeightClass="max-h-[min(90dvh,640px)]"
      desktopModal
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-5 py-2.5 text-sm"
          >
            Close
          </button>
        </div>
      }
    >
      <CampaignCreationBriefContent
        topic={topic}
        sourceUrl={sourceUrl}
        productReferenceUrl={productReferenceUrl}
        styleReferenceUrl={styleReferenceUrl}
        logoReferenceUrl={logoReferenceUrl}
      />
    </BottomSheet>
  );
}
