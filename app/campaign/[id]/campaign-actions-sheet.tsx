"use client";

import CampaignNextStepControls, {
  type CampaignNextStepInput,
} from "@/app/campaign/[id]/campaign-next-step-controls";
import type { CampaignWorkspaceTab } from "@/app/campaign/[id]/campaign-workspace-tab";
import { useEffect } from "react";

interface CampaignActionsSheetProps extends CampaignNextStepInput {
  open: boolean;
  onClose: () => void;
  onTabChange?: (tab: CampaignWorkspaceTab) => void;
}

export function CampaignActionsSheet({
  open,
  onClose,
  onTabChange,
  ...input
}: CampaignActionsSheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] md:hidden" aria-hidden={false}>
      <button
        type="button"
        aria-label="Close actions sheet"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-actions-sheet-title"
        className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex shrink-0 flex-col items-center border-b border-border px-4 pb-4 pt-3">
          <div className="mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
          <div className="flex w-full items-start justify-between gap-3">
            <h2
              id="campaign-actions-sheet-title"
              className="text-lg font-semibold text-foreground"
            >
              Actions
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition active:bg-secondary/60"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4">
          <CampaignNextStepControls
            layout="sheet"
            onTabChange={onTabChange}
            {...input}
          />
        </div>
      </div>
    </div>
  );
}
