"use client";

import VoicePersonaPicker from "@/app/components/voice-persona-picker";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import { useCallback, useEffect, useRef, useState } from "react";

interface SlideVoicePreviewProps {
  campaignId: string;
  slideId: string;
  hasVoiceover: boolean;
  preferredVoicePersona: VoicePersona;
  onPersonaChange: (persona: VoicePersona) => void;
  isSavingVoicePersona?: boolean;
  onError: (message: string) => void;
}

export default function SlideVoicePreview({
  campaignId,
  slideId,
  hasVoiceover,
  preferredVoicePersona,
  onPersonaChange,
  isSavingVoicePersona = false,
  onError,
}: SlideVoicePreviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const revokeAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
  }, []);

  useEffect(() => {
    return () => {
      revokeAudioUrl();
    };
  }, [revokeAudioUrl, slideId]);

  useEffect(() => {
    revokeAudioUrl();
  }, [preferredVoicePersona, revokeAudioUrl]);

  const handlePreview = useCallback(async () => {
    if (!hasVoiceover || isLoading) return;

    setIsLoading(true);
    revokeAudioUrl();

    try {
      const response = await fetch("/api/tts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          campaignId,
          slideId,
          persona: preferredVoicePersona,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Voice preview failed");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      audioUrlRef.current = objectUrl;
      setAudioUrl(objectUrl);

      window.requestAnimationFrame(() => {
        void audioRef.current?.play();
      });
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Voice preview failed",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    campaignId,
    slideId,
    hasVoiceover,
    isLoading,
    preferredVoicePersona,
    onError,
    revokeAudioUrl,
  ]);

  if (!hasVoiceover) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Preview voice
        </p>
        <div className="mt-2">
          <VoicePersonaPicker
            value={preferredVoicePersona}
            onChange={onPersonaChange}
            saving={isSavingVoicePersona}
            disabled={isLoading}
            size="sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handlePreview()}
        disabled={isLoading || isSavingVoicePersona}
        className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Generating preview…" : "Preview voice"}
      </button>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          preload="none"
          className="w-full"
        />
      )}
    </div>
  );
}
