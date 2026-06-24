import type {
  IngestWebsiteOptions,
  WebsiteIngestResult,
  WebsiteIngestTopicSuggestion,
  WebsiteTopicAngle,
  WebsiteTopicFormat,
} from "@/types/website-ingest";
import { fetchPublicWebsiteHtml } from "@/utils/fetch-public-url";
import {
  GeminiServiceError,
  isRetryableGeminiError,
} from "@/utils/map-gemini-error";
import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_RETRY_DELAY_MS = 600;
const MAX_PROMPT_CHARS = 24_000;
const MIN_PAGE_TEXT_CHARS = 120;

const FALLBACK_PATHS = [
  "/about",
  "/about-us",
  "/our-story",
  "/company",
  "/what-we-do",
] as const;

const FALLBACK_PATH_HINTS = [
  "about",
  "story",
  "company",
  "product",
  "service",
  "what-we-do",
] as const;

const INGEST_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    businessName: { type: "string" },
    description: { type: "string" },
    audience: { type: "string" },
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          angle: {
            type: "string",
            enum: ["pain_point", "curiosity", "contrarian"],
          },
          rationale: { type: "string" },
          recommendedFormat: {
            type: "string",
            enum: ["4:5", "9:16"],
          },
        },
        required: ["topic", "angle", "rationale", "recommendedFormat"],
      },
    },
  },
  required: ["businessName", "description", "audience", "topics"],
} as const;

interface FetchedPage {
  html: string;
  finalUrl: string;
  pageText: string;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getIngestModel(): string {
  return process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

function htmlToReadableText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const text = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, MAX_PROMPT_CHARS);
}

function resolveAbsoluteUrl(
  value: string | null,
  baseUrl: string,
): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractSiteIconUrl(html: string, baseUrl: string): string | null {
  const linkTags = html.match(/<link\s+[^>]*>/gi) ?? [];
  const candidates: { href: string; priority: number }[] = [];

  for (const tag of linkTags) {
    const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];

    if (!href) {
      continue;
    }

    if (rel.includes("apple-touch-icon")) {
      candidates.push({ href, priority: 1 });
      continue;
    }

    if (rel.includes("icon")) {
      candidates.push({
        href,
        priority: rel.includes("shortcut") ? 3 : 2,
      });
    }
  }

  candidates.sort((left, right) => left.priority - right.priority);

  if (candidates[0]) {
    return resolveAbsoluteUrl(candidates[0].href, baseUrl);
  }

  return resolveAbsoluteUrl("/favicon.ico", baseUrl);
}

function extractInternalContentLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const links: { url: string; score: number }[] = [];
  const anchorPattern = /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1]?.trim();

    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }

    try {
      const resolved = new URL(href, baseUrl);

      if (resolved.origin !== base.origin) {
        continue;
      }

      const path = resolved.pathname.toLowerCase();

      if (path === "/" || path === base.pathname.toLowerCase()) {
        continue;
      }

      resolved.hash = "";
      const normalized = resolved.toString();

      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);

      let score = 0;

      for (const hint of FALLBACK_PATH_HINTS) {
        if (path.includes(hint)) {
          score += 10;
        }
      }

      links.push({ url: normalized, score });
    } catch {
      continue;
    }
  }

  return links
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((link) => link.url);
}

async function fetchReadablePage(rawUrl: string): Promise<FetchedPage> {
  const { html, finalUrl } = await fetchPublicWebsiteHtml(rawUrl);

  return {
    html,
    finalUrl,
    pageText: htmlToReadableText(html),
  };
}

async function fetchWebsiteContentWithFallback(
  rawUrl: string,
): Promise<FetchedPage> {
  let page = await fetchReadablePage(rawUrl);

  if (page.pageText.length >= MIN_PAGE_TEXT_CHARS) {
    return page;
  }

  const origin = new URL(page.finalUrl).origin;
  const fallbackUrls = [
    ...FALLBACK_PATHS.map((path) => new URL(path, origin).toString()),
    ...extractInternalContentLinks(page.html, page.finalUrl),
  ];

  const seen = new Set<string>([page.finalUrl]);

  for (const fallbackUrl of fallbackUrls) {
    if (seen.has(fallbackUrl)) {
      continue;
    }

    seen.add(fallbackUrl);

    try {
      const candidate = await fetchReadablePage(fallbackUrl);

      if (candidate.pageText.length > page.pageText.length) {
        page = candidate;
      }

      if (page.pageText.length >= MIN_PAGE_TEXT_CHARS) {
        break;
      }
    } catch {
      continue;
    }
  }

  if (page.pageText.length < MIN_PAGE_TEXT_CHARS) {
    throw new Error(
      "This page did not include enough readable text. Try your homepage or enter a topic manually.",
    );
  }

  return page;
}

function normalizeAngle(value: unknown): WebsiteTopicAngle {
  if (value === "curiosity" || value === "contrarian") {
    return value;
  }

  return "pain_point";
}

function normalizeFormat(value: unknown): WebsiteTopicFormat {
  return value === "9:16" ? "9:16" : "4:5";
}

function normalizeTopicSuggestions(
  topics: unknown,
): WebsiteIngestTopicSuggestion[] {
  if (!Array.isArray(topics)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: WebsiteIngestTopicSuggestion[] = [];

  for (const entry of topics) {
    if (typeof entry === "string") {
      const trimmed = entry.trim().replace(/\s+/g, " ");

      if (trimmed.length < 8 || trimmed.length > 140) {
        continue;
      }

      const key = trimmed.toLowerCase();

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      normalized.push({
        topic: trimmed,
        angle: "pain_point",
        rationale: "Grounded in your website messaging.",
        recommendedFormat: "4:5",
      });
    } else if (typeof entry === "object" && entry !== null) {
      const record = entry as Record<string, unknown>;
      const topic =
        typeof record.topic === "string"
          ? record.topic.trim().replace(/\s+/g, " ")
          : "";

      if (topic.length < 8 || topic.length > 140) {
        continue;
      }

      const key = topic.toLowerCase();

      if (seen.has(key)) {
        continue;
      }

      const rationale =
        typeof record.rationale === "string" && record.rationale.trim()
          ? record.rationale.trim().slice(0, 180)
          : "Grounded in your website messaging.";

      seen.add(key);
      normalized.push({
        topic,
        angle: normalizeAngle(record.angle),
        rationale,
        recommendedFormat: normalizeFormat(record.recommendedFormat),
      });
    } else {
      continue;
    }

    if (normalized.length >= 3) {
      break;
    }
  }

  return normalized;
}

async function generateIngestTopicsFromPage(input: {
  finalUrl: string;
  title: string | null;
  ogTitle: string | null;
  metaDescription: string | null;
  pageText: string;
  excludeTopics: string[];
}): Promise<{
  businessName?: unknown;
  description?: unknown;
  audience?: unknown;
  topics?: unknown;
}> {
  const ai = getGeminiClient();
  const model = getIngestModel();
  const promptText = [
    "You are a performance marketing strategist for Instagram and TikTok carousel campaigns.",
    "Analyse the website content and return JSON only.",
    "Write exactly 3 distinct campaign topic suggestions.",
    "Each topic must be a pain-point, curiosity, or contrarian hook (5–12 words).",
    "Each topic needs angle (pain_point, curiosity, or contrarian), a one-sentence rationale explaining why it fits this business, and recommendedFormat (4:5 for feed carousels or 9:16 for Reels/TikTok).",
    "Topics must be specific to this business, not generic social media advice.",
    input.excludeTopics.length > 0
      ? `Do not repeat or closely paraphrase these previously suggested topics: ${input.excludeTopics.join("; ")}. Use fresh angles.`
      : "",
    `Website URL: ${input.finalUrl}`,
    input.title ? `Page title: ${input.title}` : "",
    input.ogTitle ? `Open Graph title: ${input.ogTitle}` : "",
    input.metaDescription ? `Meta description: ${input.metaDescription}` : "",
    "",
    "Website text excerpt:",
    input.pageText,
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown;

  for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ text: promptText }],
        config: {
          responseMimeType: "application/json",
          responseSchema: INGEST_RESPONSE_SCHEMA,
        },
      });

      const rawText = response.text;

      if (!rawText) {
        throw new Error("No response from AI");
      }

      return JSON.parse(rawText) as {
        businessName?: unknown;
        description?: unknown;
        audience?: unknown;
        topics?: unknown;
      };
    } catch (error) {
      lastError = error;

      if (
        attempt < GEMINI_MAX_ATTEMPTS - 1 &&
        isRetryableGeminiError(error)
      ) {
        await sleep(GEMINI_RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      throw new GeminiServiceError(error);
    }
  }

  throw new GeminiServiceError(lastError);
}

export async function ingestWebsiteForCampaign(
  rawUrl: string,
  options: IngestWebsiteOptions = {},
): Promise<WebsiteIngestResult> {
  const { html, finalUrl, pageText } = await fetchWebsiteContentWithFallback(
    rawUrl,
  );

  const title = extractTitle(html);
  const metaDescription =
    extractMetaContent(html, "description") ??
    extractMetaContent(html, "og:description");
  const ogTitle = extractMetaContent(html, "og:title");
  const productImageUrl = resolveAbsoluteUrl(
    extractMetaContent(html, "og:image"),
    finalUrl,
  );
  const logoImageUrl = extractSiteIconUrl(html, finalUrl);

  const excludeTopics = (options.excludeTopics ?? [])
    .map((topic) => topic.trim())
    .filter(Boolean);

  const parsed = await generateIngestTopicsFromPage({
    finalUrl,
    title,
    ogTitle,
    metaDescription,
    pageText,
    excludeTopics,
  });

  const topics = normalizeTopicSuggestions(parsed.topics);

  if (topics.length === 0) {
    throw new Error("Could not generate campaign topic suggestions");
  }

  const businessName =
    typeof parsed.businessName === "string" && parsed.businessName.trim()
      ? parsed.businessName.trim()
      : ogTitle ?? title ?? "Your business";

  const description =
    typeof parsed.description === "string" && parsed.description.trim()
      ? parsed.description.trim()
      : metaDescription ?? pageText.slice(0, 220);

  const audience =
    typeof parsed.audience === "string" && parsed.audience.trim()
      ? parsed.audience.trim()
      : "People interested in this business";

  return {
    businessName,
    description,
    audience,
    topics,
    productImageUrl,
    logoImageUrl,
    sourceUrl: finalUrl,
  };
}
