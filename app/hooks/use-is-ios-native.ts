"use client";

import { Capacitor } from "@capacitor/core";
import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getIsIosNative(): boolean {
  return Capacitor.getPlatform() === "ios";
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsIosNative(): boolean {
  return useSyncExternalStore(subscribe, getIsIosNative, getServerSnapshot);
}
