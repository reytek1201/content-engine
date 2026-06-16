"use client";

import {
  REGENERATE_FEEDBACK_CHIPS,
  type RegenerateFeedbackChipId,
} from "@/types/regenerate-feedback";

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

interface SlideRegenerateControlsProps {
  disabled: boolean;
  isRegenerating: boolean;
  selectedChipIds: RegenerateFeedbackChipId[];
  notes: string;
  onNotesChange: (value: string) => void;
  onToggleChip: (chipId: RegenerateFeedbackChipId) => void;
  onRegenerate: () => void;
  isNativeApp?: boolean;
  snapPhotoUrl?: string | null;
  isSnapping?: boolean;
  onSnapPhoto?: () => void;
  onClearSnapPhoto?: () => void;
}

export default function SlideRegenerateControls({
  disabled,
  isRegenerating,
  selectedChipIds,
  notes,
  onNotesChange,
  onToggleChip,
  onRegenerate,
  isNativeApp = false,
  snapPhotoUrl = null,
  isSnapping = false,
  onSnapPhoto,
  onClearSnapPhoto,
}: SlideRegenerateControlsProps) {
  return (
    <div className="border-t border-border pt-4 md:pt-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Regenerate image
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
        Edit the headline if needed, then pick chips or add a note before
        regenerating.
      </p>

      {isNativeApp && onSnapPhoto && (
        <div className="mt-3">
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
                disabled={disabled || isRegenerating}
                onClick={onClearSnapPhoto}
                className="shrink-0 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled || isRegenerating || isSnapping}
              onClick={onSnapPhoto}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CameraIcon />
              {isSnapping ? "Opening camera…" : "Snap new product photo"}
            </button>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
        {REGENERATE_FEEDBACK_CHIPS.map((chip) => {
          const isSelected = selectedChipIds.includes(chip.id);

          return (
            <button
              key={chip.id}
              type="button"
              disabled={disabled || isRegenerating}
              onClick={() => onToggleChip(chip.id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:py-1.5 sm:text-xs ${
                isSelected ? "chip-selected" : "chip-default"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-medium text-muted-foreground">
          What should change? (optional)
        </span>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          disabled={disabled || isRegenerating}
          rows={2}
          maxLength={300}
          placeholder="e.g. less text clutter, warmer tones, show the product closer up"
          className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-4 sm:px-4 sm:py-3"
        />
      </label>

      <button
        type="button"
        disabled={disabled || isRegenerating}
        onClick={onRegenerate}
        className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:mt-4 sm:w-auto sm:py-2.5"
      >
        {isRegenerating ? "Regenerating…" : "Regenerate slide"}
      </button>
    </div>
  );
}
