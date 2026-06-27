"use client";

import type { CampaignWorkspaceTab } from "@/app/campaign/[id]/campaign-workspace-tab";
import { CAMPAIGN_JOURNEY_STRIP_ID } from "@/utils/campaign-progress";
import { useEffect, useState } from "react";

const TOUR_STORAGE_KEY = "slidepress-workspace-tour-dismissed-v2";

interface TourStep {
  id: string;
  title: string;
  description: string;
  targetId: string;
  tab?: CampaignWorkspaceTab;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "journey",
    title: "Campaign journey",
    description:
      "Track progress from copy to publish. Tap a step to jump there, or use the primary action below.",
    targetId: CAMPAIGN_JOURNEY_STRIP_ID,
  },
  {
    id: "video-tab",
    title: "Video tab",
    description:
      "Export Quick Reels, preview voice, and download narration — separate from posting.",
    targetId: "campaign-workspace-tab-video",
  },
  {
    id: "publish-tab",
    title: "Publish tab",
    description:
      "Captions, platform posting, and slide downloads live here.",
    targetId: "campaign-workspace-tab-publish",
    tab: "publish",
  },
];

interface CampaignWorkspaceTourProps {
  enabled: boolean;
  onTabChange?: (tab: CampaignWorkspaceTab) => void;
}

export default function CampaignWorkspaceTour({
  enabled,
  onTabChange,
}: CampaignWorkspaceTourProps) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    try {
      if (localStorage.getItem(TOUR_STORAGE_KEY) === "1") {
        return;
      }
    } catch {
      // Continue without persistence.
    }

    const timer = window.setTimeout(() => {
      setActive(true);
      setStepIndex(0);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const step = TOUR_STEPS[stepIndex];

    if (step.tab && onTabChange) {
      onTabChange(step.tab);
    }

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }

        const target = document.getElementById(step.targetId);
        setTargetRect(target?.getBoundingClientRect() ?? null);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [active, onTabChange, stepIndex]);

  if (!active) {
    return null;
  }

  const step = TOUR_STEPS[stepIndex];

  function dismissTour() {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch {
      // Ignore storage errors.
    }
    setActive(false);
  }

  function handleNext() {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      dismissTour();
      return;
    }

    setStepIndex((current) => current + 1);
  }

  const tooltipStyle = targetRect
    ? {
        top: Math.min(targetRect.bottom + 12, window.innerHeight - 220),
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 320)),
      }
    : { top: "30%", left: "50%", transform: "translateX(-50%)" };

  return (
    <div className="fixed inset-0 z-[65]">
      <button
        type="button"
        aria-label="Dismiss tour"
        onClick={dismissTour}
        className="absolute inset-0 bg-black/50"
      />

      {targetRect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      ) : null}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-tour-title"
        className="absolute w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-2xl"
        style={tooltipStyle}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
          Tip {stepIndex + 1} of {TOUR_STEPS.length}
        </p>
        <h2
          id="workspace-tour-title"
          className="mt-1 text-base font-semibold text-foreground"
        >
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {step.description}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismissTour}
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="btn-primary px-4 py-2 text-sm"
          >
            {stepIndex >= TOUR_STEPS.length - 1 ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
