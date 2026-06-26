import "server-only";

import { getReadyLinkedInConnection } from "@/lib/ops/linkedin-connection";
import { publishLinkedInPost, uploadLinkedInImage } from "@/lib/ops/linkedin-client";
import {
  findLinkedInAccount,
  resolveLinkedInConfig,
} from "@/lib/ops/linkedin-config";
import {
  containsLinkedInPublishUrl,
  LINKEDIN_TEXT_ONLY_BODY_URL_ERROR,
  LINKEDIN_TEXT_ONLY_LINK_CARD_ERROR,
} from "@/lib/ops/linkedin-publish-rules";
import {
  containsPublishableArtifact,
  sanitizePublishableBody,
} from "@/lib/ops/publishable-copy";
import {
  fetchPublicImageBytes,
  resolvePublishImageUrl,
} from "@/lib/ops/ops-publish-media";
import { saveSocialPublishLog } from "@/lib/ops/social-connections-db";
import type {
  OpsContentPackageRecord,
  OpsProjectId,
  PlatformDraft,
  SocialPublishLogRecord,
  SocialPublishResult,
} from "@/lib/ops/types";

const PUBLISH_BOUNDARY =
  "BringhurstDO Ops LinkedIn publish. Metadata-only audit row; no tokens stored.";

function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export type LinkedInDraftPublishInput = {
  accountId: string;
  assetLocation?: string;
  body: string;
  contentPackageId: string;
  imageUrl?: string;
  linkUrl?: string;
  platformDraftId: string;
  publicationTargetId: string;
  publishingProjectId?: OpsProjectId;
  title?: string;
  trigger: "autopublish" | "manual";
};

export type LinkedInDraftPublishError = {
  code:
    | "body_invalid"
    | "config"
    | "connection"
    | "media_missing"
    | "not_found"
    | "publish_failed";
  message: string;
};

export function applyLinkedInPublishToRecord(
  record: OpsContentPackageRecord,
  draftId: string,
  result: SocialPublishResult,
  trigger: "autopublish" | "manual",
): OpsContentPackageRecord {
  const draft = record.platformDrafts.find((item) => item.id === draftId);

  if (!draft) {
    return record;
  }

  const publishNote =
    trigger === "autopublish"
      ? `Autopublished to LinkedIn on schedule. Post id: ${result.platformPostId}`
      : `Published to LinkedIn via Ops. Post id: ${result.platformPostId}`;

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

export async function publishLinkedInDraft(
  input: LinkedInDraftPublishInput,
): Promise<
  | { ok: true; result: SocialPublishResult }
  | { ok: false; error: LinkedInDraftPublishError }
> {
  const config = resolveLinkedInConfig();

  if (!config.ok) {
    return {
      ok: false,
      error: { code: "config", message: config.reason },
    };
  }

  const account = findLinkedInAccount(config.config, input.accountId);

  if (!account) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message: `Unknown LinkedIn account: ${input.accountId}`,
      },
    };
  }

  const body = sanitizePublishableBody(input.body);

  if (input.linkUrl?.trim()) {
    return {
      ok: false,
      error: {
        code: "body_invalid",
        message: LINKEDIN_TEXT_ONLY_LINK_CARD_ERROR,
      },
    };
  }

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

  if (containsLinkedInPublishUrl(body)) {
    return {
      ok: false,
      error: {
        code: "body_invalid",
        message: LINKEDIN_TEXT_ONLY_BODY_URL_ERROR,
      },
    };
  }

  const ready = await getReadyLinkedInConnection(config.config, account);

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
    platform: "LinkedIn",
    publishingProjectId: input.publishingProjectId,
  });

  try {
    let imageUrn: string | undefined;

    if (image.ok) {
      const fetched = await fetchPublicImageBytes(image.imageUrl);
      imageUrn = await uploadLinkedInImage({
        accessToken: ready.value.accessToken,
        authorUrn: ready.value.authorUrn,
        bytes: fetched.bytes,
        config: config.config,
        contentType: fetched.contentType,
      });
    }

    const published = await publishLinkedInPost({
      accessToken: ready.value.accessToken,
      authorUrn: ready.value.authorUrn,
      commentary: body,
      config: config.config,
      imageUrn,
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
            ? `Scheduled autopublish to LinkedIn as ${account.label}. Image: ${image.imageUrl}`
            : `Scheduled autopublish to LinkedIn as ${account.label}.`
          : image.ok
            ? `Operator-approved manual publish to LinkedIn as ${account.label}. Image: ${image.imageUrl}`
            : `Operator-approved manual publish to LinkedIn as ${account.label}.`,
      ],
      platform: "LinkedIn",
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
        platform: "LinkedIn",
        platformDraftId: input.platformDraftId,
        platformPostId: published.platformPostId,
        postUrl: published.postUrl,
        postedAt,
        publicationTargetId: input.publicationTargetId,
        publishLogId,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LinkedIn publish failed.";

    const logRecord: SocialPublishLogRecord = {
      accountId: account.accountId,
      authorUrn: ready.value.authorUrn,
      bodyPreview,
      contentPackageId: input.contentPackageId,
      createdAt: new Date().toISOString(),
      id: publishLogId,
      notes: [
        input.trigger === "autopublish"
          ? `Scheduled autopublish failed: ${message}`
          : message,
      ],
      platform: "LinkedIn",
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
