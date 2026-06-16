"use client";

import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import { blobToFile, captureReferencePhoto } from "@/utils/native-camera";
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

interface ReferenceUploadSlotProps {
  id: string;
  label: string;
  description: string;
  hint?: string;
  previewUrl: string | null;
  disabled?: boolean;
  onFileSelect: (file: File | null) => void;
}

export default function ReferenceUploadSlot({
  id,
  label,
  description,
  hint,
  previewUrl,
  disabled = false,
  onFileSelect,
}: ReferenceUploadSlotProps) {
  const isNativeApp = useIsNativeApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturing, setCapturing] = useState(false);

  async function handleCamera() {
    if (disabled || capturing) return;
    setCapturing(true);
    try {
      const result = await captureReferencePhoto("camera");
      if (result) {
        onFileSelect(blobToFile(result.blob, result.filename));
      }
    } catch {
      // user cancelled — no-op
    } finally {
      setCapturing(false);
    }
  }

  async function handlePhotos() {
    if (disabled || capturing) return;

    if (isNativeApp) {
      setCapturing(true);
      try {
        const result = await captureReferencePhoto("photos");
        if (result) {
          onFileSelect(blobToFile(result.blob, result.filename));
        }
      } catch {
        // user cancelled — no-op
      } finally {
        setCapturing(false);
      }
    } else {
      fileInputRef.current?.click();
    }
  }

  const isBusy = disabled || capturing;

  return (
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

      <div className="mt-3 flex gap-2">
        {isNativeApp ? (
          <>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleCamera()}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CameraIcon />
              {capturing ? "…" : "Camera"}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handlePhotos()}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PhotosIcon />
              Library
            </button>
            {previewUrl && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onFileSelect(null)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-ring/60 hover:text-secondary-foreground disabled:opacity-60"
              >
                Remove
              </button>
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
  );
}
