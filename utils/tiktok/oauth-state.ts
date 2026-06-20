import { createHmac, randomBytes } from "crypto";
import { getTikTokOAuthConfig } from "@/utils/tiktok/oauth";

const STATE_TTL_MS = 10 * 60 * 1000;

function signPayload(payloadB64: string): string {
  const { clientSecret } = getTikTokOAuthConfig();
  return createHmac("sha256", clientSecret).update(payloadB64).digest("base64url");
}

export function createTikTokOAuthState(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + STATE_TTL_MS,
    nonce: randomBytes(16).toString("hex"),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

export function verifyTikTokOAuthState(state: string): string {
  const [payloadB64, sig] = state.split(".");

  if (!payloadB64 || !sig) {
    throw new Error("Invalid OAuth state");
  }

  if (sig !== signPayload(payloadB64)) {
    throw new Error("Invalid OAuth state signature");
  }

  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf8"),
  ) as { userId: string; exp: number };

  if (!payload.userId || typeof payload.exp !== "number") {
    throw new Error("Invalid OAuth state payload");
  }

  if (Date.now() > payload.exp) {
    throw new Error("OAuth state expired");
  }

  return payload.userId;
}
