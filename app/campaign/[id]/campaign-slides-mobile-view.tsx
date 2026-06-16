"use client";

import type { AspectRatio, Slide } from "@/types/campaign";
import SlideCard from "@/app/campaign/[id]/slide-card";
import CampaignGenerationPanel from "@/app/campaign/[id]/campaign-generation-panel";
import CampaignSlidesFilmstrip from "@/app/campaign/[id]/campaign-slides-filmstrip";
import { useCallback, useRef } from "react";

interface JustFinishedSlide {
  slideIndex: number;
  imageUrl: string;
}

interface CampaignSlidesMobileViewProps {
  slides: Slide[];
  activeSlideIndex: number;
  aspectRatio: AspectRatio;
  slideCount: number;
  imagesReadyCount: number;
  imagesComplete: boolean;
  isGeneratingImages: boolean;
  isStartingImages: boolean;
  captionsCount: number;
  isGeneratingCaptions: boolean;
  justFinishedSlide: JustFinishedSlide | null;
  isNativeApp: boolean;
  isAnySlideGenerating: boolean;
  regeneratingSlideId: string | null;
  onActiveSlideIndexChange: (slideIndex: number) => void;
  onOpenPreview: (slideIndex: number) => void;
  onSlideUpdated: (slideId: string, patch: Partial<Slide>) => void;
  onRegenerate: (slideId: string) => void;
  onError: (message: string) => void;
}

const SWIPE_THRESHOLD_PX = 48;

export default function CampaignSlidesMobileView({
  slides,
  activeSlideIndex,
  aspectRatio,
  slideCount,
  imagesReadyCount,
  imagesComplete,
  isGeneratingImages,
  isStartingImages,
  captionsCount,
  isGeneratingCaptions,
  justFinishedSlide,
  isNativeApp,
  isAnySlideGenerating,
  regeneratingSlideId,
  onActiveSlideIndexChange,
  onOpenPreview,
  onSlideUpdated,
  onRegenerate,
  onError,
}: CampaignSlidesMobileViewProps) {
  const touchStartXRef = useRef<number | null>(null);
  const activeSlide =
    slides.find((slide) => slide.slide_index === activeSlideIndex) ?? slides[0];

  const goToPrevious = useCallback(() => {
    if (activeSlideIndex <= 0) {
      return;
    }

    onActiveSlideIndexChange(activeSlideIndex - 1);
  }, [activeSlideIndex, onActiveSlideIndexChange]);

  const goToNext = useCallback(() => {
    if (activeSlideIndex >= slides.length - 1) {
      return;
    }

    onActiveSlideIndexChange(activeSlideIndex + 1);
  }, [activeSlideIndex, onActiveSlideIndexChange, slides.length]);

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;

    if (startX === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? startX;
    const deltaX = endX - startX;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
      return;
    }

    if (deltaX < 0) {
      goToNext();
      return;
    }

    goToPrevious();
  }

  if (!activeSlide) {
    return null;
  }

  const slidesWithImages = slides.filter((slide) => slide.image_url);

  return (
    <div className="mt-4 space-y-4">
      <CampaignGenerationPanel
        slideCount={slideCount}
        imagesReadyCount={imagesReadyCount}
        imagesComplete={imagesComplete}
        isGeneratingImages={isGeneratingImages}
        isStartingImages={isStartingImages}
        captionsCount={captionsCount}
        isGeneratingCaptions={isGeneratingCaptions}
        justFinishedSlide={justFinishedSlide}
        variant="slides"
      />

      <CampaignSlidesFilmstrip
        slides={slides}
        activeSlideIndex={activeSlideIndex}
        aspectRatio={aspectRatio}
        isGeneratingImages={isGeneratingImages}
        onSelect={onActiveSlideIndexChange}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous slide"
            disabled={activeSlideIndex <= 0}
            onClick={goToPrevious}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <p className="text-sm font-medium text-secondary-foreground">
            Slide {activeSlideIndex + 1} of {slides.length}
          </p>
          <button
            type="button"
            aria-label="Next slide"
            disabled={activeSlideIndex >= slides.length - 1}
            onClick={goToNext}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        {slidesWithImages.length > 0 && (
          <button
            type="button"
            onClick={() => onOpenPreview(activeSlideIndex)}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground"
          >
            Preview
          </button>
        )}
      </div>

      <div
        className="mt-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <SlideCard
          slide={activeSlide}
          aspectRatio={aspectRatio}
          isNativeApp={isNativeApp}
          isAnySlideGenerating={isAnySlideGenerating}
          isRegenerating={regeneratingSlideId === activeSlide.id}
          onOpenPreview={onOpenPreview}
          onSlideUpdated={onSlideUpdated}
          onRegenerate={onRegenerate}
          onError={onError}
        />
      </div>
    </div>
  );
}
