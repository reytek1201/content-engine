"use client";

import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import type { Campaign, Slide } from "@/types/campaign";
import { slideImageFilename } from "@/utils/download-slide";
import {
  saveSlideImageToPhotos,
  shareSlideImage,
} from "@/utils/native-slide-export";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    [slides]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedActiveSlide, setSavedActiveSlide] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const isNativeApp = useIsNativeApp();

  useEffect(() => {
    if (!open) {
      return;
    }

    const matchIndex = previewSlides.findIndex(
      (slide) => slide.slide_index === initialSlideIndex
    );
    setActiveIndex(matchIndex >= 0 ? matchIndex : 0);
  }, [open, initialSlideIndex, previewSlides]);

  const goTo = useCallback(
    (index: number) => {
      if (previewSlides.length === 0) {
        return;
      }

      const wrapped =
        ((index % previewSlides.length) + previewSlides.length) %
        previewSlides.length;
      setActiveIndex(wrapped);
    },
    [previewSlides.length]
  );

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
        goTo(activeIndex - 1);
      }

      if (event.key === "ArrowRight") {
        goTo(activeIndex + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, goTo, activeIndex]);

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
        slideImageFilename(activeSlide.slide_index)
      );
      setSavedActiveSlide(true);
      window.setTimeout(() => setSavedActiveSlide(false), 2500);
    } catch {
      setActionError("Could not save slide to Photos");
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
        `Slide ${activeSlide.slide_index + 1}`
      );
    } catch {
      setActionError("Could not share slide");
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8">
      <button
        type="button"
        aria-label="Close carousel preview"
        onClick={onClose}
        className="absolute inset-0 bg-black/80"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="carousel-preview-title"
        className="relative z-10 flex w-full max-w-lg flex-col md:max-w-2xl lg:max-w-3xl"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p
              id="carousel-preview-title"
              className="text-sm font-semibold text-foreground"
            >
              Carousel preview
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Slide {activeSlide?.slide_index != null ? activeSlide.slide_index + 1 : 0}{" "}
              of {previewSlides.length}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isNativeApp === true && activeSlide?.image_url ? (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveActiveSlide}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : savedActiveSlide ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  disabled={isSharing}
                  onClick={handleShareActiveSlide}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSharing ? "Sharing…" : "Share"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground"
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
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) {
              return;
            }

            const delta =
              (event.changedTouches[0]?.clientX ?? touchStartX.current) -
              touchStartX.current;
            touchStartX.current = null;

            if (delta > 48) {
              goTo(activeIndex - 1);
            } else if (delta < -48) {
              goTo(activeIndex + 1);
            }
          }}
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
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain md:max-h-[78vh]"
              />
            </div>
          )}

          {previewSlides.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => goTo(activeIndex - 1)}
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-secondary-foreground transition hover:border-ring/60 hover:text-foreground"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => goTo(activeIndex + 1)}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-secondary-foreground transition hover:border-ring/60 hover:text-foreground"
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
                onClick={() => setActiveIndex(index)}
                className={`h-2 rounded-full transition ${
                  index === activeIndex
                    ? "w-6 bg-primary"
                    : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                }`}
              />
            ))}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <span className="md:hidden">Swipe or use arrow keys to move between slides</span>
          <span className="hidden md:inline">
            Use arrow keys to move between slides · Esc to close
          </span>
        </p>
      </div>
    </div>
  );
}
