import type { CampaignJourneyHandlers } from "@/app/campaign/[id]/campaign-journey-input";
import type { NextStepAction } from "@/utils/campaign-progress";

export function runJourneyAction(
  action: NextStepAction,
  handlers: CampaignJourneyHandlers,
) {
  switch (action) {
    case "generate_images":
      handlers.onGenerateImages();
      break;
    case "generate_captions":
      handlers.onGenerateCaptions();
      break;
    case "download_zip":
      handlers.onDownloadZip();
      break;
    case "download_narration":
      handlers.onDownloadNarration();
      break;
    case "copy_captions":
      handlers.onCopyAllCaptions();
      break;
    case "save_all_photos":
      handlers.onSaveAllToPhotos();
      break;
    case "add_vertical_format":
      handlers.onAddVerticalFormat();
      break;
    case "export_video":
    case "focus_publish":
    case "view_youtube":
    case "view_tiktok":
    case "view_instagram":
      break;
  }
}
