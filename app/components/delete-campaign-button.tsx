"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeleteCampaignButtonProps {
  campaignId: string;
  campaignTitle?: string | null;
  redirectTo?: string;
  className?: string;
}

export default function DeleteCampaignButton({
  campaignId,
  campaignTitle,
  redirectTo = "/campaigns",
  className = "",
}: DeleteCampaignButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const label = campaignTitle?.trim() || "this campaign";
    const confirmed = window.confirm(
      `Delete "${label}"? This cannot be undone.`
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

      router.push(redirectTo);
      router.refresh();
    } catch (deleteError) {
      window.alert(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete campaign"
      );
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className={`inline-flex items-center justify-center rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:border-red-700 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {isDeleting ? "Deleting…" : "Delete campaign"}
    </button>
  );
}
