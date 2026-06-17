import { TtsError } from "@/utils/tts/types";

export const VOICE_PERSONAS = ["warm", "energetic", "professional"] as const;

export type VoicePersona = (typeof VOICE_PERSONAS)[number];

export interface VoiceCatalogEntry {
  persona: VoicePersona;
  voiceId: string;
  label: string;
  description: string;
}

const PERSONA_DETAILS: Record<
  VoicePersona,
  Pick<VoiceCatalogEntry, "label" | "description">
> = {
  warm: {
    label: "Warm & friendly",
    description: "Approachable, conversational tone for lifestyle and coaching content.",
  },
  energetic: {
    label: "Energetic",
    description: "Upbeat delivery for hooks, promos, and high-energy Reels.",
  },
  professional: {
    label: "Professional",
    description: "Clear, confident narration for B2B, finance, and education.",
  },
};

const DEV_PLACEHOLDER_VOICE_IDS: Record<VoicePersona, string> = {
  warm: "dev-placeholder-warm",
  energetic: "dev-placeholder-energetic",
  professional: "dev-placeholder-professional",
};

let cachedCatalog: VoiceCatalogEntry[] | null = null;

function isVoicePersona(value: string): value is VoicePersona {
  return (VOICE_PERSONAS as readonly string[]).includes(value);
}

function parseVoiceIdsJson(raw: string): Record<VoicePersona, string> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TtsError(
      "NOT_CONFIGURED",
      "ELEVENLABS_VOICE_IDS must be valid JSON",
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TtsError(
      "NOT_CONFIGURED",
      "ELEVENLABS_VOICE_IDS must be a JSON object",
    );
  }

  const record = parsed as Record<string, unknown>;
  const result = {} as Record<VoicePersona, string>;

  for (const persona of VOICE_PERSONAS) {
    const voiceId = record[persona];
    if (typeof voiceId !== "string" || !voiceId.trim()) {
      throw new TtsError(
        "NOT_CONFIGURED",
        `ELEVENLABS_VOICE_IDS is missing a voice ID for "${persona}"`,
      );
    }
    result[persona] = voiceId.trim();
  }

  return result;
}

function buildCatalog(voiceIds: Record<VoicePersona, string>): VoiceCatalogEntry[] {
  return VOICE_PERSONAS.map((persona) => ({
    persona,
    voiceId: voiceIds[persona],
    ...PERSONA_DETAILS[persona],
  }));
}

export function isVoiceCatalogConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_VOICE_IDS?.trim());
}

export function getVoiceCatalog(): VoiceCatalogEntry[] {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  const raw = process.env.ELEVENLABS_VOICE_IDS?.trim();

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new TtsError(
        "NOT_CONFIGURED",
        "ELEVENLABS_VOICE_IDS is not configured",
      );
    }

    cachedCatalog = buildCatalog(DEV_PLACEHOLDER_VOICE_IDS);
    return cachedCatalog;
  }

  cachedCatalog = buildCatalog(parseVoiceIdsJson(raw));
  return cachedCatalog;
}

export function getVoiceIdForPersona(persona: VoicePersona): string {
  const entry = getVoiceCatalog().find((item) => item.persona === persona);
  if (!entry) {
    throw new TtsError("INVALID_VOICE", `Unknown voice persona: ${persona}`);
  }
  return entry.voiceId;
}

export function resolveVoicePersona(value: string): VoicePersona | null {
  return isVoicePersona(value) ? value : null;
}

export function resetVoiceCatalogCache(): void {
  cachedCatalog = null;
}
