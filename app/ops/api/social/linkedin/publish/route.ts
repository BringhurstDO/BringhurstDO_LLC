import { NextResponse, type NextRequest } from "next/server";

import { getReadyLinkedInConnection } from "@/lib/ops/linkedin-connection";
import { publishLinkedInPost } from "@/lib/ops/linkedin-client";
import {
  findLinkedInAccount,
  resolveLinkedInConfig,
} from "@/lib/ops/linkedin-config";
import {
  containsPublishableArtifact,
  sanitizePublishableBody,
} from "@/lib/ops/publishable-copy";
import { saveSocialPublishLog } from "@/lib/ops/social-connections-db";
import type {
  SocialPublishLogRecord,
  SocialPublishResult,
} from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const PUBLISH_BOUNDARY =
  "BringhurstDO Ops manual-approved LinkedIn publish. Metadata-only audit row; no tokens stored.";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type PublishBody = {
  contentPackageId?: unknown;
  platformDraftId?: unknown;
  publicationTargetId?: unknown;
  accountId?: unknown;
  title?: unknown;
  body?: unknown;
  linkUrl?: unknown;
  confirmApproved?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const config = resolveLinkedInConfig();

  if (!config.ok) {
    return jsonNoStore({ error: config.reason }, 503);
  }

  let payload: PublishBody;
  try {
    payload = (await request.json()) as PublishBody;
  } catch {
    return jsonNoStore({ error: "Invalid JSON body." }, 400);
  }

  const contentPackageId = asString(payload.contentPackageId);
  const platformDraftId = asString(payload.platformDraftId);
  const publicationTargetId = asString(payload.publicationTargetId);
  const requestedAccountId =
    asString(payload.accountId) || config.config.accounts[0]?.accountId || "";
  const title = asString(payload.title);
  const rawBody = asString(payload.body);
  const linkUrl = asString(payload.linkUrl);

  if (payload.confirmApproved !== true) {
    return jsonNoStore(
      {
        error:
          "Manual approval is required. Set confirmApproved=true only after an operator approves this draft.",
      },
      400,
    );
  }

  if (!contentPackageId || !platformDraftId || !rawBody) {
    return jsonNoStore(
      {
        error:
          "contentPackageId, platformDraftId, and a non-empty body are required.",
      },
      400,
    );
  }

  const account = findLinkedInAccount(config.config, requestedAccountId);

  if (!account) {
    return jsonNoStore(
      { error: `Unknown LinkedIn account: ${requestedAccountId}` },
      400,
    );
  }

  const body = sanitizePublishableBody(rawBody);

  if (containsPublishableArtifact(body)) {
    return jsonNoStore(
      {
        error:
          "Body still contains internal workflow/operator language after sanitizing. Clean the draft before publishing.",
      },
      400,
    );
  }

  const ready = await getReadyLinkedInConnection(config.config, account);

  if (!ready.ok) {
    const httpStatus = ready.error.code === "load_failed" ? 502 : 409;
    return jsonNoStore({ error: ready.error.message }, httpStatus);
  }

  const publishLogId = `social-publish-${nowId()}`;
  const bodyPreview = body.slice(0, 280);

  try {
    const published = await publishLinkedInPost({
      accessToken: ready.value.accessToken,
      authorUrn: ready.value.authorUrn,
      commentary: body,
      config: config.config,
      linkUrl: linkUrl || undefined,
      title: title || undefined,
    });

    const postedAt = new Date().toISOString();
    const logRecord: SocialPublishLogRecord = {
      accountId: account.accountId,
      authorUrn: ready.value.authorUrn,
      bodyPreview,
      contentPackageId,
      createdAt: postedAt,
      id: publishLogId,
      notes: [`Operator-approved manual publish to LinkedIn as ${account.label}.`],
      platform: "LinkedIn",
      platformDraftId,
      platformPostId: published.platformPostId,
      postUrl: published.postUrl,
      publicationTargetId,
      sourceBoundary: PUBLISH_BOUNDARY,
      status: "success",
    };

    await saveSocialPublishLog(logRecord).catch(() => undefined);

    const result: SocialPublishResult = {
      accountId: account.accountId,
      platform: "LinkedIn",
      platformDraftId,
      platformPostId: published.platformPostId,
      postUrl: published.postUrl,
      postedAt,
      publicationTargetId,
      publishLogId,
    };

    return jsonNoStore(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LinkedIn publish failed.";

    const logRecord: SocialPublishLogRecord = {
      accountId: account.accountId,
      authorUrn: ready.value.authorUrn,
      bodyPreview,
      contentPackageId,
      createdAt: new Date().toISOString(),
      id: publishLogId,
      notes: [message],
      platform: "LinkedIn",
      platformDraftId,
      platformPostId: null,
      postUrl: null,
      publicationTargetId,
      sourceBoundary: PUBLISH_BOUNDARY,
      status: "error",
    };

    await saveSocialPublishLog(logRecord).catch(() => undefined);

    return jsonNoStore({ error: message, publishLogId }, 502);
  }
}
