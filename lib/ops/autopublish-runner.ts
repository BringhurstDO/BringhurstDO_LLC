import "server-only";

import { platformSupportsAutopublish } from "@/lib/ops/autopublish-platforms";
import {
  applyLinkedInPublishToRecord,
  draftIsPosted,
  publishLinkedInDraft,
} from "@/lib/ops/linkedin-publish-service";
import {
  calendarDateInTimezone,
  resolveAutopublishConfig,
} from "@/lib/ops/autopublish-config";
import { saveAutopublishRunRecord } from "@/lib/ops/autopublish-runs-db";
import {
  applyMetaPublishToRecord,
  publishMetaDraft,
} from "@/lib/ops/meta-publish-service";
import { createDatabaseOpsPersistenceAdapter } from "@/lib/ops/persistence-db";
import { platformScheduleBucketId } from "@/lib/ops/platform-schedule-defaults";
import {
  calendarDaysBetween,
  OPS_AUTOPUBLISH_CATCH_UP_DAYS,
} from "@/lib/ops/schedule-date-utils";
import {
  applyXPublishToRecord,
  draftIsPosted as xDraftIsPosted,
  publishXDraft,
} from "@/lib/ops/x-publish-service";
import { opsDashboardData } from "@/lib/ops/mock-data";
import type {
  OpsAutopublishDraftResult,
  OpsAutopublishRunRecord,
  OpsContentPackageRecord,
  OpsScheduleBucketId,
  PlatformDraft,
  PublicationTarget,
  SocialPublishResult,
} from "@/lib/ops/types";

function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildTargetMaps(publicationTargets: PublicationTarget[]) {
  const accountIdByTargetId = new Map<string, string>();

  for (const target of publicationTargets) {
    accountIdByTargetId.set(target.id, target.accountId);
  }

  return { accountIdByTargetId };
}

function skipResult(
  draft: PlatformDraft,
  contentPackageId: string,
  reason: string,
): OpsAutopublishDraftResult {
  return {
    accountName: draft.accountName,
    contentPackageId,
    platform: draft.platform,
    platformDraftId: draft.id,
    reason,
    status: "skipped",
  };
}

function draftAlreadyPosted(
  record: OpsContentPackageRecord,
  draft: PlatformDraft,
) {
  if (draft.platform === "X") {
    return xDraftIsPosted(record, draft);
  }

  if (draft.platform === "Instagram" || draft.platform === "Facebook") {
    return record.publishedPosts.some(
      (post) =>
        post.platformDraftId === draft.id && post.status === "posted",
    );
  }

  return draftIsPosted(record, draft);
}

async function publishAutopublishDraft(
  draft: PlatformDraft,
  record: OpsContentPackageRecord,
  accountId: string,
) {
  const base = {
    accountId,
    body: draft.body,
    contentPackageId: record.contentPackage.id,
    platformDraftId: draft.id,
    publicationTargetId: draft.publicationTargetId,
    title: draft.title,
    trigger: "autopublish" as const,
  };

  if (draft.platform === "X") {
    return publishXDraft(base);
  }

  if (draft.platform === "Instagram") {
    return publishMetaDraft({
      ...base,
      assetLocation: draft.media.assetLocation,
      platform: "Instagram",
      publishingProjectId: draft.publishingProjectId,
    });
  }

  if (draft.platform === "Facebook") {
    return publishMetaDraft({
      ...base,
      assetLocation: draft.media.assetLocation,
      platform: "Facebook",
      publishingProjectId: draft.publishingProjectId,
    });
  }

  return publishLinkedInDraft(base);
}

function applyAutopublishResult(
  record: OpsContentPackageRecord,
  draft: PlatformDraft,
  result: SocialPublishResult,
) {
  if (draft.platform === "X") {
    return applyXPublishToRecord(record, draft.id, result);
  }

  if (draft.platform === "Instagram" || draft.platform === "Facebook") {
    return applyMetaPublishToRecord(record, draft.id, result);
  }

  return applyLinkedInPublishToRecord(
    record,
    draft.id,
    result,
    "autopublish",
  );
}

function isEligibleDraft(
  record: OpsContentPackageRecord,
  draft: PlatformDraft,
  runDate: string,
  bucketId: OpsScheduleBucketId,
  trigger: OpsAutopublishRunRecord["trigger"],
) {
  if (!platformSupportsAutopublish(draft.platform)) {
    return "Platform does not support autopublish.";
  }

  if (!draft.autopublishEnabled) {
    return "Autopublish is not enabled for this draft.";
  }

  if (draft.status !== "approved") {
    return "Draft is not approved.";
  }

  if (!draft.suggestedScheduledFor) {
    return "Draft has no suggestedScheduledFor date.";
  }

  if (draftAlreadyPosted(record, draft)) {
    return "Draft is already posted.";
  }

  const scheduledDate = draft.suggestedScheduledFor;
  const effectiveBucketId =
    draft.suggestedScheduleBucketId ?? platformScheduleBucketId(draft.platform);

  if (scheduledDate > runDate) {
    return `Scheduled for ${scheduledDate}, which is still in the future.`;
  }

  if (scheduledDate < runDate) {
    if (trigger !== "manual" && bucketId !== "morning") {
      return `Overdue since ${scheduledDate}; catch-up runs on the morning bucket only.`;
    }

    const daysOverdue = calendarDaysBetween(scheduledDate, runDate);

    if (
      daysOverdue === null ||
      daysOverdue > OPS_AUTOPUBLISH_CATCH_UP_DAYS
    ) {
      return `Overdue by ${daysOverdue ?? "?"} days (catch-up limit is ${OPS_AUTOPUBLISH_CATCH_UP_DAYS}).`;
    }

    return null;
  }

  if (trigger === "manual") {
    return null;
  }

  if (effectiveBucketId !== bucketId) {
    return `Scheduled for ${effectiveBucketId}, not ${bucketId}.`;
  }

  return null;
}

export type AutopublishRunResponse = {
  bucketId: OpsScheduleBucketId;
  draftResults: OpsAutopublishDraftResult[];
  errorCount: number;
  publishedCount: number;
  runDate: string;
  runId: string;
  skippedCount: number;
  status: OpsAutopublishRunRecord["status"];
  timeZone: string;
  trigger: OpsAutopublishRunRecord["trigger"];
};

export async function runScheduledAutopublish(
  trigger: OpsAutopublishRunRecord["trigger"],
  { bucketId = "morning" }: { bucketId?: OpsScheduleBucketId } = {},
) {
  const resolved = resolveAutopublishConfig();

  if (!resolved.enabled) {
    throw new Error(resolved.reason);
  }

  const runDate = calendarDateInTimezone(resolved.timeZone);
  const runId = `autopublish-run-${nowId()}`;
  const { publicationTargets } = opsDashboardData;
  const { accountIdByTargetId } = buildTargetMaps(publicationTargets);
  const adapter = createDatabaseOpsPersistenceAdapter();
  const loaded = await adapter.loadContentPackages();
  let records = loaded.contentPackages;
  const draftResults: OpsAutopublishDraftResult[] = [];

  for (const record of records) {
    for (const draft of record.platformDrafts) {
      if (!draft.autopublishEnabled) {
        continue;
      }

      if (!draft.suggestedScheduledFor || draft.suggestedScheduledFor > runDate) {
        continue;
      }

      const eligibilityIssue = isEligibleDraft(
        record,
        draft,
        runDate,
        bucketId,
        trigger,
      );

      if (eligibilityIssue) {
        draftResults.push(
          skipResult(draft, record.contentPackage.id, eligibilityIssue),
        );
        continue;
      }

      const accountId = accountIdByTargetId.get(draft.publicationTargetId);

      if (!accountId) {
        draftResults.push(
          skipResult(
            draft,
            record.contentPackage.id,
            "Publication target is unknown.",
          ),
        );
        continue;
      }

      const published = await publishAutopublishDraft(
        draft,
        record,
        accountId,
      );

      if (!published.ok) {
        draftResults.push({
          accountName: draft.accountName,
          contentPackageId: record.contentPackage.id,
          platform: draft.platform,
          platformDraftId: draft.id,
          reason: published.error.message,
          status: "error",
        });
        continue;
      }

      records = records.map((item) =>
        item.contentPackage.id === record.contentPackage.id
          ? applyAutopublishResult(item, draft, published.result)
          : item,
      );

      draftResults.push({
        accountName: draft.accountName,
        contentPackageId: record.contentPackage.id,
        platform: draft.platform,
        platformDraftId: draft.id,
        postUrl: published.result.postUrl,
        status: "published",
      });
    }
  }

  if (draftResults.some((result) => result.status === "published")) {
    await adapter.saveContentPackages(records);
  }

  const publishedCount = draftResults.filter(
    (result) => result.status === "published",
  ).length;
  const skippedCount = draftResults.filter(
    (result) => result.status === "skipped",
  ).length;
  const errorCount = draftResults.filter(
    (result) => result.status === "error",
  ).length;
  const status: OpsAutopublishRunRecord["status"] =
    errorCount > 0
      ? publishedCount > 0
        ? "partial"
        : "error"
      : "success";

  const runRecord: OpsAutopublishRunRecord = {
    createdAt: new Date().toISOString(),
    draftResults,
    errorCount,
    id: runId,
    notes: [
      `Autopublish run for ${runDate} (${resolved.timeZone}) bucket ${bucketId}.`,
      `Published ${publishedCount}, skipped ${skippedCount}, errors ${errorCount}.`,
      `Overdue catch-up is enabled for up to ${OPS_AUTOPUBLISH_CATCH_UP_DAYS} days on the morning bucket and manual runs.`,
    ],
    publishedCount,
    runDate,
    skippedCount,
    sourceBoundary:
      "BringhurstDO Ops scheduled social autopublish run. Metadata-only audit.",
    status,
    timeZone: resolved.timeZone,
    trigger,
  };

  await saveAutopublishRunRecord(runRecord).catch(() => undefined);

  return {
    bucketId,
    draftResults,
    errorCount,
    publishedCount,
    runDate,
    runId,
    skippedCount,
    status,
    timeZone: resolved.timeZone,
    trigger,
  } satisfies AutopublishRunResponse;
}
