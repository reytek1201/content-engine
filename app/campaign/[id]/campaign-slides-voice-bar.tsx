"use client";

import VoicePersonaPicker from "@/app/components/voice-persona-picker";
import type { VoicePersona } from "@/utils/tts/voice-catalog";

interface CampaignSlidesVoiceBarProps {
  preferredVoicePersona: VoicePersona;
  brandId: string | null;
  brandName?: string | null;
  isSavingVoicePersona: boolean;
  disabled?: boolean;
  onPersonaChange: (persona: VoicePersona) => void;
}

export default function CampaignSlidesVoiceBar({
  preferredVoicePersona,
  brandId,
  brandName,
  isSavingVoicePersona,
  disabled = false,
  onPersonaChange,
}: CampaignSlidesVoiceBarProps) {
  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Brand voice</p>
          <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
            {brandId
              ? `Used for previews and exports${brandName ? ` · ${brandName}` : ""}. Saved as your brand default.`
              : "Used for previews and exports on this campaign."}
          </p>
        </div>
        <VoicePersonaPicker
          value={preferredVoicePersona}
          onChange={onPersonaChange}
          disabled={disabled}
          saving={isSavingVoicePersona}
          size="sm"
        />
      </div>
      {isSavingVoicePersona && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Saving voice preference…
        </p>
      )}
    </div>
  );
}
