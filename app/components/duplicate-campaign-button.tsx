"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface DuplicateCampaignButtonProps {
  campaignId: string;
  className?: string;
}

export default function DuplicateCampaignButton({
  campaignId,
  className = "",
}: DuplicateCampaignButtonProps) {
  const router = useRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);

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

      router.push(`/campaign/${data.campaignId}`);
      router.refresh();
    } catch (duplicateError) {
      window.alert(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Failed to duplicate campaign"
      );
      setIsDuplicating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={isDuplicating}
      className={`btn-secondary px-4 py-2.5 ${className}`}
    >
      {isDuplicating ? "Duplicating…" : "Duplicate campaign"}
    </button>
  );
}
