const deferredReasons = new Set<string>();

export const BIOMETRIC_LOCK_DEFER_CHANGED_EVENT =
  "slidepress-biometric-lock-defer-changed";

/** Defer biometric re-lock while long-running work (e.g. video export) is active. */
export function setBiometricLockDeferred(
  reason: string,
  deferred: boolean,
): void {
  if (typeof window === "undefined") {
    return;
  }

  if (deferred) {
    deferredReasons.add(reason);
  } else {
    deferredReasons.delete(reason);
  }

  window.dispatchEvent(new CustomEvent(BIOMETRIC_LOCK_DEFER_CHANGED_EVENT));
}

export function isBiometricLockDeferred(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return deferredReasons.size > 0;
}
