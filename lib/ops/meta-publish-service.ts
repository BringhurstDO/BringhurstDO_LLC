import "server-only";

import {
  containsPublishableArtifact,
  sanitizePublishableBody,
} from "@/lib/ops/publishable-copy";
import {
  getReadyInstagramPublishConnection,
  getReadyMetaConnection,
} from "@/lib/ops/meta-connection";
import {
  publishFacebookPagePost,
  publishInstagramImagePost,
  publishInstagramVideoPost,
} from "@/lib/ops/meta-client";
import { findMetaAccount, resolveMetaConfig } from "@/lib/ops/meta-config";
import { classifyPublishMediaKind } from "@/lib/ops/ops-media-kind";
import { resolvePublishImageUrl } from "@/lib/ops/ops-publish-media";
import { saveSocialPublishLog } from "@/lib/ops/social-connections-db";
import type {
  OpsContentPackageRecord,
  OpsProjectId,
  SocialPublishLogRecord,
  SocialPublishResult,
} from "@/lib/ops/types";

const PUBLISH_BOUNDARY =
  "BringhurstDO Ops Meta publish. Metadata-only audit row; no tokens stored.";

function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export type MetaDraftPublishInput = {
  accountId: string;
  assetLocation?: string;
  body: string;
  contentPackageId: string;
  imageUrl?: string;
  platform: "Facebook" | "Instagram";
  platformDraftId: string;
  publicationTargetId: string;
  publishingProjectId?: OpsProjectId;
  sourceProjectId?: OpsProjectId;
  title?: string;
  trigger: "autopublish" | "manual";
};

export type MetaDraftPublishError = {
  code:
    | "body_invalid"
    | "config"
    | "connection"
    | "media_missing"
    | "not_implemented"
    | "publish_failed";
  message: string;
};

export function applyMetaPublishToRecord(
  record: OpsContentPackageRecord,
  draftId: string,
  result: SocialPublishResult,
): OpsContentPackageRecord {
  const draft = record.platformDrafts.find((item) => item.id === draftId);

  if (!draft) {
    return record;
  }

  const publishNote = `Published to ${result.platform} via Ops. Post id: ${result.platformPostId}`;
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

export async function publishMetaDraft(
  input: MetaDraftPublishInput,
): Promise<
  | { ok: true; result: SocialPublishResult }
  | { ok: false; error: MetaDraftPublishError }
> {
  const config = resolveMetaConfig();

  if (!config.ok) {
    return {
      ok: false,
      error: { code: "config", message: config.reason },
    };
  }

  const account = findMetaAccount(config.config, input.accountId);

  if (!account) {
    return {
      ok: false,
      error: {
        code: "config",
        message: `Unknown Meta account: ${input.accountId}`,
      },
    };
  }

  if (input.platform === "Instagram") {
    if (account.kind !== "instagram_business" || !account.instagramBusinessAccountId) {
      return {
        ok: false,
        error: {
          code: "config",
          message: "This Meta account is not configured as an Instagram Business target.",
        },
      };
    }

    const sanitizedBody = sanitizePublishableBody(input.body);

    if (!sanitizedBody.trim()) {
      return {
        ok: false,
        error: {
          code: "body_invalid",
          message: "Publish body is empty after sanitizing.",
        },
      };
    }

    if (containsPublishableArtifact(sanitizedBody)) {
      return {
        ok: false,
        error: {
          code: "body_invalid",
          message:
            "Publish body still contains internal workflow/operator language after sanitizing.",
        },
      };
    }

    const caption =
      sanitizedBody.length > 2200
        ? `${sanitizedBody.slice(0, 2197).trim()}…`
        : sanitizedBody;

    const image = resolvePublishImageUrl({
      accountId: account.accountId,
      assetLocation: input.assetLocation,
      body: input.body,
      imageUrl: input.imageUrl,
      platform: "Instagram",
      publishingProjectId: input.publishingProjectId,
      sourceProjectId: input.sourceProjectId,
      title: input.title,
    });

    if (!image.ok) {
      return {
        ok: false,
        error: {
          code: "media_missing",
          message: image.reason,
        },
      };
    }

    const mediaKind = classifyPublishMediaKind({ url: image.imageUrl });

    if (mediaKind === "gif") {
      return {
        ok: false,
        error: {
          code: "media_missing",
          message:
            "Instagram does not accept GIF uploads via Ops. Attach an MP4 (published as a Reel) or a still JPEG/PNG/WebP image.",
        },
      };
    }

    const ready = await getReadyInstagramPublishConnection(config.config, account);

    if (!ready.ok) {
      return {
        ok: false,
        error: {
          code: "connection",
          message: ready.error.message,
        },
      };
    }

    try {
      const published =
        mediaKind === "video"
          ? await publishInstagramVideoPost({
              caption,
              igUserId: account.instagramBusinessAccountId,
              pageAccessToken: ready.value.accessToken,
              videoUrl: image.imageUrl,
            })
          : await publishInstagramImagePost({
              caption,
              igUserId: account.instagramBusinessAccountId,
              imageUrl: image.imageUrl,
              pageAccessToken: ready.value.accessToken,
            });
      const postedAt = new Date().toISOString();
      const publishLogId = `meta-publish-${nowId()}`;
      const bodyPreview =
        caption.length > 280 ? `${caption.slice(0, 280).trim()}…` : caption;
      const mediaLabel = mediaKind === "video" ? "Video" : "Image";

      const logRecord: SocialPublishLogRecord = {
        accountId: account.accountId,
        authorUrn: ready.value.authorUrn,
        bodyPreview,
        contentPackageId: input.contentPackageId,
        createdAt: postedAt,
        id: publishLogId,
        notes: [
          input.trigger === "autopublish"
            ? `Scheduled autopublish to Instagram as ${account.label}. ${mediaLabel}: ${image.imageUrl}`
            : `Operator-approved manual publish to Instagram as ${account.label}. ${mediaLabel}: ${image.imageUrl}`,
        ],
        platform: "Meta",
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
          platform: "Meta",
          platformDraftId: input.platformDraftId,
          platformPostId: published.platformPostId,
          postUrl: published.postUrl,
          postedAt,
          publicationTargetId: input.publicationTargetId,
          publishLogId,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "publish_failed",
          message:
            error instanceof Error ? error.message : "Instagram publish failed.",
        },
      };
    }
  }

  if (account.kind !== "facebook_page" || !account.pageId) {
    return {
      ok: false,
      error: {
        code: "config",
        message: "This Meta account is not configured as a Facebook Page target.",
      },
    };
  }

  const sanitizedBody = sanitizePublishableBody(input.body);

  if (!sanitizedBody.trim()) {
    return {
      ok: false,
      error: {
        code: "body_invalid",
        message: "Publish body is empty after sanitizing.",
      },
    };
  }

  if (containsPublishableArtifact(sanitizedBody)) {
    return {
      ok: false,
      error: {
        code: "body_invalid",
        message:
          "Publish body still contains internal workflow/operator language after sanitizing.",
      },
    };
  }

  const ready = await getReadyMetaConnection(account);

  if (!ready.ok) {
    return {
      ok: false,
      error: {
        code: "connection",
        message: ready.error.message,
      },
    };
  }

  const image = resolvePublishImageUrl({
    accountId: account.accountId,
    assetLocation: input.assetLocation,
    body: input.body,
    imageUrl: input.imageUrl,
    platform: "Facebook",
    publishingProjectId: input.publishingProjectId,
    sourceProjectId: input.sourceProjectId,
    title: input.title,
  });

  try {
    const mediaKind = image.ok
      ? classifyPublishMediaKind({ url: image.imageUrl })
      : "image";
    const published = await publishFacebookPagePost({
      imageUrl: image.ok ? image.imageUrl : undefined,
      mediaKind: image.ok ? mediaKind : undefined,
      message: sanitizedBody,
      pageAccessToken: ready.value.accessToken,
      pageId: account.pageId,
    });
    const postedAt = new Date().toISOString();
    const publishLogId = `meta-publish-${nowId()}`;
    const bodyPreview =
      sanitizedBody.length > 280
        ? `${sanitizedBody.slice(0, 280).trim()}…`
        : sanitizedBody;
    const mediaLabel =
      mediaKind === "video" ? "Video" : mediaKind === "gif" ? "GIF" : "Image";

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
            ? `Scheduled autopublish to Facebook as ${account.label}. ${mediaLabel}: ${image.imageUrl}`
            : `Scheduled autopublish to Facebook as ${account.label}.`
          : image.ok
            ? `Operator-approved manual publish to Facebook as ${account.label}. ${mediaLabel}: ${image.imageUrl}`
            : `Operator-approved manual publish to Facebook as ${account.label}.`,
      ],
      platform: "Meta",
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
        platform: "Meta",
        platformDraftId: input.platformDraftId,
        platformPostId: published.platformPostId,
        postUrl: published.postUrl,
        postedAt,
        publicationTargetId: input.publicationTargetId,
        publishLogId,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "publish_failed",
        message:
          error instanceof Error ? error.message : "Meta publish failed.",
      },
    };
  }
}
