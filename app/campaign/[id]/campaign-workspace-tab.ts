import type { NextStepAction } from "@/utils/campaign-progress";

export type CampaignWorkspaceTab = "slides" | "publish" | "details";

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
    action === "export_video" ||
    action === "focus_youtube"
  ) {
    return "publish";
  }

  return "slides";
}

export function isMobileWorkspaceLayout(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(max-width: 767px)").matches;
}
