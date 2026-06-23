"use client";

import { fetchAndSyncWidgetSnapshot } from "@/utils/native-widget-plugin";
import { isNativeAppRuntime } from "@/utils/is-native-app";
import { useEffect } from "react";

export default function CampaignsWidgetSync() {
  useEffect(() => {
    if (!isNativeAppRuntime()) {
      return;
    }

    void fetchAndSyncWidgetSnapshot();
  }, []);

  return null;
}
