import { GoogleGenAI } from "@google/genai";
import {
  aspectRatioContext,
  parseCampaignGeneration,
  type CampaignGeneration,
} from "@/utils/campaign-generation";
import type { CampaignReferences } from "@/types/references";
import {
  slideNarrativeGuidance,
  type SlideCount,
} from "@/types/slides";

const DEFAULT_MODEL = "gemini-2.5-flash";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenAI({ apiKey });
}

async function fetchImageInlinePart(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch reference image: ${url}`);
  }

  const mimeType = response.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    inlineData: {
      mimeType,
      data: buffer.toString("base64"),
    },
  };
}

function buildReferencePrompt(references: CampaignReferences): string[] {
  const lines: string[] = [];

  if (references.product) {
    lines.push(
      "Product reference (first image): feature this product prominently in slide concepts and image prompts."
    );
  }

  if (references.style) {
    lines.push(
      "Style reference: match palette, composition energy, and mood. Never copy text from the style reference."
    );
  }

  if (references.logo) {
    lines.push(
      "Logo reference: preserve brand identity in visual direction. Do not put logo words into text_overlay headlines."
    );
  }

  return lines;
}

export async function generateCampaignContent(
  topic: string,
  aspectRatio: "4:5" | "9:16",
  slideCount: SlideCount,
  references: CampaignReferences = {}
): Promise<CampaignGeneration> {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const maxIndex = slideCount - 1;

  const userParts: Array<
    Awaited<ReturnType<typeof fetchImageInlinePart>> | { text: string }
  > = [];

  if (references.product) {
    userParts.push(await fetchImageInlinePart(references.product));
  }

  if (references.style) {
    userParts.push(await fetchImageInlinePart(references.style));
  }

  if (references.logo) {
    userParts.push(await fetchImageInlinePart(references.logo));
  }

  userParts.push({
    text: [
      "You are a senior performance marketing copywriter and visual prompt engineer.",
      `Generate a ${slideCount}-slide social campaign optimized for Nano Banana 2 image generation on Fal.ai.`,
      `Each slide needs: slide_index (0-${maxIndex} exactly once each), text_overlay (max 12 words),`,
      "voiceover_script (natural TTS sentence), and image_prompt (visual scene/style direction",
      "WITHOUT repeating the overlay text — backgrounds, mood, composition, colors).",
      "Image prompts must match the requested aspect ratio framing.",
      slideNarrativeGuidance(slideCount),
      ...buildReferencePrompt(references),
      "",
      `Topic / pain point: ${topic}`,
      `Target format: ${aspectRatioContext(aspectRatio)}`,
      "",
      "Return valid JSON with keys: title, target_audience, slides.",
    ].join("\n"),
  });

  const response = await ai.models.generateContent({
    model,
    contents: userParts,
    config: {
      responseMimeType: "application/json",
    },
  });

  const rawText = response.text;

  if (!rawText) {
    throw new Error("Gemini returned an empty response");
  }

  const parsedJson = JSON.parse(rawText) as unknown;
  return parseCampaignGeneration(parsedJson, slideCount);
}
