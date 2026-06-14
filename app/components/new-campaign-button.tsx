"use client";

import { useCreateSheet } from "@/app/components/create-sheet-context";
import Link from "next/link";

interface NewCampaignButtonProps {
  className?: string;
  label?: string;
}

export default function NewCampaignButton({
  className = "",
  label = "New campaign",
}: NewCampaignButtonProps) {
  const { openCreateSheet } = useCreateSheet();

  return (
    <>
      <Link href="/new" className={`btn-primary hidden md:inline-flex ${className}`}>
        {label}
      </Link>
      <button
        type="button"
        onClick={openCreateSheet}
        className={`btn-primary md:hidden ${className}`}
      >
        {label}
      </button>
    </>
  );
}
