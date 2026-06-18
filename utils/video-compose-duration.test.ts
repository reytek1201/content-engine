import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slideClipDurationForCompose } from "./video-compose-duration.ts";

const CROSSFADE_SECONDS = 0.45;

describe("slideClipDurationForCompose", () => {
  it("extends only the last slide by crossfade overlap", () => {
    const slides = [4, 5, 6];

    assert.equal(slideClipDurationForCompose(slides[0]!, 0, 3, CROSSFADE_SECONDS), 4);
    assert.equal(slideClipDurationForCompose(slides[1]!, 1, 3, CROSSFADE_SECONDS), 5);
    assert.equal(
      slideClipDurationForCompose(slides[2]!, 2, 3, CROSSFADE_SECONDS),
      6 + 2 * CROSSFADE_SECONDS,
    );
  });

  it("matches narration length after xfade overlap", () => {
    const narration = [4.2, 5.1, 3.8];
    const composeDurations = narration.map((duration, index) =>
      slideClipDurationForCompose(
        duration,
        index,
        narration.length,
        CROSSFADE_SECONDS,
      ),
    );

    const xfadeVideoLength =
      composeDurations.reduce((sum, duration) => sum + duration, 0) -
      (narration.length - 1) * CROSSFADE_SECONDS;
    const narrationLength = narration.reduce((sum, duration) => sum + duration, 0);

    assert.ok(Math.abs(xfadeVideoLength - narrationLength) < 0.001);
  });
});
