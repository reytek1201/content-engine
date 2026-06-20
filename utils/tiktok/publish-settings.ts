import type { TikTokCreatorInfo } from "@/utils/tiktok/publish-video";

export const TIKTOK_MUSIC_USAGE_URL =
  "https://www.tiktok.com/legal/page/global/music-usage-confirmation/en";

export const TIKTOK_BRANDED_CONTENT_POLICY_URL =
  "https://www.tiktok.com/legal/page/global/bc-policy/en";

export const TIKTOK_TITLE_MAX = 2200;

export type TikTokPrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";

export interface TikTokPublishFormSettings {
  privacyLevel: string;
  title: string;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  commercialDisclosure: boolean;
  yourBrand: boolean;
  brandedContent: boolean;
}

export interface TikTokCreatorInfoPublic {
  creatorUsername: string;
  creatorNickname: string;
  privacyLevelOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number;
}

export function toPublicCreatorInfo(
  creator: TikTokCreatorInfo,
): TikTokCreatorInfoPublic {
  return {
    creatorUsername: creator.creatorUsername,
    creatorNickname: creator.creatorNickname,
    privacyLevelOptions: creator.privacyLevelOptions,
    commentDisabled: creator.commentDisabled,
    duetDisabled: creator.duetDisabled,
    stitchDisabled: creator.stitchDisabled,
    maxVideoPostDurationSec: creator.maxVideoPostDurationSec,
  };
}

export function privacyLevelLabel(level: string): string {
  switch (level) {
    case "PUBLIC_TO_EVERYONE":
      return "Public";
    case "MUTUAL_FOLLOW_FRIENDS":
      return "Friends";
    case "FOLLOWER_OF_CREATOR":
      return "Followers";
    case "SELF_ONLY":
      return "Only me";
    default:
      return level.replaceAll("_", " ").toLowerCase();
  }
}

export function isSelfOnlyPrivacy(level: string): boolean {
  return level === "SELF_ONLY";
}

export function getCommercialContentLabel(settings: TikTokPublishFormSettings): string | null {
  if (!settings.commercialDisclosure) {
    return null;
  }

  if (settings.yourBrand && settings.brandedContent) {
    return "Your photo/video will be labeled as 'Paid partnership'";
  }

  if (settings.brandedContent) {
    return "Your photo/video will be labeled as 'Paid partnership'";
  }

  if (settings.yourBrand) {
    return "Your photo/video will be labeled as 'Promotional content'";
  }

  return null;
}

export function getPublishDeclarationText(
  settings: TikTokPublishFormSettings,
): string {
  if (settings.commercialDisclosure && settings.brandedContent) {
    return "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation.";
  }

  return "By posting, you agree to TikTok's Music Usage Confirmation.";
}

export function validateTikTokPublishSettings(
  creator: TikTokCreatorInfoPublic,
  settings: TikTokPublishFormSettings,
  videoDurationSec: number | null,
): string | null {
  const title = settings.title.trim();

  if (!title) {
    return "Enter a title for your TikTok post.";
  }

  if (title.length > TIKTOK_TITLE_MAX) {
    return `Title must be ${TIKTOK_TITLE_MAX} characters or fewer.`;
  }

  if (!settings.privacyLevel) {
    return "Select who can view this post.";
  }

  if (!creator.privacyLevelOptions.includes(settings.privacyLevel)) {
    return "Selected visibility is not allowed for this TikTok account.";
  }

  if (
    settings.commercialDisclosure &&
    settings.brandedContent &&
    isSelfOnlyPrivacy(settings.privacyLevel)
  ) {
    return "Branded content visibility cannot be set to private.";
  }

  if (settings.commercialDisclosure && !settings.yourBrand && !settings.brandedContent) {
    return "Indicate if your content promotes yourself, a third party, or both.";
  }

  if (
    videoDurationSec !== null &&
    videoDurationSec > creator.maxVideoPostDurationSec
  ) {
    return `Video is ${Math.ceil(videoDurationSec)}s but this account allows up to ${creator.maxVideoPostDurationSec}s.`;
  }

  if (!creator.privacyLevelOptions.length) {
    return "This TikTok account cannot post right now. Try again later.";
  }

  return null;
}

export function canSubmitTikTokPublishForm(
  settings: TikTokPublishFormSettings,
  creator: TikTokCreatorInfoPublic | null,
  videoDurationSec: number | null,
  blockedReason: string | null,
): boolean {
  if (blockedReason || !creator) {
    return false;
  }

  return validateTikTokPublishSettings(creator, settings, videoDurationSec) === null;
}

export function toTikTokApiPostSettings(
  creator: TikTokCreatorInfoPublic,
  settings: TikTokPublishFormSettings,
): {
  privacyLevel: string;
  title: string;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  brandOrganicToggle: boolean;
  brandContentToggle: boolean;
} {
  return {
    privacyLevel: settings.privacyLevel,
    title: settings.title.trim(),
    disableComment: creator.commentDisabled || !settings.allowComment,
    disableDuet: creator.duetDisabled || !settings.allowDuet,
    disableStitch: creator.stitchDisabled || !settings.allowStitch,
    brandOrganicToggle: settings.commercialDisclosure && settings.yourBrand,
    brandContentToggle: settings.commercialDisclosure && settings.brandedContent,
  };
}
