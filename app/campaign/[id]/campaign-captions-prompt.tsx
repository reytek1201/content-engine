"use client";

import { useEffect } from "react";

const STORAGE_KEY_PREFIX = "slidepress-captions-prompt-dismissed:";

interface CampaignCaptionsPromptProps {
  open: boolean;
  campaignId: string;
  canGenerateCaptions: boolean;
  isGeneratingCaptions: boolean;
  onGenerateCaptions: () => void;
  onClose: () => void;
}

export default function CampaignCaptionsPrompt({
  open,
  campaignId,
  canGenerateCaptions,
  isGeneratingCaptions,
  onGenerateCaptions,
  onClose,
}: CampaignCaptionsPromptProps) {
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

  function dismissForCampaign() {
    try {
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${campaignId}`, "1");
    } catch {
      // Ignore storage errors in private browsing.
    }
    onClose();
  }

  function handleGenerate() {
    onGenerateCaptions();
    dismissForCampaign();
  }

  return (
    <div className="fixed inset-0 z-[70]" aria-hidden={false}>
      <button
        type="button"
        aria-label="Close captions prompt"
        onClick={dismissForCampaign}
        className="absolute inset-0 bg-black/60"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-captions-prompt-title"
        className="absolute inset-x-4 top-1/2 mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
          Next step
        </p>
        <h2
          id="campaign-captions-prompt-title"
          className="mt-2 text-lg font-semibold text-foreground"
        >
          Generate captions now?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your slide images are ready. Create TikTok, Instagram, and YouTube
          post copy before exporting video or posting to YouTube Shorts.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <button
            type="button"
            disabled={!canGenerateCaptions || isGeneratingCaptions}
            onClick={handleGenerate}
            className="btn-primary w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {isGeneratingCaptions ? "Generating captions…" : "Generate captions"}
          </button>
          <button
            type="button"
            onClick={dismissForCampaign}
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground sm:w-auto"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

export function shouldShowCaptionsPrompt(campaignId: string): boolean {
  try {
    return sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${campaignId}`) !== "1";
  } catch {
    return true;
  }
}
