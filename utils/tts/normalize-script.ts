/**
 * Prepares slide voiceover_script text for ElevenLabs synthesis.
 * Used by every TTS entry point before calling the provider.
 */

const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+/gi;

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\([^)]+\)/g;

const MARKDOWN_STRIP_PATTERN = /[*_`#>~]/g;

const EMOJI_PATTERN =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu;

const ABBREVIATION_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\be\.g\./gi, "for example"],
  [/\bi\.e\./gi, "that is"],
  [/\betc\./gi, "and so on"],
  [/\bvs\./gi, "versus"],
  [/\bw\/\b/gi, "with"],
  [/\bw\/o\b/gi, "without"],
  [/\bASAP\b/g, "as soon as possible"],
  [/\bB2B\b/g, "B to B"],
  [/\bB2C\b/g, "B to C"],
];

function expandPercentages(text: string): string {
  return text.replace(/(\d+(?:\.\d+)?)\s*%/g, "$1 percent");
}

function expandCurrency(text: string): string {
  return text.replace(/\$(\d+(?:\.\d+)?)/g, "$1 dollars");
}

function replaceUrls(text: string): string {
  if (!URL_PATTERN.test(text)) {
    return text;
  }

  URL_PATTERN.lastIndex = 0;
  return text.replace(URL_PATTERN, "link in bio");
}

function stripMarkdown(text: string): string {
  let result = text.replace(MARKDOWN_LINK_PATTERN, "$1");
  result = result.replace(MARKDOWN_STRIP_PATTERN, "");
  return result;
}

function applyAbbreviationReplacements(text: string): string {
  let result = text;
  for (const [pattern, replacement] of ABBREVIATION_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function normalizeVoiceoverScript(raw: string): string {
  if (!raw.trim()) {
    return "";
  }

  let text = raw.normalize("NFKC");
  text = stripMarkdown(text);
  text = text.replace(EMOJI_PATTERN, "");
  text = replaceUrls(text);
  text = text.replace(/\s*\/\s*/g, " ");
  text = expandPercentages(text);
  text = expandCurrency(text);
  text = applyAbbreviationReplacements(text);
  text = text.replace(/&/g, " and ");
  text = collapseWhitespace(text);

  return text;
}
