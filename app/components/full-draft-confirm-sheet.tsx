"use client";

import BottomSheet from "@/app/components/bottom-sheet";
import type { UsageSummary } from "@/types/usage";
import { formatDraftDurationShort } from "@/utils/campaign-draft-timing";
import { formatCampaignCreditConfirmLine } from "@/utils/format-campaign-credit-confirm";
import { fetchUsageSummary } from "@/utils/client-usage";
import { useEffect, useState } from "react";

interface FullDraftConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  slideCount: number;
  topic: string;
  usage: UsageSummary | null;
  isConfirming?: boolean;
}

export default function FullDraftConfirmSheet({
  open,
  onClose,
  onConfirm,
  slideCount,
  topic,
  usage: initialUsage,
  isConfirming = false,
}: FullDraftConfirmSheetProps) {
  const [usage, setUsage] = useState<UsageSummary | null>(initialUsage);
  const [usageLoading, setUsageLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setUsage(initialUsage);

    let cancelled = false;

    async function refreshUsage() {
      setUsageLoading(true);

      try {
        const fresh = await fetchUsageSummary();

        if (!cancelled && fresh) {
          setUsage(fresh);
        }
      } finally {
        if (!cancelled) {
          setUsageLoading(false);
        }
      }
    }

    void refreshUsage();

    return () => {
      cancelled = true;
    };
  }, [open, initialUsage]);

  const creditLine =
    usage && !usageLoading
      ? formatCampaignCreditConfirmLine(usage)
      : "Loading campaign usage…";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Create full draft?"
      titleId="full-draft-confirm-title"
      dismissDisabled={isConfirming}
      zIndexClass="z-[70]"
      maxHeightClass="max-h-[min(90dvh,520px)]"
      desktopModal
      footer={
        <div className="flex flex-col gap-2 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming || usageLoading || !usage?.canCreateCampaign}
            className="btn-primary py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConfirming ? "Starting…" : "Create full draft"}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-6 text-muted-foreground">
        We&apos;ll write slide copy, generate images, and create platform
        captions for{" "}
        <span className="font-medium text-secondary-foreground">
          {topic.trim() || "this topic"}
        </span>
        . Video export stays a separate step.
      </p>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Usually {formatDraftDurationShort(slideCount)} unattended after you
        confirm.
      </p>

      <div className="mt-4 rounded-xl border border-border bg-background/40 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cost
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{creditLine}</p>
      </div>
    </BottomSheet>
  );
}
