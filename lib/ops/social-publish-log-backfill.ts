import "server-only";

import { createDatabaseOpsPersistenceAdapter } from "@/lib/ops/persistence-db";
import { listSuccessfulSocialPublishLogs } from "@/lib/ops/social-connections-db";
import type {
  OpsContentPackageRecord,
  OpsProjectId,
  PlatformDraft,
  PublicationPlatform,
  PublishedPost,
  SocialPublishLogRecord,
} from "@/lib/ops/types";

/** Durable package for posts recovered from publish audit logs after package delete. */
export const SOCIAL_PUBLISH_LOG_BACKFILL_PACKAGE_ID =
  "content-package-social-publish-log-backfill";
const SOCIAL_PUBLISH_LOG_SOURCE_UPDATE_ID =
  "source-update-social-publish-log-backfill";
const SOCIAL_PUBLISH_LOG_OUTCOME_ID =
  "business-outcome-social-publish-log-backfill";

export type SocialPublishLogBackfillResult = {
  backfilledCount: number;
  skippedAlreadyPresent: number;
  skippedIncomplete: number;
  logIds: string[];
};

function projectIdFromTargetOrAccount(
  publicationTargetId: string,
  accountId: string,
): OpsProjectId {
  const haystack = `${publicationTargetId} ${accountId}`.toLowerCase();
  if (haystack.includes("syncsoap")) {
    return "syncsoap";
  }
  if (haystack.includes("syncsafety")) {
    return "syncsafety";
  }
  return "bringhurstdo";
}

function publicationPlatformFromLog(
  log: SocialPublishLogRecord,
): PublicationPlatform | null {
  if (log.platform === "LinkedIn") {
    return "LinkedIn";
  }
  if (log.platform === "X") {
    return "X";
  }
  if (log.platform === "Meta") {
    const haystack =
      `${log.accountId} ${log.publicationTargetId} ${log.notes.join(" ")}`.toLowerCase();
    if (haystack.includes("instagram")) {
      return "Instagram";
    }
    return "Facebook";
  }
  return null;
}

function accountNameFromLog(
  log: SocialPublishLogRecord,
  platform: PublicationPlatform,
): string {
  for (const note of log.notes) {
    const match = note.match(/\bas\s+(.+?)(?:\.\s|$)/i);
    if (match?.[1]) {
      return match[1].replace(/\s*\(X\)\s*$/i, "").trim();
    }
  }

  if (platform === "LinkedIn") {
    return "Kyle Bringhurst LinkedIn";
  }
  if (platform === "X") {
    return "Kyle Bringhurst X";
  }
  if (platform === "Instagram") {
    if (log.accountId.includes("syncsoap")) return "SyncSOAP Instagram";
    if (log.accountId.includes("syncsafety")) return "SyncSafety Instagram";
    return "BringhurstDO Instagram";
  }
  if (log.accountId.includes("syncsoap")) return "SyncSOAP Facebook";
  if (log.accountId.includes("syncsafety")) return "SyncSafety Facebook";
  return "BringhurstDO Facebook";
}

function mediaUrlFromNotes(notes: string[]) {
  for (const note of notes) {
    const match = note.match(/https?:\/\/\S+\.(?:png|jpe?g|webp|gif|mp4)/i);
    if (match?.[0]) {
      return match[0].replace(/[),.;]+$/, "");
    }
    const labeled = note.match(/Image:\s*(https?:\/\/\S+)/i);
    if (labeled?.[1]) {
      return labeled[1].replace(/[),.;]+$/, "");
    }
  }
  return "";
}

function titleFromBodyPreview(bodyPreview: string, platform: PublicationPlatform) {
  const compact = bodyPreview.replace(/\s+/g, " ").trim();
  if (!compact) {
    return `${platform} publish-log backfill`;
  }
  return compact.length > 90 ? `${compact.slice(0, 90).trim()}…` : compact;
}

function calendarDateFromIso(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function createSocialPublishLogBackfillPackage(): OpsContentPackageRecord {
  const now = new Date().toISOString();
  return {
    sourceUpdate: {
      id: SOCIAL_PUBLISH_LOG_SOURCE_UPDATE_ID,
      sourceProjectId: "bringhurstdo",
      projectId: "bringhurstdo",
      title: "Social publish log backfill",
      summary:
        "Posts recovered from ops_social_publish_log after a parent content package was deleted.",
      updateType: "operator-note",
      sourceDate: now.slice(0, 10),
      sourceBoundary:
        "Metadata-only publish audit recovery; no tokens or clinical payloads.",
      approvalRequired: false,
      createdAt: now,
      notes: [
        "Created to preserve lean posted history when scheduling packages are deleted.",
      ],
    },
    contentPackage: {
      id: SOCIAL_PUBLISH_LOG_BACKFILL_PACKAGE_ID,
      sourceUpdateId: SOCIAL_PUBLISH_LOG_SOURCE_UPDATE_ID,
      title: "Social publish log backfill",
      sourceProjectIds: ["bringhurstdo"],
      publishingProjectIds: ["bringhurstdo", "syncsoap", "syncsafety"],
      projectIds: ["bringhurstdo", "syncsoap", "syncsafety"],
      publicationTargetIds: [],
      status: "posted",
      approvalRequired: false,
      createdAt: now,
      updatedAt: now,
      notes: [
        "Lean metrics/history package for posts recovered from publish audit logs.",
        "Safe to keep; delete only if you intentionally want to drop recovered posted history.",
      ],
    },
    businessOutcome: {
      id: SOCIAL_PUBLISH_LOG_OUTCOME_ID,
      contentPackageId: SOCIAL_PUBLISH_LOG_BACKFILL_PACKAGE_ID,
      capturedAt: now.slice(0, 10),
      source: "manual",
      leads: "0",
      conversations: "0",
      revenue: "0",
      numericOutcomes: { conversations: 0, leads: 0, revenue: 0 },
      notes: ["Placeholder outcome row for publish-log backfill package."],
    },
    platformDrafts: [],
    publishedPosts: [],
    performanceSnapshots: [],
  };
}

function ensureBackfillPackage(
  records: OpsContentPackageRecord[],
): { records: OpsContentPackageRecord[]; packageId: string } {
  const existing = records.find(
    (record) =>
      record.contentPackage.id === SOCIAL_PUBLISH_LOG_BACKFILL_PACKAGE_ID,
  );

  if (existing) {
    return {
      packageId: SOCIAL_PUBLISH_LOG_BACKFILL_PACKAGE_ID,
      records,
    };
  }

  return {
    packageId: SOCIAL_PUBLISH_LOG_BACKFILL_PACKAGE_ID,
    records: [...records, createSocialPublishLogBackfillPackage()],
  };
}

async function loadSuccessPublishLogs(): Promise<SocialPublishLogRecord[]> {
  return listSuccessfulSocialPublishLogs();
}

function draftOrPostAlreadyPresent(
  records: OpsContentPackageRecord[],
  log: SocialPublishLogRecord,
) {
  for (const record of records) {
    if (record.platformDrafts.some((draft) => draft.id === log.platformDraftId)) {
      return true;
    }

    if (
      log.platformPostId &&
      record.publishedPosts.some(
        (post) =>
          post.platformPostId === log.platformPostId ||
          post.postedUrl === log.postUrl ||
          post.postUrl === log.postUrl,
      )
    ) {
      return true;
    }
  }

  return false;
}

function backfillOneLog(
  record: OpsContentPackageRecord,
  log: SocialPublishLogRecord,
): OpsContentPackageRecord | null {
  const platform = publicationPlatformFromLog(log);
  if (!platform || !log.platformDraftId) {
    return null;
  }

  const postedAt = log.createdAt || new Date().toISOString();
  const publishedOn = calendarDateFromIso(postedAt);
  const projectId = projectIdFromTargetOrAccount(
    log.publicationTargetId,
    log.accountId,
  );
  const accountName = accountNameFromLog(log, platform);
  const mediaUrl = mediaUrlFromNotes(log.notes);
  const publishedPostId = `published-post-from-log-${log.id}`;
  const body =
    log.bodyPreview?.trim() ||
    "Recovered from Ops social publish log. Public post already live; Ops tracks history/metrics.";

  const draft: PlatformDraft = {
    id: log.platformDraftId,
    contentPackageId: record.contentPackage.id,
    sourceUpdateId: record.sourceUpdate.id,
    publicationTargetId: log.publicationTargetId || "target-recovered-publish-log",
    sourceProjectId: projectId,
    publishingProjectId: projectId,
    projectId,
    platform,
    accountName,
    title: titleFromBodyPreview(body, platform),
    body,
    media: {
      mediaType: mediaUrl ? "image" : "none",
      mediaSummary: mediaUrl
        ? "Recovered image URL from publish log notes (reference only)."
        : "No media URL in publish log notes.",
      visualHook: "n/a",
      creativeAngle: "build-in-public",
      productionEffort: "low",
      reuseStatus: "reused",
      assetLocation: mediaUrl || undefined,
    },
    status: "posted",
    approvalRequired: false,
    utmCampaignId: "",
    generatedUrl: log.postUrl ?? "",
    suggestedScheduledFor: publishedOn,
    safetyNotes: [
      "Recovered from social publish audit log after package delete. Not for republish.",
    ],
    operatorNotes: [
      `Recovered from publish log ${log.id}.`,
      ...log.notes.slice(0, 2),
    ],
    updatedAt: postedAt,
  };

  const publishedPost: PublishedPost = {
    id: publishedPostId,
    accountName,
    platform,
    platformDraftId: log.platformDraftId,
    projectId,
    publicationTargetId: log.publicationTargetId || "target-recovered-publish-log",
    status: "posted",
    postedAt,
    postedManuallyAt: postedAt,
    postUrl: log.postUrl ?? undefined,
    postedUrl: log.postUrl ?? undefined,
    platformPostId: log.platformPostId ?? undefined,
    manualNotes: [
      `Backfilled from ops_social_publish_log (${log.id}).`,
    ],
  };

  return {
    ...record,
    contentPackage: {
      ...record.contentPackage,
      status: "posted",
      updatedAt: new Date().toISOString(),
      publicationTargetIds: Array.from(
        new Set([
          ...record.contentPackage.publicationTargetIds,
          draft.publicationTargetId,
        ]),
      ),
    },
    platformDrafts: [
      ...record.platformDrafts.filter((item) => item.id !== draft.id),
      draft,
    ],
    publishedPosts: [
      ...record.publishedPosts.filter((item) => item.id !== publishedPostId),
      publishedPost,
    ],
  };
}

/**
 * Rehydrate deleted package drafts/posts from successful social publish logs.
 * Idempotent: skips logs whose draft id or platform post id already exists in Ops.
 */
export async function applySocialPublishLogBackfill(): Promise<SocialPublishLogBackfillResult> {
  const adapter = createDatabaseOpsPersistenceAdapter();
  const loaded = await adapter.loadContentPackages();
  let records = loaded.contentPackages;
  const logs = await loadSuccessPublishLogs();

  let backfilledCount = 0;
  let skippedAlreadyPresent = 0;
  let skippedIncomplete = 0;
  const logIds: string[] = [];

  const ensured = ensureBackfillPackage(records);
  records = ensured.records;
  let backfill =
    records.find(
      (record) => record.contentPackage.id === ensured.packageId,
    ) ?? null;

  if (!backfill) {
    return {
      backfilledCount: 0,
      skippedAlreadyPresent: 0,
      skippedIncomplete: logs.length,
      logIds: [],
    };
  }

  for (const log of logs) {
    if (!log.platformPostId && !log.postUrl) {
      skippedIncomplete += 1;
      continue;
    }

    if (draftOrPostAlreadyPresent(records, log)) {
      skippedAlreadyPresent += 1;
      continue;
    }

    const next = backfillOneLog(backfill, log);
    if (!next) {
      skippedIncomplete += 1;
      continue;
    }

    backfill = next;
    records = records.map((record) =>
      record.contentPackage.id === ensured.packageId ? next : record,
    );
    backfilledCount += 1;
    logIds.push(log.id);
  }

  if (backfilledCount > 0) {
    await adapter.saveContentPackages(records);
  }

  return {
    backfilledCount,
    skippedAlreadyPresent,
    skippedIncomplete,
    logIds,
  };
}
