import { Capacitor } from "@capacitor/core";

const NATIVE_APP_UA_TOKEN = "SlidePressApp/";

type NativeWindow = Window & {
  WEBVIEW_SERVER_URL?: string;
  androidBridge?: unknown;
  Ionic?: {
    WebView?: unknown;
  };
  webkit?: {
    messageHandlers?: {
      bridge?: unknown;
    };
  };
  Capacitor?: {
    getServerUrl?: () => string;
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
  };
};

export function isNativeAppRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const win = window as NativeWindow;

  if (navigator.userAgent.includes(NATIVE_APP_UA_TOKEN)) {
    return true;
  }

  const webviewServerUrl = win.WEBVIEW_SERVER_URL ?? win.Capacitor?.getServerUrl?.();
  if (typeof webviewServerUrl === "string" && webviewServerUrl.length > 0) {
    return true;
  }

  if (win.Ionic?.WebView) {
    return true;
  }

  if (win.androidBridge || win.webkit?.messageHandlers?.bridge) {
    return true;
  }

  if (win.Capacitor?.isNativePlatform?.()) {
    return true;
  }

  try {
    const platform = Capacitor.getPlatform();
    return platform === "ios" || platform === "android";
  } catch {
    return false;
  }
}
