import type { CampaignJourneyInput } from "@/utils/campaign-progress";

export interface CampaignJourneyHandlers {
  onGenerateImages: () => void;
  onGenerateCaptions: () => void;
  onDownloadZip: () => void;
  onDownloadNarration: () => void;
  onCopyAllCaptions: () => void;
  onSaveAllToPhotos: () => void;
  onAddVerticalFormat: () => void;
}

export interface CampaignJourneyStripInput
  extends CampaignJourneyInput,
    CampaignJourneyHandlers {
  copiedAllCaptions: boolean;
  savedAllPhotos: boolean;
}
