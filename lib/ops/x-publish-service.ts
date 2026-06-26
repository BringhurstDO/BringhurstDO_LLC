import "server-only";

import { xSinglePostLimit } from "@/lib/ops/draft-template";
import {
  containsPublishableArtifact,
  sanitizePublishableBody,
} from "@/lib/ops/publishable-copy";
import { saveSocialPublishLog } from "@/lib/ops/social-connections-db";
import { getReadyXConnection } from "@/lib/ops/x-connection";
import { publishXPost, uploadXMedia } from "@/lib/ops/x-client";
import { findXAccount, resolveXConfig } from "@/lib/ops/x-config";
import {
  fetchPublicImageBytes,
  resolvePublishImageUrl,
} from "@/lib/ops/ops-publish-media";
import type {
  OpsContentPackageRecord,
  OpsProjectId,
  PlatformDraft,
  SocialPublishLogRecord,
  SocialPublishResult,
} from "@/lib/ops/types";

const PUBLISH_BOUNDARY =
  "BringhurstDO Ops X publish. Metadata-only audit row; no tokens stored.";

function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export type XDraftPublishInput = {
  accountId: string;
  assetLocation?: string;
  body: string;
  contentPackageId: string;
  imageUrl?: string;
  platformDraftId: string;
  publicationTargetId: string;
  publishingProjectId?: OpsProjectId;
  title?: string;
  trigger: "autopublish" | "manual";
};

export type XDraftPublishError = {
  code:
    | "body_invalid"
    | "config"
    | "connection"
    | "media_missing"
    | "not_found"
    | "publish_failed";
  message: string;
};

export function applyXPublishToRecord(
  record: OpsContentPackageRecord,
  draftId: string,
  result: SocialPublishResult,
): OpsContentPackageRecord {
  const draft = record.platformDrafts.find((item) => item.id === draftId);

  if (!draft) {
    return record;
  }

  const publishNote = `Published to X via Ops. Post id: ${result.platformPostId}`;
  const existingPost = record.publishedPosts.find(
    (post) => post.platformDraftId === draftId,
  );

  const nextPost = existingPost
    ? {
        ...existingPost,
        manualNotes: Array.from(new Set([...existingPost.manualNotes, publishNote])),
        platformPostId: result.platformPostId,
        postUrl: result.postUrl,
        postedAt: result.postedAt,
        postedManuallyAt: result.postedAt,
        postedUrl: result.postUrl,
        status: "posted" as const,
      }
    : {
        accountName: draft.accountName,
        id: `published-${draft.id}`,
        manualNotes: [publishNote],
        platform: draft.platform,
        platformDraftId: draft.id,
        platformPostId: result.platformPostId,
        postUrl: result.postUrl,
        postedAt: result.postedAt,
        postedManuallyAt: result.postedAt,
        postedUrl: result.postUrl,
        projectId: draft.publishingProjectId,
        publicationTargetId: draft.publicationTargetId,
        status: "posted" as const,
      };

  return {
    ...record,
    contentPackage: {
      ...record.contentPackage,
      updatedAt: new Date().toISOString(),
    },
    platformDrafts: record.platformDrafts.map((item) =>
      item.id === draftId ? { ...item, status: "posted" as const } : item,
    ),
    publishedPosts: existingPost
      ? record.publishedPosts.map((post) =>
          post.id === nextPost.id ? nextPost : post,
        )
      : [...record.publishedPosts, nextPost],
  };
}

export async function publishXDraft(
  input: XDraftPublishInput,
): Promise<
  | { ok: true; result: SocialPublishResult }
  | { ok: false; error: XDraftPublishError }
> {
  const config = resolveXConfig();

  if (!config.ok) {
    return {
      ok: false,
      error: { code: "config", message: config.reason },
    };
  }

  const account = findXAccount(config.config, input.accountId);

  if (!account) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message: `Unknown X account: ${input.accountId}`,
      },
    };
  }

  const body = sanitizePublishableBody(input.body);

  if (!body.trim()) {
    return {
      ok: false,
      error: {
        code: "body_invalid",
        message: "Draft body is empty after sanitizing.",
      },
    };
  }

  if (containsPublishableArtifact(body)) {
    return {
      ok: false,
      error: {
        code: "body_invalid",
        message:
          "Body still contains internal workflow/operator language after sanitizing.",
      },
    };
  }

  if (body.length > xSinglePostLimit) {
    return {
      ok: false,
      error: {
        code: "body_invalid",
        message: `X posts must be ${xSinglePostLimit} characters or fewer after sanitizing (currently ${body.length}).`,
      },
    };
  }

  const ready = await getReadyXConnection(config.config, account);

  if (!ready.ok) {
    return {
      ok: false,
      error: {
        code: "connection",
        message: ready.error.message,
      },
    };
  }

  const publishLogId = `social-publish-${nowId()}`;
  const bodyPreview = body.slice(0, 280);
  const image = resolvePublishImageUrl({
    accountId: account.accountId,
    assetLocation: input.assetLocation,
    imageUrl: input.imageUrl,
    platform: "X",
    publishingProjectId: input.publishingProjectId,
  });

  try {
    let mediaIds: string[] | undefined;

    if (image.ok) {
      const fetched = await fetchPublicImageBytes(image.imageUrl);
      const mediaId = await uploadXMedia({
        accessToken: ready.value.accessToken,
        bytes: fetched.bytes,
        contentType: fetched.contentType,
      });
      mediaIds = [mediaId];
    }

    const published = await publishXPost({
      accessToken: ready.value.accessToken,
      mediaIds,
      text: body,
    });

    const postedAt = new Date().toISOString();
    const logRecord: SocialPublishLogRecord = {
      accountId: account.accountId,
      authorUrn: ready.value.authorUrn,
      bodyPreview,
      contentPackageId: input.contentPackageId,
      createdAt: postedAt,
      id: publishLogId,
      notes: [
        input.trigger === "autopublish"
          ? image.ok
            ? `Scheduled autopublish to X as ${account.label}. Image attached.`
            : `Operator-approved scheduled publish to X as ${account.label}.`
          : image.ok
            ? `Operator-approved manual publish to X as ${account.label}. Image attached.`
            : `Operator-approved manual publish to X as ${account.label}.`,
      ],
      platform: "X",
      platformDraftId: input.platformDraftId,
      platformPostId: published.platformPostId,
      postUrl: published.postUrl,
      publicationTargetId: input.publicationTargetId,
      sourceBoundary: PUBLISH_BOUNDARY,
      status: "success",
    };

    await saveSocialPublishLog(logRecord).catch(() => undefined);

    return {
      ok: true,
      result: {
        accountId: account.accountId,
        platform: "X",
        platformDraftId: input.platformDraftId,
        platformPostId: published.platformPostId,
        postUrl: published.postUrl,
        postedAt,
        publicationTargetId: input.publicationTargetId,
        publishLogId,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "X publish failed.";

    const logRecord: SocialPublishLogRecord = {
      accountId: account.accountId,
      authorUrn: ready.value.authorUrn,
      bodyPreview,
      contentPackageId: input.contentPackageId,
      createdAt: new Date().toISOString(),
      id: publishLogId,
      notes: [message],
      platform: "X",
      platformDraftId: input.platformDraftId,
      platformPostId: null,
      postUrl: null,
      publicationTargetId: input.publicationTargetId,
      sourceBoundary: PUBLISH_BOUNDARY,
      status: "error",
    };

    await saveSocialPublishLog(logRecord).catch(() => undefined);

    return {
      ok: false,
      error: { code: "publish_failed", message },
    };
  }
}

export function draftIsPosted(
  record: OpsContentPackageRecord,
  draft: PlatformDraft,
) {
  const post = record.publishedPosts.find(
    (item) => item.platformDraftId === draft.id,
  );

  return post?.status === "posted";
}
