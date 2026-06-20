"use client";

import BottomSheet from "@/app/components/bottom-sheet";
import {
  VOICEOVER_REWRITE_CHIPS,
  type VoiceoverRewriteChipId,
} from "@/types/voiceover-rewrite";
import { hapticNotification, hapticSelection } from "@/utils/haptics";
import { useCallback, useEffect, useState } from "react";

type RewriteStep = "tone" | "options";

interface VoiceoverRewriteSheetProps {
  open: boolean;
  onClose: () => void;
  slideId: string;
  headline: string;
  currentScript: string;
  initialTone?: VoiceoverRewriteChipId;
  onSaved: (voiceoverScript: string) => void;
  onError: (message: string) => void;
}

async function saveVoiceoverScript(
  slideId: string,
  voiceoverScript: string,
): Promise<string> {
  const response = await fetch(`/api/slides/${slideId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voiceover_script: voiceoverScript }),
  });

  const data = (await response.json()) as {
    success: boolean;
    error?: string;
    slide?: { voiceover_script: string | null };
  };

  if (!response.ok || !data.success) {
    throw new Error(data.error ?? "Failed to save voiceover");
  }

  return data.slide?.voiceover_script?.trim() ?? voiceoverScript;
}

async function fetchRewriteOptions(
  slideId: string,
  tone: VoiceoverRewriteChipId,
): Promise<string[]> {
  const response = await fetch("/api/rewrite-voiceover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slideId, tone }),
  });

  const data = (await response.json()) as {
    success: boolean;
    error?: string;
    options?: string[];
  };

  if (!response.ok || !data.success || !data.options?.length) {
    throw new Error(data.error ?? "Failed to rewrite voiceover");
  }

  return data.options;
}

export default function VoiceoverRewriteSheet({
  open,
  onClose,
  slideId,
  headline,
  currentScript,
  initialTone,
  onSaved,
  onError,
}: VoiceoverRewriteSheetProps) {
  const [step, setStep] = useState<RewriteStep>("tone");
  const [activeTone, setActiveTone] = useState<VoiceoverRewriteChipId | null>(
    null,
  );
  const [options, setOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const reset = useCallback(() => {
    setStep("tone");
    setActiveTone(null);
    setOptions([]);
    setIsLoading(false);
    setIsSaving(false);
  }, []);

  const runRewrite = useCallback(
    async (tone: VoiceoverRewriteChipId) => {
      void hapticSelection();
      setActiveTone(tone);
      setOptions([]);
      setIsLoading(true);
      setStep("options");

      try {
        const nextOptions = await fetchRewriteOptions(slideId, tone);
        setOptions(nextOptions);
      } catch (error) {
        onError(
          error instanceof Error ? error.message : "Failed to rewrite voiceover",
        );
        setStep("tone");
        setActiveTone(null);
      } finally {
        setIsLoading(false);
      }
    },
    [slideId, onError],
  );

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    if (initialTone) {
      void runRewrite(initialTone);
      return;
    }

    setStep("tone");
    setActiveTone(null);
    setOptions([]);
    setIsLoading(false);
  }, [open, initialTone, reset, runRewrite]);

  async function handleUseOption(option: string) {
    setIsSaving(true);

    try {
      const saved = await saveVoiceoverScript(slideId, option);
      void hapticNotification("success");
      onSaved(saved);
      onClose();
    } catch (error) {
      void hapticNotification("error");
      onError(
        error instanceof Error ? error.message : "Failed to save voiceover",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const activeChip = VOICEOVER_REWRITE_CHIPS.find(
    (chip) => chip.id === activeTone,
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Rewrite voiceover"
      titleId="voiceover-rewrite-title"
      description="New spoken lines only — your slide image stays the same."
      dismissDisabled={isSaving || isLoading}
      zIndexClass="z-[70]"
      maxHeightClass="max-h-[min(90dvh,640px)]"
      desktopModal
      footer={
        step === "tone" ? (
          <p className="text-center text-[11px] leading-5 text-muted-foreground">
            Current script:{" "}
            <span className="text-secondary-foreground">
              {currentScript.trim() || "—"}
            </span>
          </p>
        ) : undefined
      }
    >
      {step === "tone" ? (
        <ul className="space-y-2">
          {VOICEOVER_REWRITE_CHIPS.map((chip) => {
            const chipDisabled =
              isLoading || (chip.id === "match_headline" && !headline.trim());

            return (
              <li key={chip.id}>
                <button
                  type="button"
                  disabled={chipDisabled}
                  onClick={() => void runRewrite(chip.id)}
                  className="w-full rounded-xl border border-border bg-background/60 px-4 py-3.5 text-left transition hover:border-ring/60 hover:bg-card/60 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
      ) : (
        <div>
          <button
            type="button"
            disabled={isLoading || isSaving}
            onClick={() => {
              setStep("tone");
              setActiveTone(null);
              setOptions([]);
            }}
            className="min-h-11 text-xs font-medium text-muted-foreground transition hover:text-foreground active:scale-[0.97] disabled:opacity-60"
          >
            ← Choose a different tone
          </button>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {activeChip?.label ?? "Options"}
          </p>

          {isLoading ? (
            <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Writing new scripts…
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {options.map((option) => (
                <li
                  key={option}
                  className="rounded-xl border border-border bg-card/40 p-4"
                >
                  <p className="text-sm leading-6 text-secondary-foreground">
                    {option}
                  </p>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleUseOption(option)}
                    className="btn-primary mt-3 w-full py-2.5 text-xs"
                  >
                    {isSaving ? "Saving…" : "Use this script"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && options.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No options yet. Go back and pick a tone.
            </p>
          ) : null}
        </div>
      )}
    </BottomSheet>
  );
}
