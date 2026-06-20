"use client";

import type { AspectRatio, Slide } from "@/types/campaign";
import type { CampaignJourneyStripInput } from "@/app/campaign/[id]/campaign-journey-input";
import type { CampaignWorkspaceTab } from "@/app/campaign/[id]/campaign-workspace-tab";
import SlideCard from "@/app/campaign/[id]/slide-card";
import CampaignGenerationPanel from "@/app/campaign/[id]/campaign-generation-panel";
import CampaignSlidesFilmstrip from "@/app/campaign/[id]/campaign-slides-filmstrip";
import { useHorizontalSwipe } from "@/app/hooks/use-horizontal-swipe";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import { hapticSelection } from "@/utils/haptics";
import { useCallback } from "react";

interface JustFinishedSlide {
  slideIndex: number;
  imageUrl: string;
}

interface CampaignSlidesMobileViewProps {
  slides: Slide[];
  activeSlideIndex: number;
  aspectRatio: AspectRatio;
  campaignId: string;
  preferredVoicePersona: VoicePersona;
  isSavingVoicePersona: boolean;
  onPersonaChange: (persona: VoicePersona) => void;
  justFinishedSlide: JustFinishedSlide | null;
  journeyProps: CampaignJourneyStripInput;
  onOpenMoreActions: () => void;
  onTabChange: (tab: CampaignWorkspaceTab) => void;
  isNativeApp: boolean;
  isAnySlideGenerating: boolean;
  regeneratingSlideId: string | null;
  onActiveSlideIndexChange: (slideIndex: number) => void;
  onOpenPreview: (slideIndex: number) => void;
  onSlideUpdated: (slideId: string, patch: Partial<Slide>) => void;
  onRegenerate: (slideId: string, options?: { snapProductUrl?: string; feedback?: string[]; notes?: string }) => void;
  onError: (message: string) => void;
  userId: string;
}

export default function CampaignSlidesMobileView({
  slides,
  activeSlideIndex,
  aspectRatio,
  campaignId,
  preferredVoicePersona,
  isSavingVoicePersona,
  onPersonaChange,
  justFinishedSlide,
  journeyProps,
  onOpenMoreActions,
  onTabChange,
  isNativeApp,
  isAnySlideGenerating,
  regeneratingSlideId,
  onActiveSlideIndexChange,
  onOpenPreview,
  onSlideUpdated,
  onRegenerate,
  onError,
  userId,
}: CampaignSlidesMobileViewProps) {
  const activeSlide =
    slides.find((slide) => slide.slide_index === activeSlideIndex) ?? slides[0];

  const goToPrevious = useCallback(() => {
    if (activeSlideIndex <= 0) {
      return;
    }

    void hapticSelection();
    onActiveSlideIndexChange(activeSlideIndex - 1);
  }, [activeSlideIndex, onActiveSlideIndexChange]);

  const goToNext = useCallback(() => {
    if (activeSlideIndex >= slides.length - 1) {
      return;
    }

    void hapticSelection();
    onActiveSlideIndexChange(activeSlideIndex + 1);
  }, [activeSlideIndex, onActiveSlideIndexChange, slides.length]);

  const atFirstSlide = activeSlideIndex <= 0;
  const atLastSlide = activeSlideIndex >= slides.length - 1;

  const slideSwipe = useHorizontalSwipe({
    onSwipeLeft: atLastSlide ? undefined : goToNext,
    onSwipeRight: atFirstSlide ? undefined : goToPrevious,
  });

  function handleFilmstripSelect(slideIndex: number) {
    if (slideIndex !== activeSlideIndex) {
      void hapticSelection();
    }
    onActiveSlideIndexChange(slideIndex);
  }

  if (!activeSlide) {
    return null;
  }

  const slidesWithImages = slides.filter((slide) => slide.image_url);

  return (
    <div className="mt-4 space-y-4">
      <CampaignGenerationPanel
        {...journeyProps}
        justFinishedSlide={justFinishedSlide}
        inlineActions
        onOpenMoreActions={onOpenMoreActions}
        onTabChange={onTabChange}
        variant="slides"
      />

      <CampaignSlidesFilmstrip
        slides={slides}
        activeSlideIndex={activeSlideIndex}
        aspectRatio={aspectRatio}
        isGeneratingImages={journeyProps.isGeneratingImages}
        onSelect={handleFilmstripSelect}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous slide"
            disabled={activeSlideIndex <= 0}
            onClick={goToPrevious}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-secondary-foreground transition hover:border-ring/60 hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-secondary-foreground transition hover:border-ring/60 hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
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
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border px-3 py-2.5 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground active:scale-[0.97]"
          >
            Preview
          </button>
        )}
      </div>

      <div
        className="mt-4 touch-pan-y"
        onTouchStart={slideSwipe.onTouchStart}
        onTouchMove={slideSwipe.onTouchMove}
        onTouchEnd={slideSwipe.onTouchEnd}
      >
        <SlideCard
          slide={activeSlide}
          aspectRatio={aspectRatio}
          campaignId={campaignId}
          preferredVoicePersona={preferredVoicePersona}
          onPersonaChange={onPersonaChange}
          isSavingVoicePersona={isSavingVoicePersona}
          isNativeApp={isNativeApp}
          isAnySlideGenerating={isAnySlideGenerating}
          isRegenerating={regeneratingSlideId === activeSlide.id}
          onOpenPreview={onOpenPreview}
          onSlideUpdated={onSlideUpdated}
          onRegenerate={onRegenerate}
          onError={onError}
          userId={userId}
          consumeSwipeTap={slideSwipe.consumeSwipeTap}
        />
      </div>
    </div>
  );
}
