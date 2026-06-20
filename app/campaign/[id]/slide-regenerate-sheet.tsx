"use client";

import BottomSheet from "@/app/components/bottom-sheet";
import {
  REGENERATE_FEEDBACK_CHIPS,
  type RegenerateFeedbackChipId,
} from "@/types/regenerate-feedback";
import { hapticSelection } from "@/utils/haptics";
import {
  blobToFile,
  captureReferencePhoto,
} from "@/utils/native-camera";
import { uploadReferenceImage } from "@/utils/upload-reference";
import { createClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export interface SlideRegenerateOptions {
  snapProductUrl?: string;
  feedback?: RegenerateFeedbackChipId[];
  notes?: string;
  textOverlay?: string;
  headlineChanged?: boolean;
}

interface SlideRegenerateSheetProps {
  open: boolean;
  onClose: () => void;
  disabled: boolean;
  isRegenerating: boolean;
  isNativeApp: boolean;
  userId: string;
  headline: string;
  onRegenerate: (options: SlideRegenerateOptions) => void | Promise<void>;
  onError: (message: string) => void;
}

export default function SlideRegenerateSheet({
  open,
  onClose,
  disabled,
  isRegenerating,
  isNativeApp,
  userId,
  headline,
  onRegenerate,
  onError,
}: SlideRegenerateSheetProps) {
  const supabase = createClient();
  const [selectedChipIds, setSelectedChipIds] = useState<
    RegenerateFeedbackChipId[]
  >([]);
  const [notes, setNotes] = useState("");
  const [snapPhotoUrl, setSnapPhotoUrl] = useState<string | null>(null);
  const [snapUploadedUrl, setSnapUploadedUrl] = useState<string | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const snapBlobRef = useRef<Blob | null>(null);

  const reset = useCallback(() => {
    if (snapPhotoUrl) {
      URL.revokeObjectURL(snapPhotoUrl);
    }
    setSelectedChipIds([]);
    setNotes("");
    setSnapPhotoUrl(null);
    setSnapUploadedUrl(null);
    snapBlobRef.current = null;
    setIsSnapping(false);
  }, [snapPhotoUrl]);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  function handleToggleChip(chipId: RegenerateFeedbackChipId) {
    void hapticSelection();
    setSelectedChipIds((current) =>
      current.includes(chipId)
        ? current.filter((id) => id !== chipId)
        : [...current, chipId],
    );
  }

  function handleClearSnapPhoto() {
    if (snapPhotoUrl) {
      URL.revokeObjectURL(snapPhotoUrl);
    }
    setSnapPhotoUrl(null);
    setSnapUploadedUrl(null);
    snapBlobRef.current = null;
  }

  async function handleSnapPhoto() {
    if (isSnapping) return;
    setIsSnapping(true);

    try {
      const result = await captureReferencePhoto("camera");
      if (!result) return;

      snapBlobRef.current = result.blob;
      const objectUrl = URL.createObjectURL(result.blob);
      setSnapPhotoUrl(objectUrl);

      const file = blobToFile(result.blob, result.filename);
      const uploadedUrl = await uploadReferenceImage(
        supabase,
        file,
        userId,
        "product",
      );
      setSnapUploadedUrl(uploadedUrl);
    } catch {
      onError("Could not capture photo");
    } finally {
      setIsSnapping(false);
    }
  }

  function handleSubmit() {
    void (async () => {
      try {
        await onRegenerate({
          snapProductUrl: snapUploadedUrl ?? undefined,
          feedback: selectedChipIds.length > 0 ? selectedChipIds : undefined,
          notes: notes.trim() || undefined,
        });
        onClose();
      } catch {
        // Parent sets error state; keep sheet open.
      }
    })();
  }

  const controlsDisabled = disabled || isRegenerating || isSnapping;
  const showLayoutHint = selectedChipIds.includes("different_layout");
  const showHeadlineHint = selectedChipIds.includes("fix_headline_text");

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Fix this slide"
      titleId="slide-regenerate-title"
      description="Edit the headline first if the on-slide text should change, then pick what to adjust. Unsaved headline edits are saved when you regenerate."
      dismissDisabled={isRegenerating || isSnapping}
      zIndexClass="z-[70]"
      maxHeightClass="max-h-[min(90dvh,680px)]"
      desktopModal
      footer={
        <>
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={handleSubmit}
            className="btn-primary w-full py-2.5 text-sm"
          >
            {isRegenerating ? "Regenerating…" : "Regenerate slide"}
          </button>
          <p className="mt-2 text-center text-[11px] leading-5 text-muted-foreground">
            Uses one slide regeneration from your monthly limit.
          </p>
        </>
      }
    >
      {headline.trim() ? (
        <p className="mb-4 rounded-xl border border-border bg-background/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Headline:{" "}
          <span className="font-medium text-secondary-foreground">
            {headline.trim()}
          </span>
        </p>
      ) : null}

      {isNativeApp ? (
        <div className="mb-4">
          {snapPhotoUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={snapPhotoUrl}
                alt="New product reference"
                className="h-10 w-10 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">
                  New product photo
                </p>
                <p className="text-xs text-muted-foreground">
                  Used for this regen only
                </p>
              </div>
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={handleClearSnapPhoto}
                className="shrink-0 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() => void handleSnapPhoto()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2.5 text-xs font-medium text-muted-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CameraIcon />
              {isSnapping ? "Opening camera…" : "Snap new product photo"}
            </button>
          )}
        </div>
      ) : null}

      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        What should change?
      </p>
      <ul className="mt-2 space-y-2">
        {REGENERATE_FEEDBACK_CHIPS.map((chip) => {
          const isSelected = selectedChipIds.includes(chip.id);

          return (
            <li key={chip.id}>
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={() => handleToggleChip(chip.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-background/60 hover:border-ring/60 hover:bg-card/60"
                }`}
              >
                <span className="block text-sm font-semibold text-foreground">
                  {chip.label}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {chip.description}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {showHeadlineHint ? (
        <p className="mt-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs leading-5 text-secondary-foreground">
          Save the corrected headline above, then regenerate. The image will
          re-render all on-slide text from your headline.
        </p>
      ) : null}

      {showLayoutHint ? (
        <p className="mt-3 rounded-xl border border-border bg-background/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
          For a bigger layout change, add specific notes (e.g. product left,
          headline bottom third).
        </p>
      ) : null}

      <label className="mt-4 block">
        <span className="text-xs font-medium text-muted-foreground">
          Extra notes (optional)
        </span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={controlsDisabled}
          rows={2}
          maxLength={300}
          placeholder="e.g. warmer tones, less text on the image"
          className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>
    </BottomSheet>
  );
}
