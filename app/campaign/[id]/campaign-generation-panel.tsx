"use client";

import CampaignInlineNextStepActions from "@/app/campaign/[id]/campaign-inline-next-step-actions";
import type { CampaignNextStepInput } from "@/app/campaign/[id]/campaign-next-step-controls";
import type { CampaignWorkspaceTab } from "@/app/campaign/[id]/campaign-workspace-tab";
import {
  formatImageProgressLabel,
  formatSlidesImageStatus,
} from "@/utils/campaign-progress";

interface JustFinishedSlide {
  slideIndex: number;
  imageUrl: string;
}

interface CampaignGenerationPanelProps extends CampaignNextStepInput {
  justFinishedSlide?: JustFinishedSlide | null;
  variant?: "slides" | "publish";
  inlineActions?: boolean;
  onOpenMoreActions?: () => void;
  onTabChange?: (tab: CampaignWorkspaceTab) => void;
}

function progressPercent(imagesReadyCount: number, slideCount: number): number {
  if (slideCount <= 0) {
    return 0;
  }

  return Math.round((imagesReadyCount / slideCount) * 100);
}

export default function CampaignGenerationPanel({
  justFinishedSlide = null,
  variant = "slides",
  inlineActions = false,
  onOpenMoreActions,
  onTabChange,
  ...nextStepInput
}: CampaignGenerationPanelProps) {
  const {
    slideCount,
    imagesReadyCount,
    imagesComplete,
    isGeneratingImages,
    isStartingImages,
    captionsCount,
    isGeneratingCaptions,
    canGenerateImages,
  } = nextStepInput;

  const percent = progressPercent(imagesReadyCount, slideCount);
  const showImageProgress =
    variant === "slides" &&
    slideCount > 0 &&
    (isGeneratingImages || isStartingImages || imagesReadyCount > 0);

  const showReadyToGenerate =
    variant === "slides" &&
    slideCount > 0 &&
    !imagesComplete &&
    !isGeneratingImages &&
    !isStartingImages &&
    canGenerateImages;

  if (variant === "publish" && captionsCount > 0 && !isGeneratingCaptions) {
    return (
      <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-200">Captions ready</p>
        <p className="mt-1 text-sm leading-6 text-emerald-200/90">
          Copy platform copy below, or export your slides.
        </p>
        {inlineActions && (
          <CampaignInlineNextStepActions
            {...nextStepInput}
            onOpenMoreActions={onOpenMoreActions}
            onTabChange={onTabChange}
          />
        )}
      </div>
    );
  }

  if (variant === "publish" && isGeneratingCaptions) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">
          Generating captions…
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Writing hooks and post copy for each platform.
        </p>
      </div>
    );
  }

  if (imagesComplete && variant === "slides") {
    return (
      <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-200">All slides ready</p>
        <p className="mt-1 text-sm leading-6 text-emerald-200/90">
          Generate captions or save slides to Photos.
        </p>
        {inlineActions && (
          <CampaignInlineNextStepActions
            {...nextStepInput}
            onOpenMoreActions={onOpenMoreActions}
            onTabChange={onTabChange}
          />
        )}
      </div>
    );
  }

  if (showReadyToGenerate) {
    return (
      <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">
          Ready for image generation
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Review slide copy, then generate visuals for every slide.
        </p>
        {inlineActions && (
          <CampaignInlineNextStepActions
            {...nextStepInput}
            onOpenMoreActions={onOpenMoreActions}
            onTabChange={onTabChange}
          />
        )}
      </div>
    );
  }

  if (!showImageProgress) {
    return null;
  }

  const statusLabel = isStartingImages
    ? "Starting image generation…"
    : formatSlidesImageStatus({
        slideCount,
        imagesReadyCount,
        imagesComplete,
        isGeneratingImages,
      });

  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Image generation
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {statusLabel}
          </p>
        </div>
        <p className="shrink-0 text-sm font-medium text-secondary-foreground">
          {formatImageProgressLabel(imagesReadyCount, slideCount)}
        </p>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-border/80"
        role="progressbar"
        aria-valuenow={imagesReadyCount}
        aria-valuemin={0}
        aria-valuemax={slideCount}
        aria-label={formatImageProgressLabel(imagesReadyCount, slideCount)}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {justFinishedSlide && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={justFinishedSlide.imageUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-md object-cover"
          />
          <p className="text-sm text-emerald-200">
            Slide {justFinishedSlide.slideIndex + 1} just finished
          </p>
        </div>
      )}
    </div>
  );
}
