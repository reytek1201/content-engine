"use client";

import { tabForNextStepAction } from "@/app/campaign/[id]/campaign-workspace-tab";
import type { CampaignWorkspaceTab } from "@/app/campaign/[id]/campaign-workspace-tab";
import {
  useCampaignNextStep,
  type CampaignNextStepInput,
} from "@/app/campaign/[id]/campaign-next-step-controls";
import type { CampaignNextStepButton, NextStepAction } from "@/utils/campaign-progress";

type NextStepHandlers = Pick<
  CampaignNextStepInput,
  | "onGenerateImages"
  | "onGenerateCaptions"
  | "onDownloadZip"
  | "onCopyAllCaptions"
  | "onSaveAllToPhotos"
>;

function runNextStepAction(action: NextStepAction, handlers: NextStepHandlers) {
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
    case "copy_captions":
      handlers.onCopyAllCaptions();
      break;
    case "save_all_photos":
      handlers.onSaveAllToPhotos();
      break;
  }
}

interface CampaignInlineNextStepActionsProps extends CampaignNextStepInput {
  onOpenMoreActions?: () => void;
  onTabChange?: (tab: CampaignWorkspaceTab) => void;
}

export default function CampaignInlineNextStepActions({
  onOpenMoreActions,
  onTabChange,
  ...input
}: CampaignInlineNextStepActionsProps) {
  const {
    nextStep,
    handlers,
    secondaryButtons,
    primaryLabel,
    actionDisabled,
    secondaryButtonLabel,
  } = useCampaignNextStep(input);

  const showMoreActions =
    secondaryButtons.length >= 2 && Boolean(onOpenMoreActions);
  const inlineSecondaries = showMoreActions ? [] : secondaryButtons;

  function handleNavigate(action: NextStepAction) {
    if (onTabChange) {
      onTabChange(tabForNextStepAction(action));
    }
  }

  function handlePrimaryClick() {
    if (actionDisabled) {
      return;
    }

    handleNavigate(nextStep.action);
    runNextStepAction(nextStep.action, handlers);
  }

  function handleSecondaryClick(button: CampaignNextStepButton) {
    if (button.disabled || button.loading) {
      return;
    }

    handleNavigate(button.action);
    runNextStepAction(button.action, handlers);
  }

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
        {primaryLabel}
      </button>

      {inlineSecondaries.map((button) => (
        <button
          key={button.action}
          type="button"
          disabled={button.disabled || button.loading}
          onClick={() => handleSecondaryClick(button)}
          className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {secondaryButtonLabel(button)}
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
