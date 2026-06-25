/** Server-side gate for burned-in caption pipeline. */
export function isBurnCaptionsEnabled(): boolean {
  if (process.env.ENABLE_BURN_CAPTIONS === "true") {
    return true;
  }

  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return process.env.NEXT_PUBLIC_ENABLE_BURN_CAPTIONS === "true";
}

/** Client-safe check for showing the burn-captions toggle. */
export function isBurnCaptionsUiEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_BURN_CAPTIONS === "true") {
    return true;
  }

  return process.env.NODE_ENV === "development";
}
