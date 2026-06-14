import { NextResponse, type NextRequest } from "next/server";

import { publishLinkedInDraft } from "@/lib/ops/linkedin-publish-service";
import { resolveLinkedInConfig } from "@/lib/ops/linkedin-config";
import type { SocialPublishResult } from "@/lib/ops/types";

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

  const published = await publishLinkedInDraft({
    accountId: requestedAccountId,
    body: rawBody,
    contentPackageId,
    linkUrl: linkUrl || undefined,
    platformDraftId,
    publicationTargetId,
    title: title || undefined,
    trigger: "manual",
  });

  if (!published.ok) {
    const httpStatus =
      published.error.code === "connection"
        ? published.error.message.includes("not connected")
          ? 409
          : 502
        : published.error.code === "not_found"
          ? 400
          : published.error.code === "body_invalid"
            ? 400
            : 502;

    return jsonNoStore({ error: published.error.message }, httpStatus);
  }

  return jsonNoStore(published.result satisfies SocialPublishResult);
}
