"use client";

import BottomSheet from "@/app/components/bottom-sheet";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CampaignWorkspaceOverflowMenuProps {
  campaignId: string;
  campaignTitle?: string | null;
  onViewBrief: () => void;
}

export default function CampaignWorkspaceOverflowMenu({
  campaignId,
  campaignTitle,
  onViewBrief,
}: CampaignWorkspaceOverflowMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function closeMenu() {
    if (!isDuplicating && !isDeleting) {
      setOpen(false);
    }
  }

  async function handleDuplicate() {
    setIsDuplicating(true);

    try {
      const response = await fetch("/api/duplicate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });

      const data = (await response.json()) as {
        success: boolean;
        campaignId?: string;
        error?: string;
      };

      if (!response.ok || !data.success || !data.campaignId) {
        throw new Error(data.error ?? "Failed to duplicate campaign");
      }

      setOpen(false);
      router.push(`/campaign/${data.campaignId}`);
      router.refresh();
    } catch (duplicateError) {
      window.alert(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Failed to duplicate campaign",
      );
      setIsDuplicating(false);
    }
  }

  async function handleDelete() {
    const label = campaignTitle?.trim() || "this campaign";
    const confirmed = window.confirm(
      `Delete "${label}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to delete campaign");
      }

      setOpen(false);
      router.push("/campaigns");
      router.refresh();
    } catch (deleteError) {
      window.alert(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete campaign",
      );
      setIsDeleting(false);
    }
  }

  function handleViewBrief() {
    setOpen(false);
    onViewBrief();
  }

  const busy = isDuplicating || isDeleting;

  return (
    <>
      <button
        type="button"
        aria-label="Campaign actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card/40 text-lg leading-none text-muted-foreground transition hover:border-ring/60 hover:text-foreground"
      >
        ⋯
      </button>

      <BottomSheet
        open={open}
        onClose={closeMenu}
        title="Campaign actions"
        titleId="campaign-overflow-title"
        dismissDisabled={busy}
        zIndexClass="z-[70]"
        maxHeightClass="max-h-[min(70vh,24rem)]"
        desktopModal
      >
        <ul className="space-y-2">
          <li>
            <button
              type="button"
              onClick={handleViewBrief}
              disabled={busy}
              className="flex min-h-11 w-full items-center rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-semibold text-foreground transition hover:border-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              View brief
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => void handleDuplicate()}
              disabled={busy}
              className="flex min-h-11 w-full items-center rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-semibold text-foreground transition hover:border-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDuplicating ? "Duplicating…" : "Duplicate campaign"}
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={busy}
              className="flex min-h-11 w-full items-center rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-left text-sm font-semibold text-red-200 transition hover:border-red-700 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting…" : "Delete campaign"}
            </button>
          </li>
        </ul>
      </BottomSheet>
    </>
  );
}
