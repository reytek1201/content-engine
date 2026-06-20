export type PlatformConnectionPlatform = "youtube" | "tiktok";

export interface PlatformConnectionPublic {
  platform: PlatformConnectionPlatform;
  accountLabel: string;
  accountExternalId: string;
  connectedAt: string;
  expiresAt: string;
}

export interface PlatformConnectionRow {
  id: string;
  user_id: string;
  platform: PlatformConnectionPlatform;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  account_external_id: string;
  account_label: string;
  created_at: string;
  updated_at: string;
}
