"use client";

import type { AspectRatio, Slide } from "@/types/campaign";
import type { RegenerateFeedbackChipId } from "@/types/regenerate-feedback";
import {
  downloadSlideImage,
  slideImageFilename,
} from "@/utils/download-slide";
import {
  blobToFile,
  captureReferencePhoto,
} from "@/utils/native-camera";
import {
  saveSlideImageToPhotos,
  shareSlideImage,
} from "@/utils/native-slide-export";
import { uploadReferenceImage } from "@/utils/upload-reference";
import { createClient } from "@/utils/supabase/client";
import { memo, useCallback, useRef, useState } from "react";
import SlideOverlayEditor from "./slide-overlay-editor";
import SlideRegenerateControls from "./slide-regenerate-controls";

interface SlideCardProps {
  slide: Slide;
  aspectRatio: AspectRatio;
  isNativeApp: boolean;
  isAnySlideGenerating: boolean;
  isRegenerating: boolean;
  userId: string;
  onOpenPreview: (slideIndex: number) => void;
  onSlideUpdated: (slideId: string, patch: Partial<Slide>) => void;
  onRegenerate: (
    slideId: string,
    options?: { snapProductUrl?: string; feedback?: RegenerateFeedbackChipId[]; notes?: string },
  ) => void;
  onError: (message: string) => void;
}

const SlideCard = memo(function SlideCard({
  slide,
  aspectRatio,
  isNativeApp,
  isAnySlideGenerating,
  isRegenerating,
  userId,
  onOpenPreview,
  onSlideUpdated,
  onRegenerate,
  onError,
}: SlideCardProps) {
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopiedVoiceover, setIsCopiedVoiceover] = useState(false);
  const [selectedFeedbackChips, setSelectedFeedbackChips] = useState<RegenerateFeedbackChipId[]>([]);
  const [regenerateNotes, setRegenerateNotes] = useState("");
  const [snapPhotoUrl, setSnapPhotoUrl] = useState<string | null>(null);
  const [snapUploadedUrl, setSnapUploadedUrl] = useState<string | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const snapBlobRef = useRef<Blob | null>(null);

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

  const handleCopyVoiceover = useCallback(async () => {
    if (!slide.voiceover_script) return;
    try {
      await navigator.clipboard.writeText(slide.voiceover_script);
      setIsCopiedVoiceover(true);
      window.setTimeout(() => setIsCopiedVoiceover(false), 2000);
    } catch {
      onError("Could not copy to clipboard");
    }
  }, [slide.voiceover_script, onError]);

  const handleToggleChip = useCallback((chipId: RegenerateFeedbackChipId) => {
    setSelectedFeedbackChips((current) =>
      current.includes(chipId)
        ? current.filter((id) => id !== chipId)
        : [...current, chipId],
    );
  }, []);

  const handleSnapPhoto = useCallback(async () => {
    if (isSnapping) return;
    setIsSnapping(true);
    try {
      const result = await captureReferencePhoto("camera");
      if (!result) return;

      snapBlobRef.current = result.blob;
      const objectUrl = URL.createObjectURL(result.blob);
      setSnapPhotoUrl(objectUrl);

      const file = blobToFile(result.blob, result.filename);
      const uploadedUrl = await uploadReferenceImage(supabase, file, userId, "product");
      setSnapUploadedUrl(uploadedUrl);
    } catch {
      onError("Could not capture photo");
    } finally {
      setIsSnapping(false);
    }
  }, [isSnapping, supabase, userId, onError]);

  const handleClearSnapPhoto = useCallback(() => {
    if (snapPhotoUrl) {
      URL.revokeObjectURL(snapPhotoUrl);
    }
    setSnapPhotoUrl(null);
    setSnapUploadedUrl(null);
    snapBlobRef.current = null;
  }, [snapPhotoUrl]);

  const handleRegenerate = useCallback(() => {
    onRegenerate(slide.id, {
      snapProductUrl: snapUploadedUrl ?? undefined,
      feedback: selectedFeedbackChips.length > 0 ? selectedFeedbackChips : undefined,
      notes: regenerateNotes.trim() || undefined,
    });
    setSelectedFeedbackChips([]);
    setRegenerateNotes("");
    handleClearSnapPhoto();
  }, [slide.id, snapUploadedUrl, selectedFeedbackChips, regenerateNotes, onRegenerate, handleClearSnapPhoto]);

  const handleOpenPreview = useCallback(() => {
    onOpenPreview(slide.slide_index);
  }, [slide.slide_index, onOpenPreview]);

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
            disabled={
              isRegenerating ||
              (isAnySlideGenerating && !isRegenerating)
            }
            onSaved={(textOverlay) => {
              onSlideUpdated(slide.id, { text_overlay: textOverlay });
            }}
            onError={onError}
          />

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Voiceover script
              </p>
              {slide.voiceover_script && (
                <button
                  type="button"
                  onClick={() => void handleCopyVoiceover()}
                  className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                  {isCopiedVoiceover ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            <p className="mt-1.5 text-sm leading-6 text-secondary-foreground md:mt-2 md:leading-7">
              {slide.voiceover_script ?? "—"}
            </p>
          </div>

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
            </div>
          )}

          {slide.image_url && (
            <SlideRegenerateControls
              disabled={isAnySlideGenerating && !isRegenerating}
              isRegenerating={isRegenerating}
              selectedChipIds={selectedFeedbackChips}
              notes={regenerateNotes}
              onNotesChange={setRegenerateNotes}
              onToggleChip={handleToggleChip}
              onRegenerate={handleRegenerate}
              isNativeApp={isNativeApp}
              snapPhotoUrl={snapPhotoUrl}
              isSnapping={isSnapping}
              onSnapPhoto={() => void handleSnapPhoto()}
              onClearSnapPhoto={handleClearSnapPhoto}
            />
          )}
        </div>
      </div>
    </article>
  );
});

export default SlideCard;
