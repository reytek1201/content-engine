import Link from "next/link";

interface PlatformTierUpgradeNoticeProps {
  message: string;
  upgradeUrl?: string;
}

export default function PlatformTierUpgradeNotice({
  message,
  upgradeUrl = "/settings/usage",
}: PlatformTierUpgradeNoticeProps) {
  return (
    <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
      <p>{message}</p>
      <Link
        href={upgradeUrl}
        className="mt-2 inline-block font-semibold text-primary underline"
      >
        Upgrade plan
      </Link>
    </div>
  );
}
