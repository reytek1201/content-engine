import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFreeTierPeriodEndIso } from "./free-tier-period.ts";

describe("getFreeTierPeriodEndIso", () => {
  it("returns UTC midnight on the 1st of the next month", () => {
    const end = getFreeTierPeriodEndIso(new Date("2026-06-26T15:30:00.000Z"));
    assert.equal(end, "2026-07-01T00:00:00.000Z");
  });

  it("rolls year when current month is December", () => {
    const end = getFreeTierPeriodEndIso(new Date("2026-12-15T00:00:00.000Z"));
    assert.equal(end, "2027-01-01T00:00:00.000Z");
  });
});
