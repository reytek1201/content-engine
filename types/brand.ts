import type { CampaignReferences } from "@/types/references";
import { hasReferences } from "@/types/references";
import type { VoicePersona } from "@/utils/tts/voice-catalog";

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  product_reference_url: string | null;
  style_reference_url: string | null;
  logo_reference_url: string | null;
  voice_notes: string | null;
  preferred_voice_persona: VoicePersona | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandProduct {
  id: string;
  brand_id: string;
  name: string;
  product_reference_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function brandToReferences(
  brand: Brand | null | undefined,
): CampaignReferences {
  if (!brand) {
    return {};
  }

  return {
    product: brand.product_reference_url,
    style: brand.style_reference_url,
    logo: brand.logo_reference_url,
  };
}

export function hasBrandAssets(brand: Brand | null | undefined): boolean {
  return hasReferences(brandToReferences(brand));
}

export function brandProductToReferences(
  product: BrandProduct | null | undefined,
  brand: Brand | null | undefined,
): CampaignReferences {
  const base = brandToReferences(brand);

  if (product?.product_reference_url) {
    return {
      ...base,
      product: product.product_reference_url,
    };
  }

  return base;
}
