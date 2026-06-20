export class TikTokPublishScopeError extends Error {
  constructor(message = "TikTok posting permission is required") {
    super(message);
    this.name = "TikTokPublishScopeError";
  }
}

export class TikTokUnauditedPrivacyError extends Error {
  readonly privacyLevel: string;
  readonly privacyOptions: readonly string[];

  constructor(privacyLevel: string, privacyOptions: readonly string[]) {
    super("TikTok unaudited apps require a private account and SELF_ONLY posts");
    this.name = "TikTokUnauditedPrivacyError";
    this.privacyLevel = privacyLevel;
    this.privacyOptions = privacyOptions;
  }
}

interface TikTokApiError {
  code?: string;
  message?: string;
}

interface TikTokApiResponse<T> {
  data?: T;
  error?: TikTokApiError;
}

function assertTikTokApiOk<T>(
  response: Response,
  body: TikTokApiResponse<T> | null,
): asserts body is TikTokApiResponse<T> & { data: T } {
  if (!response.ok || body?.error?.code !== "ok" || !body.data) {
    const code = body?.error?.code;
    const message = body?.error?.message ?? "TikTok API request failed";

    if (code === "scope_not_authorized") {
      throw new TikTokPublishScopeError();
    }

    if (code === "spam_risk_too_many_posts") {
      throw new Error("TikTok daily post limit reached. Try again tomorrow.");
    }

    if (code === "unaudited_client_can_only_post_to_private_accounts") {
      throw new TikTokUnauditedPrivacyError("unknown", []);
    }

    if (code && code !== "ok") {
      throw new Error(
        message === "TikTok API request failed"
          ? `TikTok API error: ${code}`
          : `${message} (${code})`,
      );
    }

    throw new Error(message);
  }
}

export interface TikTokCreatorInfo {
  creatorUsername: string;
  creatorNickname: string;
  privacyLevelOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number;
}

export interface TikTokPublishResult {
  publishId: string;
  postId: string | null;
  profileUrl: string;
  videoUrl: string | null;
}

const STATUS_POLL_INTERVAL_MS = 5_000;
const STATUS_POLL_MAX_ATTEMPTS = 120;
const CHUNK_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_SINGLE_CHUNK_BYTES = 64 * 1024 * 1024;

async function downloadVideo(videoUrl: string): Promise<Buffer> {
  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error("Failed to download campaign video for TikTok upload");
  }

  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength === 0) {
    throw new Error("Campaign video file is empty");
  }

  return Buffer.from(arrayBuffer);
}

function getFileUploadPlan(videoSize: number): {
  chunkSize: number;
  totalChunkCount: number;
} {
  if (videoSize <= MAX_SINGLE_CHUNK_BYTES) {
    return {
      chunkSize: videoSize,
      totalChunkCount: 1,
    };
  }

  return {
    chunkSize: CHUNK_SIZE_BYTES,
    totalChunkCount: Math.ceil(videoSize / CHUNK_SIZE_BYTES),
  };
}

export async function queryTikTokCreatorInfo(
  accessToken: string,
): Promise<TikTokCreatorInfo> {
  const response = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    },
  );

  const body = (await response.json().catch(() => null)) as TikTokApiResponse<{
    creator_username?: string;
    creator_nickname?: string;
    privacy_level_options?: string[];
    comment_disabled?: boolean;
    duet_disabled?: boolean;
    stitch_disabled?: boolean;
    max_video_post_duration_sec?: number;
  }> | null;

  assertTikTokApiOk(response, body);

  const data = body.data;

  if (!data.creator_username || !data.privacy_level_options?.length) {
    throw new Error("TikTok did not return creator posting options");
  }

  return {
    creatorUsername: data.creator_username,
    creatorNickname: data.creator_nickname ?? data.creator_username,
    privacyLevelOptions: data.privacy_level_options,
    commentDisabled: Boolean(data.comment_disabled),
    duetDisabled: Boolean(data.duet_disabled),
    stitchDisabled: Boolean(data.stitch_disabled),
    maxVideoPostDurationSec: data.max_video_post_duration_sec ?? 60,
  };
}

function formatUnauditedPrivacyError(
  privacyLevel: string,
  privacyOptions: readonly string[],
): string {
  if (privacyLevel === "SELF_ONLY") {
    return (
      "TikTok sandbox blocked this post because your TikTok account is public. " +
      "In the TikTok app, go to Profile → Menu → Settings and privacy → Privacy → turn on Private account, then try again. " +
      "Posts stay visible only to you until SlidePress passes TikTok app review."
    );
  }

  return (
    "TikTok sandbox apps can only post with private visibility. " +
    "Set your TikTok account to Private in the TikTok app, then try again."
  );
}

async function initTikTokFileUploadPost(input: {
  accessToken: string;
  videoSize: number;
  title: string;
  creator: TikTokCreatorInfo;
  privacyLevel: string;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  brandContentToggle: boolean;
  brandOrganicToggle: boolean;
}): Promise<{ publishId: string; uploadUrl: string }> {
  const { chunkSize, totalChunkCount } = getFileUploadPlan(input.videoSize);

  const response = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: input.title,
          privacy_level: input.privacyLevel,
          disable_comment: input.disableComment,
          disable_duet: input.disableDuet,
          disable_stitch: input.disableStitch,
          brand_content_toggle: input.brandContentToggle,
          brand_organic_toggle: input.brandOrganicToggle,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: input.videoSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunkCount,
        },
      }),
    },
  );

  const body = (await response.json().catch(() => null)) as TikTokApiResponse<{
    publish_id?: string;
    upload_url?: string;
  }> | null;

  if (!response.ok || body?.error?.code !== "ok" || !body.data) {
    const code = body?.error?.code;
    const message = body?.error?.message ?? "TikTok API request failed";

    console.error("TikTok video/init failed", {
      httpStatus: response.status,
      code,
      message,
      privacyLevel: input.privacyLevel,
      privacyOptions: input.creator.privacyLevelOptions,
      videoSize: input.videoSize,
    });

    if (code === "scope_not_authorized") {
      throw new TikTokPublishScopeError();
    }

    if (code === "spam_risk_too_many_posts") {
      throw new Error("TikTok daily post limit reached. Try again tomorrow.");
    }

    if (code === "unaudited_client_can_only_post_to_private_accounts") {
      throw new TikTokUnauditedPrivacyError(
        input.privacyLevel,
        input.creator.privacyLevelOptions,
      );
    }

    if (code === "privacy_level_option_mismatch") {
      throw new Error(
        `TikTok rejected privacy level "${input.privacyLevel}". Allowed: ${input.creator.privacyLevelOptions.join(", ")}`,
      );
    }

    if (code && code !== "ok") {
      throw new Error(
        message === "TikTok API request failed"
          ? `TikTok API error: ${code}`
          : `${message} (${code})`,
      );
    }

    throw new Error(message);
  }

  if (!body.data.publish_id || !body.data.upload_url) {
    throw new Error("TikTok did not return publish upload details");
  }

  return {
    publishId: body.data.publish_id,
    uploadUrl: body.data.upload_url,
  };
}

async function uploadVideoToTikTok(
  uploadUrl: string,
  video: Buffer,
): Promise<void> {
  const videoSize = video.byteLength;
  const { chunkSize, totalChunkCount } = getFileUploadPlan(videoSize);

  for (let chunkIndex = 0; chunkIndex < totalChunkCount; chunkIndex += 1) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, videoSize) - 1;
    const chunk = video.subarray(start, end + 1);

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
      },
      body: new Uint8Array(chunk),
    });

    const isLastChunk = chunkIndex === totalChunkCount - 1;
    const expectedStatus = isLastChunk ? 201 : 206;

    if (response.status !== expectedStatus) {
      const text = await response.text().catch(() => "");
      throw new Error(
        text || `TikTok video upload failed on chunk ${chunkIndex + 1}`,
      );
    }
  }
}

async function fetchTikTokPublishStatus(
  accessToken: string,
  publishId: string,
): Promise<{
  status: string;
  failReason: string | null;
  postIds: string[];
}> {
  const response = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    },
  );

  const body = (await response.json().catch(() => null)) as TikTokApiResponse<{
    status?: string;
    fail_reason?: string;
    publicaly_available_post_id?: string[];
  }> | null;

  assertTikTokApiOk(response, body);

  return {
    status: body.data.status ?? "FAILED",
    failReason: body.data.fail_reason ?? null,
    postIds: body.data.publicaly_available_post_id ?? [],
  };
}

async function waitForTikTokPublishComplete(
  accessToken: string,
  publishId: string,
): Promise<{ postIds: string[] }> {
  for (let attempt = 0; attempt < STATUS_POLL_MAX_ATTEMPTS; attempt += 1) {
    const status = await fetchTikTokPublishStatus(accessToken, publishId);

    if (status.status === "FAILED") {
      throw new Error(
        status.failReason
          ? `TikTok publish failed: ${status.failReason}`
          : "TikTok publish failed",
      );
    }

    if (status.status === "PUBLISH_COMPLETE") {
      return { postIds: status.postIds };
    }

    await new Promise((resolve) => {
      setTimeout(resolve, STATUS_POLL_INTERVAL_MS);
    });
  }

  throw new Error(
    "Timed out waiting for TikTok to finish publishing. Check your TikTok profile in a few minutes.",
  );
}

export interface TikTokVideoPostSettings {
  privacyLevel: string;
  title: string;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  brandContentToggle: boolean;
  brandOrganicToggle: boolean;
}

export async function publishTikTokVideo(input: {
  accessToken: string;
  videoUrl: string;
  postSettings: TikTokVideoPostSettings;
}): Promise<TikTokPublishResult> {
  const videoBuffer = await downloadVideo(input.videoUrl);
  const creator = await queryTikTokCreatorInfo(input.accessToken);

  if (!creator.privacyLevelOptions.includes(input.postSettings.privacyLevel)) {
    throw new Error(
      `TikTok rejected privacy level "${input.postSettings.privacyLevel}". Allowed: ${creator.privacyLevelOptions.join(", ")}`,
    );
  }

  let publishId: string;
  let uploadUrl: string;

  try {
    ({ publishId, uploadUrl } = await initTikTokFileUploadPost({
      accessToken: input.accessToken,
      videoSize: videoBuffer.byteLength,
      title: input.postSettings.title,
      creator,
      privacyLevel: input.postSettings.privacyLevel,
      disableComment: input.postSettings.disableComment,
      disableDuet: input.postSettings.disableDuet,
      disableStitch: input.postSettings.disableStitch,
      brandContentToggle: input.postSettings.brandContentToggle,
      brandOrganicToggle: input.postSettings.brandOrganicToggle,
    }));
  } catch (error) {
    if (error instanceof TikTokUnauditedPrivacyError) {
      throw new Error(
        formatUnauditedPrivacyError(error.privacyLevel, error.privacyOptions),
      );
    }

    throw error;
  }

  await uploadVideoToTikTok(uploadUrl, videoBuffer);

  const { postIds } = await waitForTikTokPublishComplete(
    input.accessToken,
    publishId,
  );

  const postId = postIds[0] ?? null;
  const profileUrl = `https://www.tiktok.com/@${creator.creatorUsername.replace(/^@/, "")}`;

  return {
    publishId,
    postId,
    profileUrl,
    videoUrl: postId ? `https://www.tiktok.com/video/${postId}` : profileUrl,
  };
}
