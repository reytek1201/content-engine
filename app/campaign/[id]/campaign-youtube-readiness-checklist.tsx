interface YouTubeReadinessItem {
  label: string;
  done: boolean;
  locked: boolean;
}

interface CampaignYouTubeReadinessChecklistProps {
  hasCaptions: boolean;
  hasVideoExport: boolean;
  connected: boolean;
  alreadyPublished: boolean;
}

export default function CampaignYouTubeReadinessChecklist({
  hasCaptions,
  hasVideoExport,
  connected,
  alreadyPublished,
}: CampaignYouTubeReadinessChecklistProps) {
  const items: YouTubeReadinessItem[] = [
    {
      label: "YouTube captions",
      done: hasCaptions,
      locked: false,
    },
    {
      label: "9:16 video export",
      done: hasVideoExport,
      locked: !hasCaptions,
    },
    {
      label: "YouTube connected",
      done: connected,
      locked: !hasVideoExport,
    },
    {
      label: "Posted to YouTube",
      done: alreadyPublished,
      locked: !connected || !hasVideoExport,
    },
  ];

  return (
    <ul className="mb-4 space-y-2">
      {items.map((item) => {
        const icon = item.done ? "✓" : item.locked ? "○" : "→";
        const textClass = item.done
          ? "text-emerald-300"
          : item.locked
            ? "text-muted-foreground"
            : "text-foreground";

        return (
          <li
            key={item.label}
            className={`flex items-center gap-2 text-xs ${textClass}`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                item.done
                  ? "border-emerald-700/60 bg-emerald-950/40"
                  : item.locked
                    ? "border-border bg-background/40 opacity-60"
                    : "border-primary/40 bg-primary/10 text-primary"
              }`}
              aria-hidden
            >
              {icon}
            </span>
            <span>{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
