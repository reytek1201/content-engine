import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CAPTION_VIDEO_CROSSFADE_SECONDS, captionOffsetForVideoCompose } from "./caption-video-sync.ts";

const CROSSFADE_SECONDS = CAPTION_VIDEO_CROSSFADE_SECONDS;

describe("captionOffsetForVideoCompose", () => {
  it("leaves the first slide on the audio timeline", () => {
    assert.equal(captionOffsetForVideoCompose(0, 0, CROSSFADE_SECONDS), 0);
    assert.equal(captionOffsetForVideoCompose(4.2, 0, CROSSFADE_SECONDS), 4.2);
  });

  it("pulls later slides earlier by crossfade overlap", () => {
    assert.equal(
      captionOffsetForVideoCompose(4.2, 1, CROSSFADE_SECONDS),
      3.75,
    );
    assert.equal(
      captionOffsetForVideoCompose(9.3, 2, CROSSFADE_SECONDS),
      8.4,
    );
  });

  it("does not shift when crossfade is disabled", () => {
    assert.equal(captionOffsetForVideoCompose(9.3, 2, 0), 9.3);
  });
});
