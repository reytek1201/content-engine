"use client";

import { useEffect, useState } from "react";

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

interface SlideOverlayEditorProps {
  slideId: string;
  value: string;
  disabled?: boolean;
  onSaved: (textOverlay: string) => void;
  onDraftChange?: (textOverlay: string) => void;
  onError: (message: string) => void;
}

export default function SlideOverlayEditor({
  slideId,
  value,
  disabled = false,
  onSaved,
  onDraftChange,
  onError,
}: SlideOverlayEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
      onDraftChange?.(value);
    }
  }, [value, isEditing, onDraftChange]);

  const wordCount = countWords(draft);
  const isValid = draft.trim().length > 0 && wordCount <= 12;
  const hasChanges = draft.trim() !== value.trim();

  async function handleSave() {
    if (!isValid) {
      onError("Headline must be 1–12 words");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/slides/${slideId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text_overlay: draft.trim() }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
        slide?: { text_overlay: string | null };
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to save headline");
      }

      onSaved(data.slide?.text_overlay?.trim() ?? draft.trim());
      setIsEditing(false);
    } catch (saveError) {
      onError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save headline"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Text overlay
        </p>
        {!isEditing ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsEditing(true)}
            className="text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            Edit headline
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || isSaving}
            onClick={() => {
              setDraft(value);
              setIsEditing(false);
            }}
            className="text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => {
              const next = event.target.value;
              setDraft(next);
              onDraftChange?.(next);
            }}
            disabled={disabled || isSaving}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base font-semibold text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:py-3 sm:text-lg"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p
              className={`text-xs ${
                wordCount > 12 ? "text-red-300" : "text-muted-foreground"
              }`}
            >
              {wordCount}/12 words
            </p>
            <button
              type="button"
              disabled={disabled || isSaving || !isValid || !hasChanges}
              onClick={handleSave}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save headline"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-base font-semibold leading-snug text-foreground sm:mt-2 sm:text-lg">
          {value || "—"}
        </p>
      )}
    </div>
  );
}
