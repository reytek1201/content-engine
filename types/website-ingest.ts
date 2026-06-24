export interface WebsiteIngestResult {
  businessName: string;
  description: string;
  audience: string;
  topics: string[];
  productImageUrl: string | null;
  sourceUrl: string;
}

export interface WebsiteIngestCompletePayload {
  businessName: string;
  description: string;
  audience: string;
  topics: string[];
  productImageUrl: string | null;
  sourceUrl: string;
}

export interface WebsiteIngestApiSuccess {
  success: true;
  businessName: string;
  description: string;
  audience: string;
  topics: string[];
  productImageUrl: string | null;
  sourceUrl: string;
}

export interface WebsiteIngestApiFailure {
  success: false;
  error: string;
  code?: string;
}

export type WebsiteIngestApiResponse =
  | WebsiteIngestApiSuccess
  | WebsiteIngestApiFailure;
