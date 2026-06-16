"use client";

import type { AspectRatio, Slide } from "@/types/campaign";
import { useEffect, useRef } from "react";

type SlideThumbState = "ready" | "generating" | "queued" | "pending";

interface CampaignSlidesFilmstripProps {
  slides: Slide[];
  activeSlideIndex: number;
  aspectRatio: AspectRatio;
  isGeneratingImages: boolean;
  onSelect: (slideIndex: number) => void;
}

function aspectRatioClass(aspectRatio: AspectRatio): string {
  switch (aspectRatio) {
    case "9:16":
      return "aspect-[9/16]";
    case "4:5":
      return "aspect-[4/5]";
    default:
      return "aspect-[9/16]";
  }
}

function getSlideThumbState(
  slide: Slide,
  isGeneratingImages: boolean,
): SlideThumbState {
  if (slide.image_url) {
    return "ready";
  }

  if (slide.fal_request_id) {
    return "generating";
  }

  if (isGeneratingImages) {
    return "queued";
  }

  return "pending";
}

function stateLabel(state: SlideThumbState, slideIndex: number): string {
  switch (state) {
    case "ready":
      return `Slide ${slideIndex + 1}, ready`;
    case "generating":
      return `Slide ${slideIndex + 1}, generating`;
    case "queued":
      return `Slide ${slideIndex + 1}, queued`;
    case "pending":
      return `Slide ${slideIndex + 1}, pending`;
  }
}

export default function CampaignSlidesFilmstrip({
  slides,
  activeSlideIndex,
  aspectRatio,
  isGeneratingImages,
  onSelect,
}: CampaignSlidesFilmstripProps) {
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeSlideIndex]);

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex gap-2">
          {slides.map((slide) => {
            const isActive = slide.slide_index === activeSlideIndex;
            const state = getSlideThumbState(slide, isGeneratingImages);

            return (
              <button
                key={slide.id}
                ref={isActive ? activeThumbRef : undefined}
                type="button"
                aria-label={stateLabel(state, slide.slide_index)}
                aria-current={isActive ? "true" : undefined}
                onClick={() => onSelect(slide.slide_index)}
                className={`relative w-14 shrink-0 overflow-hidden rounded-lg border transition ${
                  isActive
                    ? "border-primary ring-2 ring-primary/40"
                    : state === "generating"
                      ? "animate-pulse border-amber-500/50"
                      : state === "queued"
                        ? "border-dashed border-border"
                        : "border-border hover:border-ring/60"
                } ${aspectRatioClass(aspectRatio)}`}
              >
                {state === "ready" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image_url!}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <span
                      className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white shadow"
                      aria-hidden
                    >
                      ✓
                    </span>
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-card/60 px-1">
                    {state === "generating" ? (
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-amber-400"
                        aria-hidden
                      />
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {slide.slide_index + 1}
                      </span>
                    )}
                    {state === "queued" && (
                      <span className="text-[8px] font-medium uppercase tracking-wide text-muted-foreground">
                        Wait
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
          Ready
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400/80" />
          Generating
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border border-dashed border-muted-foreground" />
          Queued
        </span>
      </div>
    </div>
  );
}
