import "server-only";

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
import { createDatabaseOpsPersistenceAdapter } from "@/lib/ops/persistence-db";
import { opsDashboardData } from "@/lib/ops/mock-data";
import type {
  OpsAutopublishDraftResult,
  OpsAutopublishRunRecord,
  OpsContentPackageRecord,
  PlatformDraft,
  PublicationTarget,
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

function isEligibleDraft(
  record: OpsContentPackageRecord,
  draft: PlatformDraft,
  runDate: string,
) {
  if (draft.platform !== "LinkedIn") {
    return "Platform is not LinkedIn.";
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

  if (draft.suggestedScheduledFor !== runDate) {
    return `Scheduled for ${draft.suggestedScheduledFor}, not ${runDate}.`;
  }

  if (draftIsPosted(record, draft)) {
    return "Draft is already posted.";
  }

  return null;
}

export type AutopublishRunResponse = {
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

      if (draft.suggestedScheduledFor !== runDate) {
        continue;
      }

      const eligibilityIssue = isEligibleDraft(record, draft, runDate);

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

      const published = await publishLinkedInDraft({
        accountId,
        body: draft.body,
        contentPackageId: record.contentPackage.id,
        platformDraftId: draft.id,
        publicationTargetId: draft.publicationTargetId,
        title: draft.title,
        trigger: "autopublish",
      });

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
          ? applyLinkedInPublishToRecord(
              item,
              draft.id,
              published.result,
              "autopublish",
            )
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
      `Autopublish run for ${runDate} (${resolved.timeZone}).`,
      `Published ${publishedCount}, skipped ${skippedCount}, errors ${errorCount}.`,
    ],
    publishedCount,
    runDate,
    skippedCount,
    sourceBoundary:
      "BringhurstDO Ops scheduled LinkedIn autopublish run. Metadata-only audit.",
    status,
    timeZone: resolved.timeZone,
    trigger,
  };

  await saveAutopublishRunRecord(runRecord).catch(() => undefined);

  return {
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
