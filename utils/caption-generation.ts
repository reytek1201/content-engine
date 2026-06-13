import { z } from "zod";
import type { Campaign, Slide } from "@/types/campaign";
import type { PlatformType } from "@/types/captions";
import { PLATFORM_ORDER } from "@/types/captions";
import { aspectRatioContext } from "@/utils/campaign-generation";
import { slideNarrativeGuidance } from "@/types/slides";

export const PlatformCaptionOutputSchema = z.object({
  platform: z.enum(["tiktok", "instagram", "youtube_shorts"]),
  hook: z.string().min(1).optional(),
  caption: z.string().min(80),
  hashtags: z.array(z.string().min(1)).min(1).max(20),
  title: z.string().min(1).optional(),
});

export const CaptionsGenerationSchema = z.object({
  platforms: z
    .array(PlatformCaptionOutputSchema)
    .length(3)
    .refine(
      (platforms) =>
        PLATFORM_ORDER.every((platform) =>
          platforms.some((entry) => entry.platform === platform)
        ),
      "Must include tiktok, instagram, and youtube_shorts"
    ),
});

export type CaptionsGeneration = z.infer<typeof CaptionsGenerationSchema>;

const PLATFORM_ALIASES: Record<string, PlatformType> = {
  tiktok: "tiktok",
  instagram: "instagram",
  youtube_shorts: "youtube_shorts",
  youtube: "youtube_shorts",
  shorts: "youtube_shorts",
  yt_shorts: "youtube_shorts",
};

function normalizePlatformKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function resolvePlatform(value: unknown, index: number): PlatformType | null {
  if (typeof value === "string") {
    return PLATFORM_ALIASES[normalizePlatformKey(value)] ?? null;
  }

  if (index >= 0 && index < PLATFORM_ORDER.length) {
    return PLATFORM_ORDER[index];
  }

  return null;
}

function coerceHashtags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).replace(/^#/, "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\s,]+/)
      .map((tag) => tag.replace(/^#/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function extractPlatformsArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (!raw || typeof raw !== "object") {
    return [];
  }

  const obj = raw as Record<string, unknown>;

  if (Array.isArray(obj.platforms)) {
    return obj.platforms;
  }

  const keyedPlatforms: unknown[] = [];

  for (const platform of PLATFORM_ORDER) {
    const entry = obj[platform];

    if (entry && typeof entry === "object") {
      keyedPlatforms.push({
        ...(entry as Record<string, unknown>),
        platform,
      });
    }
  }

  return keyedPlatforms;
}

function normalizePlatformEntry(raw: unknown, index: number) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const entry = raw as Record<string, unknown>;
  const platform = resolvePlatform(entry.platform, index);

  if (!platform) {
    return null;
  }

  const captionSource =
    entry.caption ?? entry.description ?? entry.text ?? entry.body;
  const caption =
    typeof captionSource === "string" ? captionSource.trim() : "";

  if (!caption) {
    return null;
  }

  const hook =
    typeof entry.hook === "string" && entry.hook.trim()
      ? entry.hook.trim()
      : undefined;
  const title =
    typeof entry.title === "string" && entry.title.trim()
      ? entry.title.trim()
      : undefined;
  const hashtags = coerceHashtags(entry.hashtags ?? entry.tags);

  return {
    platform,
    hook,
    caption,
    hashtags,
    title,
  };
}

export function parseCaptionsGeneration(raw: unknown): CaptionsGeneration {
  const platformsRaw = extractPlatformsArray(raw);

  if (platformsRaw.length === 0) {
    throw new Error("Gemini returned no platform captions");
  }

  const byPlatform = new Map<
    PlatformType,
    z.infer<typeof PlatformCaptionOutputSchema>
  >();

  platformsRaw.forEach((entry, index) => {
    const normalized = normalizePlatformEntry(entry, index);

    if (!normalized) {
      return;
    }

    const parsed = PlatformCaptionOutputSchema.safeParse(normalized);

    if (parsed.success) {
      byPlatform.set(parsed.data.platform, parsed.data);
    }
  });

  const platforms = PLATFORM_ORDER.map((platform) => byPlatform.get(platform));

  if (platforms.some((platform) => !platform)) {
    throw new Error(
      "Gemini returned incomplete captions. Expected TikTok, Instagram, and YouTube Shorts."
    );
  }

  return CaptionsGenerationSchema.parse({
    platforms: platforms as z.infer<typeof PlatformCaptionOutputSchema>[],
  });
}

export function formatCaptionsValidationError(error: z.ZodError): string {
  const issues = error.issues.slice(0, 3).map((issue) => {
    const path = issue.path.join(".") || "response";
    return `${path}: ${issue.message}`;
  });

  return `Caption generation returned invalid data (${issues.join("; ")})`;
}

export function buildCaptionsPrompt(campaign: Campaign, slides: Slide[]): string {
  const sortedSlides = [...slides].sort(
    (left, right) => left.slide_index - right.slide_index
  );

  const slideSummary = sortedSlides
    .map(
      (slide) =>
        `Slide ${slide.slide_index + 1}: overlay="${slide.text_overlay ?? ""}" voiceover="${slide.voiceover_script ?? ""}" visual="${slide.image_prompt ?? ""}"`
    )
    .join("\n");

  const slideCount = sortedSlides.length;

  return [
    "You are an expert social media strategist and direct-response copywriter.",
    "Write deep, publish-ready captions and hashtag sets for TikTok, Instagram, and YouTube Shorts.",
    `Synthesize the full ${slideCount}-slide narrative into cohesive post copy — do not copy slide overlay text verbatim.`,
    "Each caption should feel written by a human creator who understands the audience's pain, desire, and objections.",
    "Use evergreen niche hashtags without the # prefix in the JSON array. Do not invent fake trending tags.",
    "",
    "Depth requirements:",
    `- Reference the campaign story arc across slides (${slideNarrativeGuidance(slideCount)})`,
    "- Include specific emotional hooks, relatable scenarios, and a clear next step",
    "- Write captions that stand alone — someone who never saw the slides should still understand the value",
    "- Avoid generic filler like 'link in bio' without context; make CTAs specific to the topic",
    "",
    "Platform rules:",
    "- tiktok: scroll-stopping hook (1-2 lines), then 3-5 short punchy sentences in casual voice, 4-6 hashtags, under 2200 chars total",
    "- instagram: strong first-line hook, 5-8 sentences with line breaks, carousel-friendly storytelling, soft CTA, 8-15 hashtags",
    "- youtube_shorts: SEO title (max 60 chars), optional hook line, 3-5 sentences as description with keywords, 5-10 hashtags",
    "",
    `Campaign title: ${campaign.title ?? "Untitled"}`,
    `Topic: ${campaign.topic}`,
    `Target audience: ${campaign.target_audience ?? "General"}`,
    `Format: ${aspectRatioContext(campaign.aspect_ratio)}`,
    "",
    "Slide narrative:",
    slideSummary,
    "",
    "Return JSON exactly in this shape:",
    '{ "platforms": [',
    '  { "platform": "tiktok", "hook": "...", "caption": "...", "hashtags": ["tag1", "tag2", "tag3"] },',
    '  { "platform": "instagram", "hook": "...", "caption": "...", "hashtags": ["tag1", "tag2", "tag3"] },',
    '  { "platform": "youtube_shorts", "title": "...", "hook": "...", "caption": "...", "hashtags": ["tag1", "tag2", "tag3"] }',
    "] }",
  ].join("\n");
}

export function normalizeCaptionOutput(
  output: CaptionsGeneration["platforms"][number]
) {
  return {
    platform: output.platform,
    hook: output.hook ?? null,
    caption: output.caption.trim(),
    hashtags: output.hashtags.map((tag) => tag.replace(/^#/, "").trim()),
    title: output.title?.trim() ?? null,
  };
}
