"use client";

import { deleteBrand } from "@/utils/brands-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeleteBrandButtonProps {
  brandId: string;
  brandName: string;
  isDefault: boolean;
  isOnlyBrand: boolean;
  onDeleted?: (replacementBrandId?: string) => void | Promise<void>;
  redirectTo?: string | null;
  className?: string;
  label?: string;
}

function buildDeleteBrandMessage(
  brandName: string,
  isDefault: boolean,
  isOnlyBrand: boolean,
): string {
  const label = brandName.trim() || "this brand";

  if (isOnlyBrand) {
    return `Delete "${label}"? This permanently removes the brand kit and all campaigns in this workspace. A fresh empty brand will be created. This cannot be undone.`;
  }

  if (isDefault) {
    return `Delete "${label}"? This permanently removes the brand kit and all campaigns linked to this brand. Another brand will become your default. This cannot be undone.`;
  }

  return `Delete "${label}"? Campaigns linked to this brand will stay in your account but won't belong to a brand anymore. This cannot be undone.`;
}

export default function DeleteBrandButton({
  brandId,
  brandName,
  isDefault,
  isOnlyBrand,
  onDeleted,
  redirectTo = null,
  className = "",
  label = "Delete brand",
}: DeleteBrandButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      buildDeleteBrandMessage(brandName, isDefault, isOnlyBrand),
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteBrand(brandId);
      await onDeleted?.(result.replacementBrandId);

      if (redirectTo) {
        router.push(redirectTo);
      }

      router.refresh();
    } catch (deleteError) {
      window.alert(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete brand",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleDelete()}
      disabled={isDeleting}
      className={`inline-flex items-center justify-center rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:border-red-700 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {isDeleting ? "Deleting…" : label}
    </button>
  );
}
