"use client";

import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect } from "react";

const STATUS_BAR_BACKGROUND = "#09090b";

export default function NativeShell() {
  const isNativeApp = useIsNativeApp();

  useEffect(() => {
    if (isNativeApp !== true) {
      return;
    }

    async function configureStatusBar() {
      try {
        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setBackgroundColor({ color: STATUS_BAR_BACKGROUND });
        }

        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {
        // Plugin unavailable outside the Capacitor shell.
      }
    }

    void configureStatusBar();
  }, [isNativeApp]);

  return null;
}
