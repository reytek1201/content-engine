export type PlatformPostStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "published"
  | "failed"
  | "scheduled";

export type PlatformPostScheduleStatus = "pending" | "posted" | "failed";

export type PlatformPostPlatform = "youtube" | "tiktok" | "instagram";

export interface PlatformPostPublic {
  id: string;
  campaignId: string;
  platform: PlatformPostPlatform;
  exportId: string | null;
  status: PlatformPostStatus;
  externalId: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  scheduledFor: string | null;
  scheduleStatus: PlatformPostScheduleStatus | null;
  failureReason: string | null;
  publishSettings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformPostRow {
  id: string;
  user_id: string;
  campaign_id: string;
  platform: PlatformPostPlatform;
  export_id: string | null;
  status: PlatformPostStatus;
  external_id: string | null;
  external_url: string | null;
  error_message: string | null;
  scheduled_for: string | null;
  schedule_status: PlatformPostScheduleStatus | null;
  failure_reason: string | null;
  publish_settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export function toPlatformPostPublic(row: PlatformPostRow): PlatformPostPublic {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    platform: row.platform,
    exportId: row.export_id,
    status: row.status,
    externalId: row.external_id,
    externalUrl: row.external_url,
    errorMessage: row.error_message,
    scheduledFor: row.scheduled_for,
    scheduleStatus: row.schedule_status,
    failureReason: row.failure_reason,
    publishSettings: row.publish_settings,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
