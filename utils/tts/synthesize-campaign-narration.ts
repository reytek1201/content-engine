import type { Slide } from "@/types/campaign";
import { getVoiceIdForPersona, type VoicePersona } from "@/utils/tts/voice-catalog";
import { getTtsProvider } from "@/utils/tts/provider";
import type { TtsUsageContext } from "@/utils/tts/types";
import JSZip from "jszip";

export interface CampaignNarrationSlide {
  slideIndex: number;
  filename: string;
  audio: Buffer;
  charCount: number;
}

export interface SynthesizeCampaignNarrationInput {
  slides: Slide[];
  persona?: VoicePersona;
  voiceId?: string;
  usage: TtsUsageContext;
}

function padSlideIndex(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export async function synthesizeCampaignNarration(
  input: SynthesizeCampaignNarrationInput,
): Promise<CampaignNarrationSlide[]> {
  const sortedSlides = [...input.slides].sort(
    (left, right) => left.slide_index - right.slide_index,
  );

  const slidesWithScript = sortedSlides.filter((slide) =>
    Boolean(slide.voiceover_script?.trim()),
  );

  if (slidesWithScript.length === 0) {
    throw new Error("No voiceover scripts found for campaign slides");
  }

  const voiceId =
    input.voiceId ??
    getVoiceIdForPersona(input.persona ?? "warm");
  const provider = getTtsProvider();

  const results = await Promise.all(
    slidesWithScript.map(async (slide) => {
      const result = await provider.synthesize({
        text: slide.voiceover_script!,
        voiceId,
        usage: {
          userId: input.usage.userId,
          campaignId: input.usage.campaignId,
          slideId: slide.id,
        },
      });

      return {
        slideIndex: slide.slide_index,
        filename: `slide-${padSlideIndex(slide.slide_index)}.mp3`,
        audio: result.audio,
        charCount: result.charCount,
      };
    }),
  );

  return results;
}

export async function buildNarrationZip(
  slides: CampaignNarrationSlide[],
): Promise<Uint8Array> {
  const zip = new JSZip();

  for (const slide of slides) {
    zip.file(slide.filename, slide.audio);
  }

  const buffers = slides.map((slide) => slide.audio);
  if (buffers.length > 0) {
    zip.file("full-narration.mp3", Buffer.concat(buffers));
  }

  return zip.generateAsync({ type: "uint8array" });
}

export function getNarrationZipFilename(campaignTitle: string | null, campaignId: string): string {
  const base =
    campaignTitle
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `campaign-${campaignId.slice(0, 8)}`;

  return `${base}-narration.zip`;
}
