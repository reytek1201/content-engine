import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GeminiServiceError,
  isRetryableGeminiError,
  mapGeminiError,
} from "./map-gemini-error.ts";

describe("mapGeminiError", () => {
  it("maps Gemini 503 JSON payloads to a friendly message", () => {
    const error = new Error(
      JSON.stringify({
        error: {
          code: 503,
          message:
            "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
          status: "UNAVAILABLE",
        },
      }),
    );

    assert.equal(
      mapGeminiError(error),
      "Our AI writer is busy right now. Wait a moment and try again.",
    );
    assert.equal(isRetryableGeminiError(error), true);
  });

  it("keeps short human-readable errors", () => {
    const error = new Error("Gemini returned an empty response");

    assert.equal(
      mapGeminiError(error),
      "AI returned an empty response. Please try again.",
    );
    assert.equal(isRetryableGeminiError(error), false);
  });

  it("marks GeminiServiceError as retryable for 503 payloads", () => {
    const error = new GeminiServiceError(
      new Error(
        JSON.stringify({
          error: { code: 503, status: "UNAVAILABLE" },
        }),
      ),
    );

    assert.equal(
      error.message,
      "Our AI writer is busy right now. Wait a moment and try again.",
    );
    assert.equal(error.retryable, true);
  });
});
