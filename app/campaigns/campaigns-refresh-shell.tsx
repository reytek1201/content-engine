"use client";

import PullToRefresh from "@/app/components/pull-to-refresh";
import { fetchAndSyncWidgetSnapshot } from "@/utils/native-widget-plugin";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export default function CampaignsRefreshShell({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <PullToRefresh
      onRefresh={async () => {
        await fetchAndSyncWidgetSnapshot();
        router.refresh();
      }}
    >
      {children}
    </PullToRefresh>
  );
}
