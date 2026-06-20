"use client";

import { isNativeAppRuntime } from "@/utils/is-native-app";
import { Keyboard } from "@capacitor/keyboard";
import { useEffect, useState } from "react";

function readVisualViewportInset(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const viewport = window.visualViewport;
  if (!viewport) {
    return 0;
  }

  return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

export function useKeyboardInset(enabled: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setInset(0);
      return;
    }

    function updateFromViewport() {
      setInset(readVisualViewportInset());
    }

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", updateFromViewport);
    viewport?.addEventListener("scroll", updateFromViewport);
    updateFromViewport();

    if (!isNativeAppRuntime()) {
      return () => {
        viewport?.removeEventListener("resize", updateFromViewport);
        viewport?.removeEventListener("scroll", updateFromViewport);
      };
    }

    let showListener: { remove: () => void } | undefined;
    let hideListener: { remove: () => void } | undefined;

    void (async () => {
      try {
        showListener = await Keyboard.addListener("keyboardWillShow", (event) => {
          setInset(event.keyboardHeight);
        });
        hideListener = await Keyboard.addListener("keyboardWillHide", () => {
          setInset(0);
        });
      } catch {
        // Keyboard plugin unavailable.
      }
    })();

    return () => {
      viewport?.removeEventListener("resize", updateFromViewport);
      viewport?.removeEventListener("scroll", updateFromViewport);
      showListener?.remove();
      hideListener?.remove();
    };
  }, [enabled]);

  return inset;
}
