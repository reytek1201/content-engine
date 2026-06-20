"use client";

import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

type CloseHandler = () => void;

interface NativeOverlayContextValue {
  register: (id: string, onClose: CloseHandler) => void;
  unregister: (id: string) => void;
  closeTopOverlay: () => boolean;
}

const NativeOverlayContext = createContext<NativeOverlayContextValue | null>(
  null,
);

function NativeBackButtonListener() {
  const isNativeApp = useIsNativeApp();
  const router = useRouter();
  const context = useContext(NativeOverlayContext);

  useEffect(() => {
    if (isNativeApp !== true || !context) {
      return;
    }

    if (Capacitor.getPlatform() !== "android") {
      return;
    }

    const listener = App.addListener("backButton", ({ canGoBack }) => {
      if (context.closeTopOverlay()) {
        return;
      }

      if (canGoBack) {
        router.back();
        return;
      }

      void App.minimizeApp();
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [context, isNativeApp, router]);

  return null;
}

export function NativeOverlayProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<Array<{ id: string; onClose: CloseHandler }>>([]);

  const register = useCallback((id: string, onClose: CloseHandler) => {
    stackRef.current = stackRef.current.filter((entry) => entry.id !== id);
    stackRef.current.push({ id, onClose });
  }, []);

  const unregister = useCallback((id: string) => {
    stackRef.current = stackRef.current.filter((entry) => entry.id !== id);
  }, []);

  const closeTopOverlay = useCallback(() => {
    const top = stackRef.current[stackRef.current.length - 1];
    if (!top) {
      return false;
    }

    top.onClose();
    return true;
  }, []);

  return (
    <NativeOverlayContext.Provider
      value={{ register, unregister, closeTopOverlay }}
    >
      <NativeBackButtonListener />
      {children}
    </NativeOverlayContext.Provider>
  );
}

export function useNativeOverlay(onClose: () => void, open: boolean): void {
  const context = useContext(NativeOverlayContext);
  const overlayId = useId();

  useEffect(() => {
    if (!context || !open) {
      return;
    }

    context.register(overlayId, onClose);
    return () => context.unregister(overlayId);
  }, [context, onClose, open, overlayId]);
}
