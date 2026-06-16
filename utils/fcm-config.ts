interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function parseServiceAccountJson(raw: string): FirebaseServiceAccount | null {
  try {
    const parsed = JSON.parse(raw) as FirebaseServiceAccount;

    if (
      typeof parsed.project_id !== "string" ||
      typeof parsed.client_email !== "string" ||
      typeof parsed.private_key !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getFirebaseServiceAccount(): FirebaseServiceAccount | null {
  const encoded = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim();

  if (encoded) {
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const fromBase64 = parseServiceAccountJson(decoded);
      if (fromBase64) {
        return fromBase64;
      }
    } catch {
      // Fall through to plain JSON.
    }

    const fromPlain = parseServiceAccountJson(encoded);
    if (fromPlain) {
      return fromPlain;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim()?.replace(
    /\\n/g,
    "\n",
  );

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };
}

export function isFcmConfigured(): boolean {
  return getFirebaseServiceAccount() !== null;
}
