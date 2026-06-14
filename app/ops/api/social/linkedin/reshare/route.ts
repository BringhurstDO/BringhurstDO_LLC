import { NextResponse, type NextRequest } from "next/server";

import { getReadyLinkedInConnection } from "@/lib/ops/linkedin-connection";
import { reshareLinkedInPost } from "@/lib/ops/linkedin-client";
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
  SocialReshareResult,
} from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const RESHARE_BOUNDARY =
  "BringhurstDO Ops manual-approved LinkedIn reshare (amplification). Metadata-only audit row; no tokens stored.";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

type ReshareBody = {
  accountId?: unknown;
  contentPackageId?: unknown;
  sourcePlatformDraftId?: unknown;
  sourcePostUrn?: unknown;
  commentary?: unknown;
  confirmApproved?: unknown;
};

export async function POST(request: NextRequest) {
  const config = resolveLinkedInConfig();

  if (!config.ok) {
    return jsonNoStore({ error: config.reason }, 503);
  }

  let payload: ReshareBody;
  try {
    payload = (await request.json()) as ReshareBody;
  } catch {
    return jsonNoStore({ error: "Invalid JSON body." }, 400);
  }

  if (payload.confirmApproved !== true) {
    return jsonNoStore(
      {
        error:
          "Manual approval is required. Set confirmApproved=true only after an operator approves this amplification.",
      },
      400,
    );
  }

  const accountId = asString(payload.accountId);
  const contentPackageId = asString(payload.contentPackageId);
  const sourcePlatformDraftId = asString(payload.sourcePlatformDraftId);
  const sourcePostUrn = asString(payload.sourcePostUrn);
  const commentaryRaw = asString(payload.commentary);

  if (!accountId || !sourcePostUrn || !contentPackageId) {
    return jsonNoStore(
      {
        error:
          "accountId, contentPackageId, and sourcePostUrn are required to reshare.",
      },
      400,
    );
  }

  if (!sourcePostUrn.startsWith("urn:li:")) {
    return jsonNoStore(
      { error: "sourcePostUrn must be a LinkedIn URN (urn:li:...)." },
      400,
    );
  }

  const account = findLinkedInAccount(config.config, accountId);

  if (!account) {
    return jsonNoStore({ error: `Unknown LinkedIn account: ${accountId}` }, 400);
  }

  const commentary = commentaryRaw
    ? sanitizePublishableBody(commentaryRaw)
    : "";

  if (commentary && containsPublishableArtifact(commentary)) {
    return jsonNoStore(
      {
        error:
          "Reshare commentary still contains internal workflow/operator language after sanitizing.",
      },
      400,
    );
  }

  const ready = await getReadyLinkedInConnection(config.config, account);

  if (!ready.ok) {
    const httpStatus = ready.error.code === "load_failed" ? 502 : 409;
    return jsonNoStore({ error: ready.error.message }, httpStatus);
  }

  const publishLogId = `social-reshare-${nowId()}`;

  try {
    const reshared = await reshareLinkedInPost({
      accessToken: ready.value.accessToken,
      authorUrn: ready.value.authorUrn,
      commentary: commentary || undefined,
      config: config.config,
      sourcePostUrn,
    });

    const postedAt = new Date().toISOString();
    const logRecord: SocialPublishLogRecord = {
      accountId: account.accountId,
      authorUrn: ready.value.authorUrn,
      bodyPreview: `Reshare of ${sourcePostUrn}`,
      contentPackageId,
      createdAt: postedAt,
      id: publishLogId,
      notes: [`Operator-approved reshare to LinkedIn as ${account.label}.`],
      platform: "LinkedIn",
      platformDraftId: sourcePlatformDraftId,
      platformPostId: reshared.platformPostId,
      postUrl: reshared.postUrl,
      publicationTargetId: "",
      sourceBoundary: RESHARE_BOUNDARY,
      status: "success",
    };

    await saveSocialPublishLog(logRecord).catch(() => undefined);

    const result: SocialReshareResult = {
      accountId: account.accountId,
      platform: "LinkedIn",
      platformPostId: reshared.platformPostId,
      postUrl: reshared.postUrl,
      postedAt,
      publishLogId,
      sourcePlatformDraftId,
    };

    return jsonNoStore(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LinkedIn reshare failed.";

    const logRecord: SocialPublishLogRecord = {
      accountId: account.accountId,
      authorUrn: ready.value.authorUrn,
      bodyPreview: `Reshare of ${sourcePostUrn}`,
      contentPackageId,
      createdAt: new Date().toISOString(),
      id: publishLogId,
      notes: [message],
      platform: "LinkedIn",
      platformDraftId: sourcePlatformDraftId,
      platformPostId: null,
      postUrl: null,
      publicationTargetId: "",
      sourceBoundary: RESHARE_BOUNDARY,
      status: "error",
    };

    await saveSocialPublishLog(logRecord).catch(() => undefined);

    return jsonNoStore({ error: message, publishLogId }, 502);
  }
}
