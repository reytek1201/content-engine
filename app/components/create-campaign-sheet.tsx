"use client";

import BottomSheet from "@/app/components/bottom-sheet";
import CreateCampaignForm from "@/app/components/create-campaign-form";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

interface CreateCampaignSheetProps {
  open: boolean;
  onClose: () => void;
  user: User;
  formKey: number;
}

export default function CreateCampaignSheet({
  open,
  onClose,
  user,
  formKey,
}: CreateCampaignSheetProps) {
  const router = useRouter();

  function handleSuccess(campaignId: string) {
    onClose();
    router.push(`/campaign/${campaignId}`);
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="New campaign"
      titleId="create-campaign-sheet-title"
      description="Paste your website for ideas, or enter a topic manually."
      mobileOnly
      zIndexClass="z-[60]"
    >
      <CreateCampaignForm
        key={formKey}
        user={user}
        idPrefix="sheet-"
        compact
        onSuccess={handleSuccess}
      />
    </BottomSheet>
  );
}
