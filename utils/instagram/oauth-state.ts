import { createHmac, randomBytes } from "crypto";
import {
  resolveSafeReturnPath,
  type PlatformOAuthIntent,
} from "@/utils/platforms/oauth-return";
import { getInstagramOAuthConfig } from "@/utils/instagram/oauth";

const STATE_TTL_MS = 10 * 60 * 1000;

export interface InstagramOAuthStatePayload {
  userId: string;
  exp: number;
  nonce: string;
  returnTo?: string;
  intent: PlatformOAuthIntent;
}

function signPayload(payloadB64: string): string {
  const { appSecret } = getInstagramOAuthConfig();
  return createHmac("sha256", appSecret).update(payloadB64).digest("base64url");
}

export function createInstagramOAuthState(
  userId: string,
  options?: {
    returnTo?: string | null;
    intent?: PlatformOAuthIntent;
  },
): string {
  const payload: InstagramOAuthStatePayload = {
    userId,
    exp: Date.now() + STATE_TTL_MS,
    nonce: randomBytes(16).toString("hex"),
    intent: options?.intent ?? "connect",
  };

  const safeReturnTo = resolveSafeReturnPath(options?.returnTo ?? undefined);

  if (safeReturnTo) {
    payload.returnTo = safeReturnTo;
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

export function verifyInstagramOAuthState(
  state: string,
): InstagramOAuthStatePayload {
  const [payloadB64, sig] = state.split(".");

  if (!payloadB64 || !sig) {
    throw new Error("Invalid OAuth state");
  }

  if (sig !== signPayload(payloadB64)) {
    throw new Error("Invalid OAuth state signature");
  }

  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf8"),
  ) as Partial<InstagramOAuthStatePayload>;

  if (!payload.userId || typeof payload.exp !== "number") {
    throw new Error("Invalid OAuth state payload");
  }

  if (Date.now() > payload.exp) {
    throw new Error("OAuth state expired");
  }

  return {
    userId: payload.userId,
    exp: payload.exp,
    nonce: payload.nonce ?? "",
    returnTo: resolveSafeReturnPath(payload.returnTo),
    intent: payload.intent === "publish" ? "publish" : "connect",
  };
}
