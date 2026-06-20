import { describe, expect, it } from "vitest";
import {
  getCommercialContentLabel,
  getPublishDeclarationText,
  validateTikTokPublishSettings,
  type TikTokPublishFormSettings,
} from "@/utils/tiktok/publish-settings";
import type { TikTokCreatorInfo } from "@/utils/tiktok/publish-video";

const creator: TikTokCreatorInfo = {
  creatorUsername: "creator",
  creatorNickname: "Creator",
  privacyLevelOptions: ["SELF_ONLY", "PUBLIC_TO_EVERYONE"],
  commentDisabled: false,
  duetDisabled: true,
  stitchDisabled: false,
  maxVideoPostDurationSec: 60,
};

const baseForm: TikTokPublishFormSettings = {
  privacyLevel: "SELF_ONLY",
  title: "Launch day",
  allowComment: false,
  allowDuet: false,
  allowStitch: false,
  commercialDisclosure: false,
  yourBrand: false,
  brandedContent: false,
};

describe("validateTikTokPublishSettings", () => {
  it("requires privacy selection", () => {
    expect(
      validateTikTokPublishSettings(creator, { ...baseForm, privacyLevel: "" }, 30),
    ).toBe("Select who can view this post.");
  });

  it("blocks branded content with private visibility", () => {
    expect(
      validateTikTokPublishSettings(
        creator,
        {
          ...baseForm,
          commercialDisclosure: true,
          brandedContent: true,
          privacyLevel: "SELF_ONLY",
        },
        30,
      ),
    ).toBe("Branded content visibility cannot be set to private.");
  });

  it("requires commercial disclosure choices when enabled", () => {
    expect(
      validateTikTokPublishSettings(
        creator,
        { ...baseForm, commercialDisclosure: true },
        30,
      ),
    ).toBe("Indicate if your content promotes yourself, a third party, or both.");
  });
});

describe("publish declarations", () => {
  it("uses music confirmation by default", () => {
    expect(getPublishDeclarationText(baseForm)).toContain("Music Usage Confirmation");
  });

  it("includes branded content policy when branded content is selected", () => {
    expect(
      getPublishDeclarationText({
        ...baseForm,
        commercialDisclosure: true,
        brandedContent: true,
      }),
    ).toContain("Branded Content Policy");
  });

  it("labels promotional content", () => {
    expect(
      getCommercialContentLabel({
        ...baseForm,
        commercialDisclosure: true,
        yourBrand: true,
      }),
    ).toContain("Promotional content");
  });
});
