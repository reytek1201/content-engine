"use client";

import PhotoTopicSuggester from "@/app/components/photo-topic-suggester";
import WebsiteTopicSuggester from "@/app/components/website-topic-suggester";
import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import type {
  TopicSelectionOptions,
  WebsiteIngestCompletePayload,
} from "@/types/website-ingest";
import { useState } from "react";

type SuggesterMode = "website" | "photo";

interface CampaignTopicSuggesterProps {
  onSelectTopic: (topic: string, options?: TopicSelectionOptions) => void;
  onIngestComplete?: (payload: WebsiteIngestCompletePayload) => void;
  selectedTopic?: string;
  disabled?: boolean;
  defaultExpanded?: boolean;
  inputId?: string;
}

export default function CampaignTopicSuggester({
  onSelectTopic,
  onIngestComplete,
  selectedTopic = "",
  disabled = false,
  defaultExpanded = false,
  inputId,
}: CampaignTopicSuggesterProps) {
  const isNativeApp = useIsNativeApp();
  const [mode, setMode] = useState<SuggesterMode>("website");

  if (isNativeApp === true) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setMode("website")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "website"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Website
          </button>
          <button
            type="button"
            onClick={() => setMode("photo")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "photo"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Photo
          </button>
        </div>

        {mode === "website" ? (
          <WebsiteTopicSuggester
            inputId={inputId}
            defaultExpanded={defaultExpanded}
            selectedTopic={selectedTopic}
            onSelectTopic={onSelectTopic}
            onIngestComplete={onIngestComplete}
            disabled={disabled}
          />
        ) : (
          <PhotoTopicSuggester
            onSelectTopic={onSelectTopic}
            disabled={disabled}
          />
        )}
      </div>
    );
  }

  return (
    <WebsiteTopicSuggester
      inputId={inputId}
      defaultExpanded={defaultExpanded}
      selectedTopic={selectedTopic}
      onSelectTopic={onSelectTopic}
      onIngestComplete={onIngestComplete}
      disabled={disabled}
    />
  );
}
