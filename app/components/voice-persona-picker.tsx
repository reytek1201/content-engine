"use client";

import { VOICE_PERSONAS, type VoicePersona } from "@/utils/tts/voice-catalog";

export const VOICE_PERSONA_LABELS: Record<VoicePersona, string> = {
  warm: "Warm",
  confident: "Confident",
  energetic: "Energetic",
  professional: "Professional",
};

export const VOICE_PERSONA_HINTS: Record<VoicePersona, string> = {
  warm: "Friendly",
  confident: "Polished",
  energetic: "High energy",
  professional: "Authoritative",
};

interface VoicePersonaPickerProps {
  value: VoicePersona;
  onChange: (persona: VoicePersona) => void;
  disabled?: boolean;
  saving?: boolean;
  size?: "sm" | "md";
}

export default function VoicePersonaPicker({
  value,
  onChange,
  disabled = false,
  saving = false,
  size = "md",
}: VoicePersonaPickerProps) {
  const isDisabled = disabled || saving;
  const padding = size === "sm" ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs";

  return (
    <div className="flex flex-wrap gap-2">
      {VOICE_PERSONAS.map((persona) => {
        const isActive = persona === value;

        return (
          <button
            key={persona}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(persona)}
            title={VOICE_PERSONA_HINTS[persona]}
            className={`rounded-xl border font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${padding} ${
              isActive
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-secondary-foreground hover:border-ring/60 hover:text-foreground"
            }`}
          >
            {VOICE_PERSONA_LABELS[persona]}
          </button>
        );
      })}
    </div>
  );
}
