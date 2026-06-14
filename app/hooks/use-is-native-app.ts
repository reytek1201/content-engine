"use client";

import { isNativeAppRuntime } from "@/utils/is-native-app";
import { useLayoutEffect, useState } from "react";

export type NativeAppState = boolean | null;

export function useIsNativeApp(): NativeAppState {
  const [isNativeApp, setIsNativeApp] = useState<NativeAppState>(null);

  useLayoutEffect(() => {
    function syncNativeState() {
      setIsNativeApp(isNativeAppRuntime());
    }

    syncNativeState();

    const frameId = window.requestAnimationFrame(syncNativeState);
    const timeoutIds = [0, 50, 250, 1000].map((delay) =>
      window.setTimeout(syncNativeState, delay),
    );

    return () => {
      window.cancelAnimationFrame(frameId);
      for (const timeoutId of timeoutIds) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return isNativeApp;
}
