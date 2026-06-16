import { assertAiRateLimit, isRateLimitError } from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";

const VISION_MODEL = "gemini-2.5-flash";

const RequestSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z
    .string()
    .regex(/^image\/(jpeg|png|webp)$/)
    .default("image/jpeg"),
});

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenAI({ apiKey });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    assertAiRateLimit(user.id, "suggest-topic");

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { imageBase64, mimeType } = parsed.data;
    const ai = getClient();

    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        {
          inlineData: { mimeType, data: imageBase64 },
        },
        {
          text: [
            "You are a performance marketing expert who writes social carousel campaign topics.",
            "Analyse the product or item in the image.",
            "Return exactly 3 distinct campaign topic suggestions — compelling pain-point or curiosity hooks for Instagram / TikTok carousels.",
            "Each topic should be 5–12 words, punchy, specific to this product.",
            "Format: JSON object with a single key `topics` containing an array of 3 strings.",
            'Example: { "topics": ["Why your skincare isn\'t actually hydrating your skin", "3 signs your protein powder is wasting your money", "The ingredient most supplements forget to include"] }',
            "Only return valid JSON. No markdown. No commentary.",
          ].join(" "),
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text;

    if (!rawText) {
      return NextResponse.json(
        { success: false, error: "No response from AI" },
        { status: 502 },
      );
    }

    const parsed2 = JSON.parse(rawText) as unknown;

    if (
      typeof parsed2 !== "object" ||
      parsed2 === null ||
      !Array.isArray((parsed2 as Record<string, unknown>).topics)
    ) {
      return NextResponse.json(
        { success: false, error: "Unexpected AI response format" },
        { status: 502 },
      );
    }

    const topics = (
      (parsed2 as { topics: unknown[] }).topics as unknown[]
    )
      .slice(0, 3)
      .filter((t) => typeof t === "string") as string[];

    return NextResponse.json({ success: true, topics });
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 429 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
