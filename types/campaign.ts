export type AspectRatio = "4:5" | "9:16";

export type CampaignStatus =
  | "idle"
  | "generating_text"
  | "generating_images"
  | "completed"
  | "failed";

export interface Campaign {
  id: string;
  user_id: string;
  topic: string;
  title: string | null;
  target_audience: string | null;
  aspect_ratio: AspectRatio;
  slide_count: number;
  status: CampaignStatus;
  error_message: string | null;
  product_reference_url: string | null;
  style_reference_url: string | null;
  logo_reference_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Slide {
  id: string;
  campaign_id: string;
  slide_index: number;
  text_overlay: string | null;
  voiceover_script: string | null;
  image_prompt: string | null;
  image_url: string | null;
  fal_request_id: string | null;
  created_at: string;
  updated_at: string;
}
