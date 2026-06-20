"use client";

import BottomSheet from "@/app/components/bottom-sheet";
import { formatAspectRatio } from "@/utils/campaign-display";
import type { AspectRatio } from "@/types/campaign";

interface AddFormatSheetProps {
  open: boolean;
  onClose: () => void;
  secondaryAspectRatio: AspectRatio;
  slideCount: number;
  isGenerating: boolean;
  onConfirm: () => void;
}

function formatUseCase(aspectRatio: AspectRatio): string {
  return aspectRatio === "9:16"
    ? "Reels, Stories, and TikTok"
    : "Instagram feed and Facebook posts";
}

export default function AddFormatSheet({
  open,
  onClose,
  secondaryAspectRatio,
  slideCount,
  isGenerating,
  onConfirm,
}: AddFormatSheetProps) {
  const aspectLabel = formatAspectRatio(secondaryAspectRatio);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Add ${aspectLabel}?`}
      titleId="add-format-title"
      dismissDisabled={isGenerating}
      zIndexClass="z-[70]"
      maxHeightClass="max-h-[min(90dvh,520px)]"
      desktopModal
      footer={
        <div className="flex flex-col gap-2 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isGenerating}
            className="btn-primary py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? "Starting…" : `Generate ${aspectLabel} images`}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-6 text-muted-foreground">
        We&apos;ll re-generate {slideCount} slide image
        {slideCount === 1 ? "" : "s"} in {aspectLabel} for{" "}
        {formatUseCase(secondaryAspectRatio)}. Your headlines, voiceover scripts,
        and captions stay the same.
      </p>

      <div className="mt-4 rounded-xl border border-border bg-background/40 px-4 py-3 text-sm leading-6 text-secondary-foreground">
        You can preview and export each format separately. Video exports count one
        credit per format.
      </div>
    </BottomSheet>
  );
}
