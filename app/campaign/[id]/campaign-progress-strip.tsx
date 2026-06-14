"use client";

import {
  getCampaignProgressSteps,
  scrollToCampaignSection,
  type CampaignProgressStep,
} from "@/utils/campaign-progress";

interface CampaignProgressStripProps {
  slideCount: number;
  imagesReadyCount: number;
  imagesComplete: boolean;
  isGeneratingImages: boolean;
  captionsCount: number;
}

function StepIndicator({ step, index }: { step: CampaignProgressStep; index: number }) {
  return (
    <>
      {index > 0 && (
        <div
          aria-hidden
          className={`h-px min-w-3 flex-1 sm:min-w-0 ${
            step.complete ? "bg-emerald-700/60" : "bg-border"
          }`}
        />
      )}
      <button
        type="button"
        onClick={() => scrollToCampaignSection(step.scrollTargetId)}
        className={`flex shrink-0 flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 text-center transition hover:bg-card/60 sm:min-w-18 sm:gap-1.5 sm:rounded-xl sm:px-2 sm:py-2 ${
          step.current ? "bg-card/50" : ""
        }`}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold sm:h-7 sm:w-7 sm:text-xs ${
            step.complete
              ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-300"
              : step.current
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground"
          }`}
        >
          {step.complete ? "✓" : index + 1}
        </span>
        <span
          className={`max-w-[4.25rem] text-[9px] font-semibold uppercase leading-tight tracking-wide sm:max-w-none sm:text-[11px] ${
            step.current ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {step.label}
        </span>
        {step.detail && step.current && (
          <span className="max-w-[4.5rem] text-[9px] leading-tight text-muted-foreground sm:max-w-none sm:text-[10px]">
            {step.detail}
          </span>
        )}
      </button>
    </>
  );
}

export default function CampaignProgressStrip({
  slideCount,
  imagesReadyCount,
  imagesComplete,
  isGeneratingImages,
  captionsCount,
}: CampaignProgressStripProps) {
  const steps = getCampaignProgressSteps({
    slideCount,
    imagesReadyCount,
    imagesComplete,
    isGeneratingImages,
    captionsCount,
  });

  return (
    <div className="mt-6 rounded-xl border border-border bg-card/30 p-3 sm:mt-8 sm:rounded-2xl sm:p-4 md:p-5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        Campaign progress
      </p>
      <div className="mt-3 flex items-center gap-1 sm:mt-4 sm:gap-2">
        {steps.map((step, index) => (
          <StepIndicator key={step.id} step={step} index={index} />
        ))}
      </div>
    </div>
  );
}
