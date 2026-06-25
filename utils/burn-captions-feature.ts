/** Burned-in captions are live for all users. */
export function isBurnCaptionsEnabled(): boolean {
  return true;
}

/** Client-safe check for showing the burn-captions toggle. */
export function isBurnCaptionsUiEnabled(): boolean {
  return true;
}
