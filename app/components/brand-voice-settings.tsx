"use client";

import VoicePersonaPicker from "@/app/components/voice-persona-picker";
import { updateBrand } from "@/utils/brands-client";
import type { Brand } from "@/types/brand";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import { resolveVoicePersona } from "@/utils/tts/voice-catalog";
import { useEffect, useState } from "react";

interface BrandVoiceSettingsProps {
  brand: Brand;
  onUpdated: (brand: Brand) => void;
}

export default function BrandVoiceSettings({
  brand,
  onUpdated,
}: BrandVoiceSettingsProps) {
  const initialPersona =
    resolveVoicePersona(brand.preferred_voice_persona ?? "") ?? "warm";
  const [persona, setPersona] = useState<VoicePersona>(initialPersona);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setPersona(resolveVoicePersona(brand.preferred_voice_persona ?? "") ?? "warm");
  }, [brand.id, brand.preferred_voice_persona]);

  async function handlePersonaChange(nextPersona: VoicePersona) {
    const previous = persona;
    setPersona(nextPersona);
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      const updated = await updateBrand(brand.id, {
        preferred_voice_persona: nextPersona,
      });
      onUpdated(updated);
      setSuccessMessage("Default voice saved.");
    } catch (saveError) {
      setPersona(previous);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save default voice",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 border-t border-border pt-8">
      <h2 className="text-sm font-semibold text-foreground">Default voice</h2>
      <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
        New campaigns for this brand start with this narration voice. You can
        still change it while editing slides or exporting.
      </p>

      <div className="mt-4">
        <VoicePersonaPicker
          value={persona}
          onChange={(next) => void handlePersonaChange(next)}
          saving={saving}
        />
      </div>

      {saving && (
        <p className="mt-2 text-xs text-muted-foreground">Saving…</p>
      )}
      {successMessage && (
        <p className="mt-2 text-xs text-primary">{successMessage}</p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
