"use client";

import PullToRefresh from "@/app/components/pull-to-refresh";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export default function CampaignsRefreshShell({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <PullToRefresh onRefresh={() => router.refresh()}>{children}</PullToRefresh>
  );
}
