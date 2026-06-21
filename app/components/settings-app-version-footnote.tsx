"use client";

import { useAppVersion } from "@/app/hooks/use-app-version";
import { formatAppVersionLabel } from "@/utils/app-version";

interface SettingsAppVersionFootnoteProps {
  className?: string;
}

export default function SettingsAppVersionFootnote({
  className = "",
}: SettingsAppVersionFootnoteProps) {
  const version = useAppVersion();
  const label = formatAppVersionLabel(version);

  if (!label) {
    return null;
  }

  return (
    <p
      className={`text-center text-xs text-muted-foreground ${className}`.trim()}
    >
      SlidePress · {label} · Beta
    </p>
  );
}
