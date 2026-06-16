"use client";

import { captureProductPhotoForVision } from "@/utils/native-camera";
import { useState } from "react";

function CameraSparkleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

interface PhotoTopicSuggesterProps {
  onSelectTopic: (topic: string) => void;
  disabled?: boolean;
}

export default function PhotoTopicSuggester({
  onSelectTopic,
  disabled = false,
}: PhotoTopicSuggesterProps) {
  const [state, setState] = useState<
    "idle" | "capturing" | "thinking" | "suggestions"
  >("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleSnap() {
    if (disabled || state !== "idle") return;

    setError(null);
    setState("capturing");

    let result: { base64: string; mimeType: string } | null = null;

    try {
      result = await captureProductPhotoForVision();
    } catch {
      setState("idle");
      return;
    }

    if (!result) {
      setState("idle");
      return;
    }

    const dataUrl = `data:${result.mimeType};base64,${result.base64}`;
    setPreviewUrl(dataUrl);
    setState("thinking");

    try {
      const response = await fetch("/api/suggest-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: result.base64,
          mimeType: result.mimeType,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        topics?: string[];
        error?: string;
      };

      if (!response.ok || !data.success || !data.topics?.length) {
        throw new Error(data.error ?? "Could not generate topic suggestions");
      }

      setSuggestions(data.topics);
      setState("suggestions");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate suggestions",
      );
      setState("idle");
      setPreviewUrl(null);
    }
  }

  function handleReset() {
    setState("idle");
    setSuggestions([]);
    setError(null);
    setPreviewUrl(null);
  }

  if (state === "idle" || state === "capturing") {
    return (
      <div>
        <button
          type="button"
          disabled={disabled || state === "capturing"}
          onClick={() => void handleSnap()}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition hover:border-primary/70 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CameraSparkleIcon />
          {state === "capturing" ? "Opening camera…" : "Snap product → get topic ideas"}
        </button>
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }

  if (state === "thinking") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card/40 px-4 py-3">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Product photo"
            className="h-10 w-10 shrink-0 rounded-md object-cover"
          />
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Analysing your photo…
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Product photo"
              className="h-10 w-10 shrink-0 rounded-md object-cover"
            />
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Topic ideas from your photo
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 text-xs text-muted-foreground transition hover:text-foreground"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {suggestions.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => {
              onSelectTopic(topic);
              handleReset();
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground transition hover:border-primary/60 hover:bg-primary/5 active:opacity-80"
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
}
