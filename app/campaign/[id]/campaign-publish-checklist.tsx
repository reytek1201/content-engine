"use client";

import {
  getCampaignPublishChecklist,
  scrollToCampaignSection,
  type PublishChecklistStep,
} from "@/utils/campaign-progress";

interface CampaignPublishChecklistProps {
  imagesComplete: boolean;
  captionsReady: boolean;
  isGeneratingCaptions: boolean;
  videoExportReady: boolean;
  hasVideoCredits: boolean;
  hasVideoExport: boolean;
  youtubeAlreadyPublished: boolean;
  isExportingVideo: boolean;
  isPublishingYoutube?: boolean;
  onGenerateCaptions?: () => void;
}

function StepIcon({ status }: { status: PublishChecklistStep["status"] }) {
  if (status === "done") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-700/60 bg-emerald-950/40 text-xs font-semibold text-emerald-300">
        ✓
      </span>
    );
  }

  if (status === "current") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/60 bg-primary/10 text-[10px] font-semibold text-primary">
        →
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[10px] font-semibold text-muted-foreground">
      ·
    </span>
  );
}

export default function CampaignPublishChecklist({
  imagesComplete,
  captionsReady,
  isGeneratingCaptions,
  videoExportReady,
  hasVideoCredits,
  hasVideoExport,
  youtubeAlreadyPublished,
  isExportingVideo,
  isPublishingYoutube = false,
  onGenerateCaptions,
}: CampaignPublishChecklistProps) {
  const steps = getCampaignPublishChecklist({
    imagesComplete,
    captionsReady,
    isGeneratingCaptions,
    videoExportReady,
    hasVideoCredits,
    hasVideoExport,
    youtubeAlreadyPublished,
    isExportingVideo,
    isPublishingYoutube,
  });

  if (steps.length === 0) {
    return null;
  }

  const currentStep = steps.find((step) => step.status === "current");

  function handleStepClick(step: PublishChecklistStep) {
    if (step.scrollTargetId) {
      scrollToCampaignSection(step.scrollTargetId);
    }

    if (step.id === "captions" && step.status === "current" && onGenerateCaptions) {
      onGenerateCaptions();
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
        Publish checklist
      </p>
      {currentStep ? (
        <p className="mt-2 text-sm font-medium text-foreground">
          Next: {currentStep.label}
        </p>
      ) : null}

      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => handleStepClick(step)}
              className={`flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-background/60 ${
                step.status === "current" ? "bg-primary/5" : ""
              }`}
            >
              <StepIcon status={step.status} />
              <span className="min-w-0 flex-1">
                <span
                  className={`text-sm font-semibold ${
                    step.status === "locked"
                      ? "text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {step.label}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {step.helperText}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
