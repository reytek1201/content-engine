/** Gate dev-only "Send test push" behind an explicit env flag or local dev. */
export function isPushTestEnabled(): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return process.env.NEXT_PUBLIC_ALLOW_PUSH_TEST === "true";
}
