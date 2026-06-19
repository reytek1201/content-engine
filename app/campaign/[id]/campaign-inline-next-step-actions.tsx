"use client";

import { runJourneyAction } from "@/app/campaign/[id]/campaign-journey-actions";
import type { CampaignJourneyStripInput } from "@/app/campaign/[id]/campaign-journey-input";
import { useCampaignJourney } from "@/app/campaign/[id]/campaign-journey-strip";
import {
  tabForNextStepAction,
  type CampaignWorkspaceTab,
} from "@/app/campaign/[id]/campaign-workspace-tab";
import {
  scrollTargetForNextStepAction,
  scrollToCampaignSection,
  type CampaignNextStepButton,
  type NextStepAction,
} from "@/utils/campaign-progress";

interface CampaignInlineNextStepActionsProps extends CampaignJourneyStripInput {
  onOpenMoreActions?: () => void;
  onTabChange?: (tab: CampaignWorkspaceTab) => void;
}

export default function CampaignInlineNextStepActions({
  onOpenMoreActions,
  onTabChange,
  ...input
}: CampaignInlineNextStepActionsProps) {
  const journey = useCampaignJourney(input);

  const handlers = {
    onGenerateImages: input.onGenerateImages,
    onGenerateCaptions: input.onGenerateCaptions,
    onDownloadZip: input.onDownloadZip,
    onDownloadNarration: input.onDownloadNarration,
    onCopyAllCaptions: input.onCopyAllCaptions,
    onSaveAllToPhotos: input.onSaveAllToPhotos,
  };

  const showMoreActions =
    journey.secondaries.length >= 2 && Boolean(onOpenMoreActions);
  const inlineSecondaries = showMoreActions ? [] : journey.secondaries;

  function handleNavigate(action: NextStepAction) {
    if (onTabChange) {
      onTabChange(tabForNextStepAction(action));
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToCampaignSection(scrollTargetForNextStepAction(action));
      });
    });
  }

  function handlePrimaryClick() {
    const primary = journey.primary;
    if (!primary || primary.disabled || primary.loading) {
      return;
    }

    if (
      journey.isFullyComplete &&
      journey.youtubeWatchUrl &&
      primary.action === "focus_youtube"
    ) {
      window.open(journey.youtubeWatchUrl, "_blank", "noopener,noreferrer");
      return;
    }

    handleNavigate(primary.action);
    runJourneyAction(primary.action, handlers);
  }

  function handleSecondaryClick(button: CampaignNextStepButton) {
    if (button.disabled || button.loading) {
      return;
    }

    handleNavigate(button.action);
    runJourneyAction(button.action, handlers);
  }

  if (!journey.primary) {
    return null;
  }

  const primary = journey.primary;
  const actionDisabled = primary.disabled || primary.loading;

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        type="button"
        aria-disabled={actionDisabled}
        onClick={handlePrimaryClick}
        className={`btn-primary w-full py-2.5 text-sm ${
          actionDisabled ? "cursor-default opacity-70" : ""
        }`}
      >
        {primary.label}
      </button>

      {inlineSecondaries.map((button) => (
        <button
          key={button.action}
          type="button"
          disabled={button.disabled || button.loading}
          onClick={() => handleSecondaryClick(button)}
          className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {button.label}
        </button>
      ))}

      {showMoreActions && (
        <button
          type="button"
          onClick={onOpenMoreActions}
          className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground"
        >
          More actions
        </button>
      )}
    </div>
  );
}
