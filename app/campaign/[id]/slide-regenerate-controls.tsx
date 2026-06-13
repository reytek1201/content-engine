"use client";

import {
  REGENERATE_FEEDBACK_CHIPS,
  type RegenerateFeedbackChipId,
} from "@/types/regenerate-feedback";

interface SlideRegenerateControlsProps {
  disabled: boolean;
  isRegenerating: boolean;
  selectedChipIds: RegenerateFeedbackChipId[];
  notes: string;
  onNotesChange: (value: string) => void;
  onToggleChip: (chipId: RegenerateFeedbackChipId) => void;
  onRegenerate: () => void;
}

export default function SlideRegenerateControls({
  disabled,
  isRegenerating,
  selectedChipIds,
  notes,
  onNotesChange,
  onToggleChip,
  onRegenerate,
}: SlideRegenerateControlsProps) {
  return (
    <div className="border-t border-border pt-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Regenerate image
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Edit the headline if needed, then pick chips or add a note before
        regenerating.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {REGENERATE_FEEDBACK_CHIPS.map((chip) => {
          const isSelected = selectedChipIds.includes(chip.id);

          return (
            <button
              key={chip.id}
              type="button"
              disabled={disabled || isRegenerating}
              onClick={() => onToggleChip(chip.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
          className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <button
        type="button"
        disabled={disabled || isRegenerating}
        onClick={onRegenerate}
        className="mt-4 inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRegenerating ? "Regenerating…" : "Regenerate slide"}
      </button>
    </div>
  );
}
