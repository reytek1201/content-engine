import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildNarrationCacheKey,
  buildNarrationCachePath,
} from "./narration-cache-keys.ts";

describe("buildNarrationCacheKey", () => {
  it("is stable for the same voice, model, and text", () => {
    const left = buildNarrationCacheKey("voice-a", "Hello world.");
    const right = buildNarrationCacheKey("voice-a", "Hello world.");

    assert.equal(left, right);
  });

  it("changes when voice or text changes", () => {
    const base = buildNarrationCacheKey("voice-a", "Hello world.");
    const otherVoice = buildNarrationCacheKey("voice-b", "Hello world.");
    const otherText = buildNarrationCacheKey("voice-a", "Different script.");

    assert.notEqual(otherVoice, base);
    assert.notEqual(otherText, base);
  });
});

describe("buildNarrationCachePath", () => {
  it("scopes cache files per user, campaign, and slide", () => {
    assert.equal(
      buildNarrationCachePath("user-1", "campaign-1", "slide-1", "abc123"),
      "user-1/campaign-1/slide-1/abc123.mp3",
    );
  });
});
