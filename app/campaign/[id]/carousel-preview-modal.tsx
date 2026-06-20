"use client";

import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import { useHorizontalSwipe } from "@/app/hooks/use-horizontal-swipe";
import { useSwipeToDismiss } from "@/app/hooks/use-swipe-to-dismiss";
import { useNativeOverlay } from "@/app/contexts/native-overlay-context";
import type { Campaign, Slide } from "@/types/campaign";
import { slideImageFilename } from "@/utils/download-slide";
import { hapticNotification, hapticSelection } from "@/utils/haptics";
import {
  saveSlideImageToPhotos,
  shareSlideImage,
} from "@/utils/native-slide-export";
import { useCallback, useEffect, useMemo, useState } from "react";

interface CarouselPreviewModalProps {
  open: boolean;
  onClose: () => void;
  slides: Slide[];
  aspectRatio: Campaign["aspect_ratio"];
  initialSlideIndex?: number;
}

export default function CarouselPreviewModal({
  open,
  onClose,
  slides,
  aspectRatio,
  initialSlideIndex = 0,
}: CarouselPreviewModalProps) {
  const previewSlides = useMemo(
    () =>
      [...slides]
        .filter((slide) => slide.image_url)
        .sort((left, right) => left.slide_index - right.slide_index),
    [slides],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedActiveSlide, setSavedActiveSlide] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isNativeApp = useIsNativeApp();

  const dismiss = useSwipeToDismiss({
    onDismiss: onClose,
    enabled: open,
  });

  useNativeOverlay(onClose, open);

  const goToRelative = useCallback(
    (delta: number) => {
      if (previewSlides.length === 0) {
        return;
      }

      setActiveIndex((current) => {
        const next =
          ((current + delta) % previewSlides.length + previewSlides.length) %
          previewSlides.length;

        if (next !== current) {
          void hapticSelection();
        }

        return next;
      });
    },
    [previewSlides.length],
  );

  const carouselSwipe = useHorizontalSwipe({
    onSwipeLeft: () => goToRelative(1),
    onSwipeRight: () => goToRelative(-1),
    enabled: open && previewSlides.length > 1,
  });

  useEffect(() => {
    if (!open) {
      dismiss.resetDrag();
    }
  }, [open, dismiss.resetDrag]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const matchIndex = previewSlides.findIndex(
      (slide) => slide.slide_index === initialSlideIndex,
    );
    setActiveIndex(matchIndex >= 0 ? matchIndex : 0);
  }, [open, initialSlideIndex, previewSlides]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft") {
        goToRelative(-1);
      }

      if (event.key === "ArrowRight") {
        goToRelative(1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, goToRelative]);

  useEffect(() => {
    setSavedActiveSlide(false);
    setActionError(null);
  }, [activeIndex]);

  if (!open) {
    return null;
  }

  const activeSlide = previewSlides[activeIndex];

  async function handleSaveActiveSlide() {
    if (!activeSlide?.image_url) {
      return;
    }

    setActionError(null);
    setIsSaving(true);

    try {
      await saveSlideImageToPhotos(
        activeSlide.image_url,
        slideImageFilename(activeSlide.slide_index),
      );
      setSavedActiveSlide(true);
      void hapticNotification("success");
      window.setTimeout(() => setSavedActiveSlide(false), 2500);
    } catch {
      setActionError("Could not save slide to Photos");
      void hapticNotification("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleShareActiveSlide() {
    if (!activeSlide?.image_url) {
      return;
    }

    setActionError(null);
    setIsSharing(true);

    try {
      await shareSlideImage(
        activeSlide.image_url,
        slideImageFilename(activeSlide.slide_index),
        `Slide ${activeSlide.slide_index + 1}`,
      );
      void hapticNotification("success");
    } catch {
      setActionError("Could not share slide");
      void hapticNotification("error");
    } finally {
      setIsSharing(false);
    }
  }

  function handleDotSelect(index: number) {
    if (index !== activeIndex) {
      void hapticSelection();
    }
    setActiveIndex(index);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 md:items-center md:p-8">
      <button
        type="button"
        aria-label="Close carousel preview"
        onClick={onClose}
        className="absolute inset-0 transition-opacity duration-200"
        style={{ backgroundColor: `rgba(0, 0, 0, ${dismiss.backdropOpacity})` }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="carousel-preview-title"
        className="relative z-10 flex w-full max-w-lg flex-col rounded-t-2xl border-t border-border bg-background p-4 shadow-2xl md:max-w-2xl md:rounded-2xl md:border md:bg-transparent md:p-0 md:shadow-none lg:max-w-3xl"
        style={dismiss.panelStyle}
      >
        <div
          className="mb-3 flex shrink-0 flex-col items-center md:hidden"
          onPointerDown={dismiss.onPointerDown}
          onPointerMove={dismiss.onPointerMove}
          onPointerUp={dismiss.onPointerEnd}
          onPointerCancel={dismiss.onPointerCancel}
          style={{ touchAction: "none" }}
        >
          <div className="h-1 w-10 rounded-full bg-border" aria-hidden />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Swipe down to close
          </p>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p
              id="carousel-preview-title"
              className="text-sm font-semibold text-foreground"
            >
              Carousel preview
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Slide{" "}
              {activeSlide?.slide_index != null ? activeSlide.slide_index + 1 : 0}{" "}
              of {previewSlides.length}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isNativeApp === true && activeSlide?.image_url ? (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSaveActiveSlide()}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : savedActiveSlide ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  disabled={isSharing}
                  onClick={() => void handleShareActiveSlide()}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSharing ? "Sharing…" : "Share"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground active:scale-[0.97]"
            >
              Close
            </button>
          </div>
        </div>

        {actionError ? (
          <p className="mb-3 text-center text-xs text-red-300" role="alert">
            {actionError}
          </p>
        ) : savedActiveSlide ? (
          <p className="mb-3 text-center text-xs text-emerald-300" role="status">
            Saved to Photos
          </p>
        ) : null}

        <div
          className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          onTouchStart={carouselSwipe.onTouchStart}
          onTouchMove={carouselSwipe.onTouchMove}
          onTouchEnd={carouselSwipe.onTouchEnd}
        >
          {activeSlide?.image_url && (
            <div
              className={`mx-auto flex w-full items-center justify-center bg-background p-4 ${
                aspectRatio === "4:5"
                  ? "aspect-4/5 max-w-md md:aspect-auto md:max-h-[85vh] md:max-w-2xl lg:max-w-3xl"
                  : "aspect-9/16 max-w-md md:aspect-auto md:max-h-[85vh] md:max-w-xl lg:max-w-2xl"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeSlide.image_url}
                alt={`Slide ${activeSlide.slide_index + 1}`}
                decoding="async"
                className="max-h-[60vh] w-auto max-w-full rounded-lg object-contain md:max-h-[78vh]"
              />
            </div>
          )}

          {previewSlides.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => goToRelative(-1)}
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-secondary-foreground transition hover:border-ring/60 hover:text-foreground active:scale-[0.97]"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => goToRelative(1)}
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-secondary-foreground transition hover:border-ring/60 hover:text-foreground active:scale-[0.97]"
              >
                ›
              </button>
            </>
          )}
        </div>

        {previewSlides.length > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {previewSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${slide.slide_index + 1}`}
                onClick={() => handleDotSelect(index)}
                className={`h-2.5 rounded-full transition ${
                  index === activeIndex
                    ? "w-6 bg-primary"
                    : "w-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                }`}
              />
            ))}
          </div>
        )}

        <p className="mt-4 pb-[env(safe-area-inset-bottom,0px)] text-center text-xs text-muted-foreground md:pb-0">
          <span className="md:hidden">
            Swipe sideways between slides · swipe down to close
          </span>
          <span className="hidden md:inline">
            Use arrow keys to move between slides · Esc to close
          </span>
        </p>
      </div>
    </div>
  );
}
