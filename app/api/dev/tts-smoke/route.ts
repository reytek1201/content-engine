import {
  getTtsProvider,
  getVoiceIdForPersona,
  isTtsError,
} from "@/utils/tts";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z
  .object({
    text: z.string().min(1).max(500).optional(),
    voiceId: z.string().min(1).optional(),
    persona: z.enum(["warm", "energetic", "professional"]).optional(),
    modelId: z.enum(["eleven_flash_v2_5", "eleven_multilingual_v2"]).optional(),
  })
  .refine((value) => Boolean(value.voiceId || value.persona), {
    message: "Provide voiceId or persona",
    path: ["voiceId"],
  });

function isTtsSmokeRouteEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_TTS_SMOKE === "true"
  );
}

export async function POST(request: Request) {
  if (!isTtsSmokeRouteEnabled()) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const parsedInput = RequestSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parsedInput.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { modelId, persona } = parsedInput.data;
    const voiceId =
      parsedInput.data.voiceId ??
      (persona ? getVoiceIdForPersona(persona) : "");
    const text =
      parsedInput.data.text ??
      "SlidePress TTS smoke test. If you can hear this, synthesis is working.";

    const result = await getTtsProvider().synthesize({
      text,
      voiceId,
      modelId,
    });

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-TTS-Char-Count": String(result.charCount),
        "X-TTS-Model-Id": result.modelId,
        "X-TTS-Latency-Ms": String(result.latencyMs),
      },
    });
  } catch (error) {
    if (isTtsError(error)) {
      const status =
        error.code === "RATE_LIMITED"
          ? 429
          : error.code === "INVALID_INPUT" || error.code === "INVALID_VOICE"
            ? 400
            : error.code === "NOT_CONFIGURED"
              ? 503
              : 502;

      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
