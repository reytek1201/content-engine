"use client";

import ReferenceCameraGuideSheet from "@/app/components/reference-camera-guide-sheet";
import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import type { ReferenceType } from "@/types/references";
import {
  blobToFile,
  captureReferencePhoto,
  recropReferencePhoto,
} from "@/utils/native-camera";
import { useRef, useState } from "react";

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
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function PhotosIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function isUserCancelledError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  return (
    normalized.includes("cancel") ||
    normalized.includes("dismiss") ||
    normalized.includes("user denied")
  );
}

interface ReferenceUploadSlotProps {
  id: string;
  label: string;
  description: string;
  hint?: string;
  slotType?: ReferenceType;
  previewUrl: string | null;
  disabled?: boolean;
  onFileSelect: (file: File | null) => void;
}

export default function ReferenceUploadSlot({
  id,
  label,
  description,
  hint,
  slotType,
  previewUrl,
  disabled = false,
  onFileSelect,
}: ReferenceUploadSlotProps) {
  const isNativeApp = useIsNativeApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  async function runCapture(source: "camera" | "photos") {
    setCaptureError(null);
    setCapturing(true);

    try {
      const result = await captureReferencePhoto(source);

      if (result) {
        onFileSelect(blobToFile(result.blob, result.filename));
      }
    } catch (error) {
      if (!isUserCancelledError(error)) {
        setCaptureError(
          source === "camera"
            ? "Could not save photo. Try again."
            : "Could not load photo. Try again.",
        );
      }
    } finally {
      setCapturing(false);
    }
  }

  function handleCameraClick() {
    if (disabled || capturing) {
      return;
    }

    if (isNativeApp && slotType) {
      setGuideOpen(true);
      return;
    }

    void runCapture("camera");
  }

  function handleGuideContinue() {
    setGuideOpen(false);
    void runCapture("camera");
  }

  async function handlePhotos() {
    if (disabled || capturing) {
      return;
    }

    if (isNativeApp) {
      void runCapture("photos");
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleRecrop() {
    if (disabled || capturing || !previewUrl) {
      return;
    }

    setCaptureError(null);
    setCapturing(true);

    try {
      const result = await recropReferencePhoto(previewUrl);

      if (result) {
        onFileSelect(blobToFile(result.blob, result.filename));
      }
    } catch (error) {
      if (!isUserCancelledError(error)) {
        setCaptureError("Could not crop photo. Try again.");
      }
    } finally {
      setCapturing(false);
    }
  }

  const isBusy = disabled || capturing;

  return (
    <>
      <div className="rounded-xl border border-border bg-background p-4">
        <label className="block text-sm font-semibold text-secondary-foreground">
          {label}
        </label>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
        {hint && isNativeApp && (
          <p className="mt-1 text-xs italic leading-5 text-muted-foreground/70">
            {hint}
          </p>
        )}

        <div className="mt-4 flex min-h-[112px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-card/50">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={`${label} preview`}
              className="max-h-28 max-w-full object-contain"
            />
          ) : (
            <span className="px-3 text-center text-xs text-muted-foreground">
              {isNativeApp ? "No photo yet" : "JPG, PNG, or WebP up to 5MB"}
            </span>
          )}
        </div>

        {captureError && (
          <p className="mt-2 text-xs text-red-400">{captureError}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {isNativeApp ? (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleCameraClick}
                className="inline-flex flex-1 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CameraIcon />
                {capturing ? "…" : "Camera"}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handlePhotos()}
                className="inline-flex flex-1 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PhotosIcon />
                Library
              </button>
              {previewUrl && (
                <>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleRecrop()}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 disabled:opacity-60"
                  >
                    Crop
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onFileSelect(null)}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-ring/60 hover:text-secondary-foreground disabled:opacity-60"
                  >
                    Remove
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <label
                htmlFor={id}
                className={`inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 ${
                  disabled ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {previewUrl ? "Replace" : "Upload"}
              </label>
              {previewUrl && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onFileSelect(null)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-ring/60 hover:text-secondary-foreground disabled:opacity-60"
                >
                  Remove
                </button>
              )}
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            onFileSelect(file);
            event.target.value = "";
          }}
        />
      </div>

      {slotType && (
        <ReferenceCameraGuideSheet
          slotType={slotType}
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          onContinue={handleGuideContinue}
        />
      )}
    </>
  );
}
