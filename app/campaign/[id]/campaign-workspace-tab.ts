import type {
  CampaignJourneyStepId,
  NextStepAction,
} from "@/utils/campaign-progress";

export type CampaignWorkspaceTab = "slides" | "video" | "publish";

export function parseCampaignWorkspaceTab(
  value: string | null | undefined,
): CampaignWorkspaceTab | null {
  if (value === "slides" || value === "video" || value === "publish") {
    return value;
  }

  if (value === "details") {
    return "slides";
  }

  return null;
}

export const CAMPAIGN_WORKSPACE_TABS: {
  id: CampaignWorkspaceTab;
  label: string;
}[] = [
  { id: "slides", label: "Slides" },
  { id: "video", label: "Video" },
  { id: "publish", label: "Publish" },
];

export function tabForNextStepAction(
  action: NextStepAction,
): CampaignWorkspaceTab {
  if (
    action === "export_video" ||
    action === "download_narration" ||
    action === "add_vertical_format"
  ) {
    return "video";
  }

  if (
    action === "generate_captions" ||
    action === "copy_captions" ||
    action === "download_zip" ||
    action === "focus_publish" ||
    action === "view_youtube" ||
    action === "view_tiktok" ||
    action === "view_instagram"
  ) {
    return "publish";
  }

  return "slides";
}

export function tabForJourneyStep(
  stepId: CampaignJourneyStepId,
): CampaignWorkspaceTab {
  if (stepId === "copy" || stepId === "images") {
    return "slides";
  }

  if (stepId === "video") {
    return "video";
  }

  return "publish";
}

export function isMobileWorkspaceLayout(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(max-width: 767px)").matches;
}
