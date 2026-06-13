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
    <div className="border-t border-zinc-800 pt-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Regenerate image
      </p>
      <p className="mt-1 text-sm text-zinc-400">
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
                isSelected
                  ? "border-sky-500 bg-sky-950/40 text-sky-200"
                  : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-50"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-medium text-zinc-400">
          What should change? (optional)
        </span>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          disabled={disabled || isRegenerating}
          rows={2}
          maxLength={300}
          placeholder="e.g. less text clutter, warmer tones, show the product closer up"
          className="mt-2 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <button
        type="button"
        disabled={disabled || isRegenerating}
        onClick={onRegenerate}
        className="mt-4 inline-flex items-center justify-center rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRegenerating ? "Regenerating…" : "Regenerate slide"}
      </button>
    </div>
  );
}
