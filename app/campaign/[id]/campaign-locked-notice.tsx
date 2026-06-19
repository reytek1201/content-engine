import type { ReactNode } from "react";

export type CampaignNoticeVariant = "locked" | "action" | "success";

const variantClasses: Record<CampaignNoticeVariant, string> = {
  locked: "border-border bg-card/50 text-muted-foreground",
  action: "border-amber-900/40 bg-amber-950/20 text-amber-100",
  success: "border-emerald-900/50 bg-emerald-950/20 text-emerald-200",
};

const titleClasses: Record<CampaignNoticeVariant, string> = {
  locked: "text-secondary-foreground",
  action: "text-amber-100",
  success: "text-emerald-200",
};

interface CampaignLockedNoticeProps {
  variant?: CampaignNoticeVariant;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export default function CampaignLockedNotice({
  variant = "locked",
  title,
  description,
  children,
  className = "",
}: CampaignLockedNoticeProps) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${variantClasses[variant]} ${className}`}
    >
      <p className={`text-sm font-semibold ${titleClasses[variant]}`}>{title}</p>
      {description ? (
        <p
          className={`mt-1 text-xs leading-5 ${
            variant === "locked" ? "text-muted-foreground" : "opacity-90"
          }`}
        >
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
