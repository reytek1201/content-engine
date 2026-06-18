import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getVideoExportStepState,
  mapPipelineStageToUiStage,
} from "./video-export-stages.ts";

describe("mapPipelineStageToUiStage", () => {
  it("maps Fal pipeline stages to UI stages", () => {
    assert.equal(mapPipelineStageToUiStage("images_to_video"), "compose_slides");
    assert.equal(mapPipelineStageToUiStage("merge_audio"), "merge_audio");
    assert.equal(mapPipelineStageToUiStage(undefined), "preparing");
  });
});

describe("getVideoExportStepState", () => {
  it("marks earlier steps done and later steps pending", () => {
    assert.equal(
      getVideoExportStepState("preparing", "merge_audio"),
      "done",
    );
    assert.equal(
      getVideoExportStepState("merge_audio", "merge_audio"),
      "active",
    );
    assert.equal(
      getVideoExportStepState("downloading", "merge_audio"),
      "pending",
    );
  });
});
