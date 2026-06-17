import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeVoiceoverScript } from "./normalize-script.ts";

describe("normalizeVoiceoverScript", () => {
  it("strips markdown and emoji", () => {
    assert.equal(
      normalizeVoiceoverScript("**Save 50%** today 🚀"),
      "Save 50 percent today",
    );
  });

  it("replaces URLs with link in bio", () => {
    assert.equal(
      normalizeVoiceoverScript("Grab the guide at https://example.com/guide"),
      "Grab the guide at link in bio",
    );
  });

  it("expands abbreviations", () => {
    assert.equal(
      normalizeVoiceoverScript("Use SEO, e.g. keywords vs. ads"),
      "Use SEO, for example keywords versus ads",
    );
  });

  it("removes markdown links but keeps label text", () => {
    assert.equal(
      normalizeVoiceoverScript("Read [our playbook](https://example.com) now."),
      "Read our playbook now.",
    );
  });

  it("expands currency", () => {
    assert.equal(
      normalizeVoiceoverScript("Plans start at $19 per month."),
      "Plans start at 19 dollars per month.",
    );
  });

  it("collapses whitespace", () => {
    assert.equal(
      normalizeVoiceoverScript("  Too   many    spaces.  "),
      "Too many spaces.",
    );
  });

  it("returns empty string for blank input", () => {
    assert.equal(normalizeVoiceoverScript("   "), "");
  });
});
