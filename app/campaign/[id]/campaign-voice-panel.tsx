"use client";

import {
  TTS_EXPORT_DISCLOSURE,
  TTS_PREVIEW_DISCLOSURE,
} from "@/utils/tts/disclosure-copy";
import { VOICE_PERSONAS, type VoicePersona } from "@/utils/tts/voice-catalog";

const PERSONA_LABELS: Record<VoicePersona, string> = {
  warm: "Warm",
  energetic: "Energetic",
  professional: "Professional",
};

interface CampaignVoicePanelProps {
  preferredVoicePersona: VoicePersona;
  brandId: string | null;
  disabled?: boolean;
  isSaving?: boolean;
  hasVoiceoverScripts?: boolean;
  isExportingAudio?: boolean;
  audioExportMessage?: string | null;
  onPersonaChange: (persona: VoicePersona) => void;
  onExportAudio?: () => void;
}

export default function CampaignVoicePanel({
  preferredVoicePersona,
  brandId,
  disabled = false,
  isSaving = false,
  hasVoiceoverScripts = false,
  isExportingAudio = false,
  audioExportMessage = null,
  onPersonaChange,
  onExportAudio,
}: CampaignVoicePanelProps) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">AI narration voice</h3>
        <p className="text-xs leading-5 text-muted-foreground">
          Preview slides and export narration MP3s for video editing.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {VOICE_PERSONAS.map((persona) => {
          const isActive = persona === preferredVoicePersona;
          return (
            <button
              key={persona}
              type="button"
              disabled={disabled || isSaving || !brandId}
              onClick={() => onPersonaChange(persona)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isActive
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-secondary-foreground hover:border-ring/60 hover:text-foreground"
              }`}
            >
              {PERSONA_LABELS[persona]}
            </button>
          );
        })}
      </div>

      {!brandId && (
        <p className="mt-2 text-xs text-muted-foreground">
          Link this campaign to a brand to save a default voice.
        </p>
      )}

      {isSaving && (
        <p className="mt-2 text-xs text-muted-foreground">Saving voice preference…</p>
      )}

      {onExportAudio && (
        <div className="mt-4 border-t border-border pt-4">
          <button
            type="button"
            disabled={disabled || isExportingAudio || !hasVoiceoverScripts}
            onClick={onExportAudio}
            className="btn-primary w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExportingAudio ? "Generating narration…" : "Download narration"}
          </button>

          {!hasVoiceoverScripts && (
            <p className="mt-2 text-xs text-muted-foreground">
              Voiceover scripts appear after slide copy is generated.
            </p>
          )}

          {audioExportMessage && (
            <div className="mt-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-3 py-2.5 text-xs text-emerald-200">
              {audioExportMessage}
            </div>
          )}

          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            {TTS_EXPORT_DISCLOSURE}
          </p>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
        {TTS_PREVIEW_DISCLOSURE}
      </p>
    </div>
  );
}
