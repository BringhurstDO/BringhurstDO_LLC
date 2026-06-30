import { NextResponse, type NextRequest } from "next/server";

import { publishMetaDraft } from "@/lib/ops/meta-publish-service";
import { resolveMetaConfig } from "@/lib/ops/meta-config";
import type { OpsProjectId, SocialPublishResult } from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

type PublishBody = {
  accountId?: unknown;
  assetLocation?: unknown;
  body?: unknown;
  confirmApproved?: unknown;
  contentPackageId?: unknown;
  imageUrl?: unknown;
  platform?: unknown;
  platformDraftId?: unknown;
  publicationTargetId?: unknown;
  publishingProjectId?: unknown;
  sourceProjectId?: unknown;
  title?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asProjectId(value: unknown): OpsProjectId | undefined {
  const normalized = asString(value);

  if (
    normalized === "syncsoap" ||
    normalized === "syncsafety" ||
    normalized === "bringhurstdo"
  ) {
    return normalized;
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  const config = resolveMetaConfig();

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
  const platform = asString(payload.platform);

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

  if (platform !== "Facebook" && platform !== "Instagram") {
    return jsonNoStore(
      {
        error: "platform must be Facebook or Instagram for Meta publish.",
      },
      400,
    );
  }

  const published = await publishMetaDraft({
    accountId: requestedAccountId,
    assetLocation: asString(payload.assetLocation) || undefined,
    body: rawBody,
    contentPackageId,
    imageUrl: asString(payload.imageUrl) || undefined,
    platform,
    platformDraftId,
    publicationTargetId,
    publishingProjectId: asProjectId(payload.publishingProjectId),
    sourceProjectId: asProjectId(payload.sourceProjectId),
    title: title || undefined,
    trigger: "manual",
  });

  if (!published.ok) {
    const httpStatus =
      published.error.code === "not_implemented"
        ? 501
        : published.error.code === "media_missing"
          ? 400
          : published.error.code === "connection"
          ? published.error.message.includes("not connected")
            ? 409
            : 502
          : published.error.code === "body_invalid"
            ? 400
            : 502;

    return jsonNoStore({ error: published.error.message }, httpStatus);
  }

  return jsonNoStore(published.result satisfies SocialPublishResult);
}
