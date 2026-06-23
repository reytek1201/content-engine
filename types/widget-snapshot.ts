export const WIDGET_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export type WidgetJourneyStepId =
  | "copy"
  | "images"
  | "captions"
  | "video"
  | "publish"
  | "done";

export interface WidgetSnapshot {
  schemaVersion: typeof WIDGET_SNAPSHOT_SCHEMA_VERSION;
  updatedAt: string;
  signedOut: boolean;
  campaignId: string | null;
  title: string;
  statusLine: string;
  nextStepLabel: string;
  journeyStep: WidgetJourneyStepId;
  journeyStepsComplete: number;
  isGenerating: boolean;
  deepLink: string;
}
