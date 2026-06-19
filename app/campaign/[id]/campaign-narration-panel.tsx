"use client";

import VoicePersonaPicker from "@/app/components/voice-persona-picker";
import {
  TTS_EXPORT_DISCLOSURE,
  TTS_PREVIEW_DISCLOSURE,
} from "@/utils/tts/disclosure-copy";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import type { VoiceQuality } from "@/utils/tts/types";

interface CampaignNarrationPanelProps {
  preferredVoicePersona: VoicePersona;
  voiceQuality: VoiceQuality;
  brandId: string | null;
  disabled?: boolean;
  isSavingVoicePersona?: boolean;
  isExportingAudio?: boolean;
  audioExportMessage?: string | null;
  onPersonaChange: (persona: VoicePersona) => void;
  onVoiceQualityChange: (voiceQuality: VoiceQuality) => void;
  onDownloadNarration: () => void;
}

export default function CampaignNarrationPanel({
  preferredVoicePersona,
  voiceQuality,
  brandId,
  disabled = false,
  isSavingVoicePersona = false,
  isExportingAudio = false,
  audioExportMessage = null,
  onPersonaChange,
  onVoiceQualityChange,
  onDownloadNarration,
}: CampaignNarrationPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 sm:rounded-xl sm:p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">
          Default voice for this brand
        </h3>
        <p className="text-xs leading-5 text-muted-foreground">
          Same voice used on the Slides tab and in Brand settings. Change it
          there while previewing, or here before you export narration.
        </p>
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Voice
        </p>
        <div className="mt-2">
          <VoicePersonaPicker
            value={preferredVoicePersona}
            onChange={onPersonaChange}
            disabled={disabled || !brandId}
            saving={isSavingVoicePersona}
            size="sm"
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-foreground">Voice quality</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              { id: "standard", label: "Standard" },
              { id: "studio", label: "Studio" },
            ] as const
          ).map((option) => {
            const isActive = voiceQuality === option.id;

            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled || isExportingAudio}
                onClick={() => onVoiceQualityChange(option.id)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-secondary-foreground hover:border-ring/60 hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {!brandId && (
        <p className="mt-2 text-xs text-muted-foreground">
          Link this campaign to a brand to save a default voice.
        </p>
      )}

      {isSavingVoicePersona && (
        <p className="mt-2 text-xs text-muted-foreground">
          Saving voice preference…
        </p>
      )}

      <button
        type="button"
        disabled={disabled || isExportingAudio}
        onClick={onDownloadNarration}
        className="btn-primary mt-4 w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isExportingAudio ? "Generating narration…" : "Download narration"}
      </button>

      {audioExportMessage && (
        <div className="mt-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-3 py-2.5 text-xs text-emerald-200">
          {audioExportMessage}
        </div>
      )}

      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
        {TTS_EXPORT_DISCLOSURE} {TTS_PREVIEW_DISCLOSURE}
      </p>
    </div>
  );
}
