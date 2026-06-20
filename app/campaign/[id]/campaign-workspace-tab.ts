import type {
  CampaignJourneyStepId,
  NextStepAction,
} from "@/utils/campaign-progress";

export type CampaignWorkspaceTab = "slides" | "publish" | "details";

export function parseCampaignWorkspaceTab(
  value: string | null | undefined,
): CampaignWorkspaceTab | null {
  if (value === "slides" || value === "publish" || value === "details") {
    return value;
  }

  return null;
}

export const CAMPAIGN_WORKSPACE_TABS: {
  id: CampaignWorkspaceTab;
  label: string;
}[] = [
  { id: "slides", label: "Slides" },
  { id: "publish", label: "Publish" },
  { id: "details", label: "Details" },
];

export function tabForNextStepAction(
  action: NextStepAction,
): CampaignWorkspaceTab {
  if (
    action === "generate_captions" ||
    action === "copy_captions" ||
    action === "download_zip" ||
    action === "download_narration" ||
    action === "add_vertical_format" ||
    action === "export_video" ||
    action === "focus_publish" ||
    action === "view_youtube" ||
    action === "view_tiktok"
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

  return "publish";
}

export function isMobileWorkspaceLayout(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(max-width: 767px)").matches;
}
