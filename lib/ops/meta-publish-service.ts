import "server-only";

import {
  containsPublishableArtifact,
  sanitizePublishableBody,
} from "@/lib/ops/publishable-copy";
import { getReadyMetaConnection } from "@/lib/ops/meta-connection";
import { publishFacebookPagePost } from "@/lib/ops/meta-client";
import { findMetaAccount, resolveMetaConfig } from "@/lib/ops/meta-config";
import { saveSocialPublishLog } from "@/lib/ops/social-connections-db";
import type {
  OpsContentPackageRecord,
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
  body: string;
  contentPackageId: string;
  platform: "Facebook" | "Instagram";
  platformDraftId: string;
  publicationTargetId: string;
  title?: string;
  trigger: "manual";
};

export type MetaDraftPublishError = {
  code:
    | "body_invalid"
    | "config"
    | "connection"
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
    return {
      ok: false,
      error: {
        code: "not_implemented",
        message:
          "Instagram publish is not implemented yet. Connect the account now for readiness, but publish text-only posts to Facebook Pages first.",
      },
    };
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

  try {
    const published = await publishFacebookPagePost({
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

    const logRecord: SocialPublishLogRecord = {
      accountId: account.accountId,
      authorUrn: ready.value.authorUrn,
      bodyPreview,
      contentPackageId: input.contentPackageId,
      createdAt: postedAt,
      id: publishLogId,
      notes: [
        `Operator-approved manual publish to Facebook as ${account.label}.`,
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
