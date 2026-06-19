"use client";

import type { AspectRatio, Slide } from "@/types/campaign";
import type { RegenerateFeedbackChipId } from "@/types/regenerate-feedback";
import {
  downloadSlideImage,
  slideImageFilename,
} from "@/utils/download-slide";
import {
  saveSlideImageToPhotos,
  shareSlideImage,
} from "@/utils/native-slide-export";
import { memo, useCallback, useState } from "react";
import SlideOverlayEditor from "./slide-overlay-editor";
import SlideRegenerateSheet, {
  type SlideRegenerateOptions,
} from "./slide-regenerate-sheet";
import SlideVoiceoverEditor from "./slide-voiceover-editor";
import SlideVoicePreview from "./slide-voice-preview";
import type { VoicePersona } from "@/utils/tts/voice-catalog";

interface SlideCardProps {
  slide: Slide;
  aspectRatio: AspectRatio;
  campaignId: string;
  preferredVoicePersona: VoicePersona;
  onPersonaChange: (persona: VoicePersona) => void;
  isSavingVoicePersona?: boolean;
  isNativeApp: boolean;
  isAnySlideGenerating: boolean;
  isRegenerating: boolean;
  userId: string;
  onOpenPreview: (slideIndex: number) => void;
  onSlideUpdated: (slideId: string, patch: Partial<Slide>) => void;
  onRegenerate: (
    slideId: string,
    options?: SlideRegenerateOptions,
  ) => void;
  onError: (message: string) => void;
}

const SlideCard = memo(function SlideCard({
  slide,
  aspectRatio,
  campaignId,
  preferredVoicePersona,
  onPersonaChange,
  isSavingVoicePersona = false,
  isNativeApp,
  isAnySlideGenerating,
  isRegenerating,
  userId,
  onOpenPreview,
  onSlideUpdated,
  onRegenerate,
  onError,
}: SlideCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [suggestVoiceoverMatch, setSuggestVoiceoverMatch] = useState(false);
  const [suggestRegenerateImage, setSuggestRegenerateImage] = useState(false);
  const [regenerateSheetOpen, setRegenerateSheetOpen] = useState(false);

  const regenerateDisabled = isAnySlideGenerating && !isRegenerating;

  const handleSaveToPhotos = useCallback(async () => {
    if (!slide.image_url) return;
    setIsSaving(true);
    try {
      await saveSlideImageToPhotos(
        slide.image_url,
        slideImageFilename(slide.slide_index),
      );
      setIsSaved(true);
      window.setTimeout(() => setIsSaved(false), 2500);
    } catch {
      onError("Could not save slide to Photos");
    } finally {
      setIsSaving(false);
    }
  }, [slide.image_url, slide.slide_index, onError]);

  const handleShare = useCallback(async () => {
    if (!slide.image_url) return;
    setIsSharing(true);
    try {
      await shareSlideImage(
        slide.image_url,
        slideImageFilename(slide.slide_index),
        `Slide ${slide.slide_index + 1}`,
      );
    } catch {
      onError("Could not share slide image");
    } finally {
      setIsSharing(false);
    }
  }, [slide.image_url, slide.slide_index, onError]);

  const handleDownload = useCallback(async () => {
    if (!slide.image_url) return;
    setIsDownloading(true);
    try {
      await downloadSlideImage(
        slide.image_url,
        slideImageFilename(slide.slide_index),
      );
    } catch {
      onError("Could not download slide image");
    } finally {
      setIsDownloading(false);
    }
  }, [slide.image_url, slide.slide_index, onError]);

  const handleRegenerate = useCallback(
    (options: SlideRegenerateOptions) => {
      onRegenerate(slide.id, options);
      setSuggestRegenerateImage(false);
    },
    [slide.id, onRegenerate],
  );

  const handleOpenPreview = useCallback(() => {
    onOpenPreview(slide.slide_index);
  }, [slide.slide_index, onOpenPreview]);

  function openRegenerateSheet() {
    setRegenerateSheetOpen(true);
    setSuggestRegenerateImage(false);
  }

  const showImageSlot =
    Boolean(slide.image_url) ||
    Boolean(slide.fal_request_id) ||
    isAnySlideGenerating;

  const aspectPanelClass =
    aspectRatio === "4:5"
      ? "aspect-4/5 max-md:aspect-auto lg:aspect-auto lg:min-h-[300px]"
      : "aspect-9/16 max-md:aspect-auto lg:aspect-auto lg:min-h-[300px]";

  return (
    <article
      id={`slide-card-${slide.id}`}
      className="overflow-hidden rounded-xl border border-border bg-card/50 md:rounded-2xl"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5 md:px-5 md:py-4">
        <h3 className="text-sm font-semibold text-secondary-foreground">
          Slide {slide.slide_index + 1}
        </h3>
        {slide.image_url ? (
          <span className="text-xs font-medium text-emerald-400">Image ready</span>
        ) : slide.fal_request_id ? (
          <span className="text-xs font-medium text-amber-300">Generating…</span>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">Image pending</span>
        )}
      </div>

      <div
        className={
          showImageSlot ? "grid gap-0 lg:grid-cols-[240px_1fr]" : undefined
        }
      >
        {showImageSlot && (
          <div
            className={`flex max-h-64 flex-col items-center justify-center border-b border-border bg-background p-3 sm:max-h-80 md:max-h-none md:p-6 lg:border-b-0 lg:border-r ${aspectPanelClass}`}
          >
            {slide.image_url ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  className="group relative max-h-full max-w-full cursor-zoom-in"
                  aria-label={`Expand slide ${slide.slide_index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.image_url}
                    alt={`Slide ${slide.slide_index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="max-h-56 max-w-full rounded-lg object-contain transition group-hover:opacity-95 sm:max-h-72 md:max-h-full"
                  />
                  <span className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-lg bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:flex">
                    <span className="rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                      Expand
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  className="mt-3 hidden text-xs font-medium text-muted-foreground transition hover:text-foreground md:inline-block lg:hidden"
                >
                  Expand image
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center">
                {slide.fal_request_id ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-xs text-muted-foreground">
                      Generating image…
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Waiting to generate
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6">
          <SlideOverlayEditor
            slideId={slide.id}
            value={slide.text_overlay ?? ""}
            disabled={regenerateDisabled || isRegenerating}
            onSaved={(textOverlay) => {
              const headlineChanged =
                textOverlay.trim() !== (slide.text_overlay ?? "").trim();
              onSlideUpdated(slide.id, { text_overlay: textOverlay });
              if (headlineChanged) {
                setSuggestVoiceoverMatch(true);
                if (slide.image_url) {
                  setSuggestRegenerateImage(true);
                }
              }
            }}
            onError={onError}
          />

          {suggestRegenerateImage && slide.image_url ? (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5">
              <p className="text-xs leading-5 text-secondary-foreground">
                Headline changed — regenerate the image so it matches?
              </p>
              <button
                type="button"
                disabled={regenerateDisabled || isRegenerating}
                onClick={openRegenerateSheet}
                className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                Fix this slide
              </button>
            </div>
          ) : null}

          <SlideVoiceoverEditor
            slideId={slide.id}
            value={slide.voiceover_script ?? ""}
            headline={slide.text_overlay ?? ""}
            disabled={regenerateDisabled || isRegenerating}
            suggestMatchHeadline={suggestVoiceoverMatch}
            onDismissMatchSuggestion={() => setSuggestVoiceoverMatch(false)}
            onSaved={(voiceoverScript) => {
              onSlideUpdated(slide.id, { voiceover_script: voiceoverScript });
              setSuggestVoiceoverMatch(false);
            }}
            onError={onError}
          />
          <SlideVoicePreview
            campaignId={campaignId}
            slideId={slide.id}
            hasVoiceover={Boolean(slide.voiceover_script)}
            preferredVoicePersona={preferredVoicePersona}
            onPersonaChange={onPersonaChange}
            isSavingVoicePersona={isSavingVoicePersona}
            onError={onError}
          />

          {slide.image_url && (
            <div className="flex flex-wrap gap-2">
              {isNativeApp ? (
                <>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleSaveToPhotos()}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
                  >
                    {isSaving ? "Saving…" : isSaved ? "Saved" : "Save to Photos"}
                  </button>
                  <button
                    type="button"
                    disabled={isSharing}
                    onClick={() => void handleShare()}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
                  >
                    {isSharing ? "Sharing…" : "Share"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={() => void handleDownload()}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
                >
                  {isDownloading ? "Downloading…" : "Download image"}
                </button>
              )}
              <button
                type="button"
                disabled={regenerateDisabled || isRegenerating}
                onClick={openRegenerateSheet}
                className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
              >
                {isRegenerating ? "Regenerating…" : "Fix this slide…"}
              </button>
            </div>
          )}

          <SlideRegenerateSheet
            open={regenerateSheetOpen}
            onClose={() => setRegenerateSheetOpen(false)}
            disabled={regenerateDisabled}
            isRegenerating={isRegenerating}
            isNativeApp={isNativeApp}
            userId={userId}
            headline={slide.text_overlay ?? ""}
            onRegenerate={handleRegenerate}
            onError={onError}
          />
        </div>
      </div>
    </article>
  );
});

export default SlideCard;
