import type { ReactNode } from "react";
import {
  getAppStoreUrl,
  getPlayStoreUrl,
} from "@/utils/app-store-links";
import { AppleIcon, GooglePlayIcon } from "@/app/components/marketing/marketing-icons";

function StoreBadge({
  href,
  label,
  icon,
  sublabel,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  sublabel: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="marketing-store-badge group"
      aria-label={label}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-foreground transition group-hover:bg-white/15">
        {icon}
      </span>
      <span className="text-left">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {sublabel}
        </span>
        <span className="block text-sm font-semibold text-foreground">
          {label}
        </span>
      </span>
    </a>
  );
}

function ComingSoonBadge({
  platform,
  icon,
}: {
  platform: string;
  icon: ReactNode;
}) {
  return (
    <div
      className="marketing-store-badge cursor-default opacity-70"
      aria-label={`${platform} — coming soon`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-muted-foreground">
        {icon}
      </span>
      <span className="text-left">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Coming soon
        </span>
        <span className="block text-sm font-semibold text-secondary-foreground">
          {platform}
        </span>
      </span>
    </div>
  );
}

export default function MarketingStoreBadges({
  layout = "row",
}: {
  layout?: "row" | "column";
}) {
  const appStoreUrl = getAppStoreUrl();
  const playStoreUrl = getPlayStoreUrl();

  return (
    <div
      className={
        layout === "column"
          ? "flex flex-col gap-3"
          : "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
      }
    >
      {appStoreUrl ? (
        <StoreBadge
          href={appStoreUrl}
          label="App Store"
          sublabel="Download on the"
          icon={<AppleIcon className="h-5 w-5" />}
        />
      ) : (
        <ComingSoonBadge
          platform="App Store"
          icon={<AppleIcon className="h-5 w-5" />}
        />
      )}
      {playStoreUrl ? (
        <StoreBadge
          href={playStoreUrl}
          label="Google Play"
          sublabel="Get it on"
          icon={<GooglePlayIcon className="h-5 w-5" />}
        />
      ) : (
        <ComingSoonBadge
          platform="Google Play"
          icon={<GooglePlayIcon className="h-5 w-5" />}
        />
      )}
    </div>
  );
}
