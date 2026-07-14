import "server-only";

import { createDatabaseOpsPersistenceAdapter } from "@/lib/ops/persistence-db";
import { replacePerformanceSnapshot } from "@/lib/ops/social-performance";
import type {
  OpsContentPackageRecord,
  PerformanceSnapshot,
  PlatformDraft,
  PublishedPost,
} from "@/lib/ops/types";

function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Durable Ops package that holds LinkedIn posts discovered via Excel import. */
export const LINKEDIN_IMPORT_BACKFILL_PACKAGE_ID =
  "content-package-linkedin-import-backfill";
const LINKEDIN_IMPORT_SOURCE_UPDATE_ID =
  "source-update-linkedin-import-backfill";
const LINKEDIN_IMPORT_OUTCOME_ID =
  "business-outcome-linkedin-import-backfill";
const FOUNDER_LINKEDIN_TARGET_ID = "target-founder-linkedin-investors";
const FOUNDER_LINKEDIN_ACCOUNT_NAME = "Kyle Bringhurst LinkedIn";

export type LinkedInImportedTopPost = {
  engagements: number;
  impressions: number;
  postUrl: string;
};

export type LinkedInAnalyticsImportPayload = {
  discovery: {
    impressions: number;
    membersReached: number;
    periodLabel: string;
  };
  followers: {
    newFollowers: number;
    totalFollowers: number;
  };
  topPosts: LinkedInImportedTopPost[];
  totalEngagements: number;
};

export type LinkedInAnalyticsImportResult = {
  matchedCount: number;
  matched: Array<{
    engagements: number;
    impressions: number;
    postUrl: string;
    publishedPostId: string;
  }>;
  /** Posts created in Ops from Excel TOP POSTS that had no prior Ops publish row. */
  backfilledCount: number;
  periodSummary: {
    impressions: number;
    membersReached: number;
    newFollowers: number;
    periodLabel: string;
    totalEngagements: number;
    totalFollowers: number;
  };
  unmatchedCount: number;
  unmatchedUrls: string[];
  updatedPackageCount: number;
};

function normalizeLinkedInUrl(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^http:\/\//, "https://")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

/**
 * Extract LinkedIn activity/share numeric ids from Ops URNs and Excel vanity URLs.
 *
 * Ops stores: urn:li:share:7478… + feed/update/urn%3Ali%3Ashare%3A7478…
 * Excel TOP POSTS: /posts/kyle-…-share-7478…-unOr
 */
export function extractLinkedInActivityIds(value: string): string[] {
  if (!value.trim()) {
    return [];
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // keep raw
  }

  const ids = new Set<string>();

  for (const match of decoded.matchAll(
    /urn:li:(?:share|ugcPost|activity):(\d{10,})/gi,
  )) {
    ids.add(match[1]);
  }

  for (const match of decoded.matchAll(
    /(?:share|activity|ugcPost)[_:-](\d{10,})/gi,
  )) {
    ids.add(match[1]);
  }

  const bare = decoded.trim().match(/^(\d{15,})$/);
  if (bare) {
    ids.add(bare[1]);
  }

  return [...ids];
}

function publishedPostUrls(post: {
  postUrl?: string;
  postedUrl?: string;
}) {
  return [post.postedUrl, post.postUrl]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeLinkedInUrl);
}

function findMatchingPublishedPost(
  records: OpsContentPackageRecord[],
  importUrl: string,
) {
  const normalizedImport = normalizeLinkedInUrl(importUrl);
  const importIds = extractLinkedInActivityIds(importUrl);

  for (const record of records) {
    for (const post of record.publishedPosts) {
      if (post.platform !== "LinkedIn" || post.status !== "posted") {
        continue;
      }

      const urls = publishedPostUrls(post);
      const opsIds = [
        ...extractLinkedInActivityIds(post.platformPostId ?? ""),
        ...urls.flatMap((url) => extractLinkedInActivityIds(url)),
      ];

      if (
        importIds.length > 0 &&
        opsIds.some((id) => importIds.includes(id))
      ) {
        return { post, record };
      }

      if (
        urls.some(
          (url) =>
            url === normalizedImport ||
            url.includes(normalizedImport) ||
            normalizedImport.includes(url),
        )
      ) {
        return { post, record };
      }
    }
  }

  return null;
}

function upsertLinkedInImportSnapshot(
  record: OpsContentPackageRecord,
  publishedPostId: string,
  metric: {
    engagements: number;
    impressions: number;
    periodLabel: string;
    postUrl: string;
  },
): OpsContentPackageRecord {
  const capturedAt = new Date().toISOString();
  const impressions = Math.max(0, Math.round(metric.impressions));
  const reactions = Math.max(0, Math.round(metric.engagements));
  const snapshot: PerformanceSnapshot = {
    capturedAt,
    clicks: "0",
    comments: "0",
    id: `performance-li-import-${publishedPostId}-${nowId()}`,
    impressions: String(impressions),
    notes: [
      `LinkedIn Aggregate Analytics import (${metric.periodLabel || "period unknown"}).`,
      `Matched TOP POSTS URL: ${metric.postUrl}`,
      "Engagements mapped to reactions. Comments/saves not provided in Aggregate export TOP POSTS columns.",
      "Import metrics replace manual placeholders for this post.",
    ],
    numericMetrics: {
      clicks: 0,
      comments: 0,
      impressions,
      reactions,
      saves: 0,
    },
    publishedPostId,
    reactions: String(reactions),
    saves: "0",
    source: "linkedin-import",
  };

  return {
    ...record,
    performanceSnapshots: replacePerformanceSnapshot(
      record.performanceSnapshots,
      snapshot,
    ),
  };
}

function titleFromLinkedInImportUrl(postUrl: string) {
  const path = postUrl.split("/posts/")[1] ?? postUrl;
  const withoutShare = path.replace(/-share-\d{10,}-[a-z0-9_-]+$/i, "");
  const withoutHandle = withoutShare.replace(/^[^_]+_/, "");
  const title = withoutHandle
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return title || "LinkedIn imported post";
}

function createLinkedInImportBackfillPackage(
  periodLabel: string,
): OpsContentPackageRecord {
  const now = new Date().toISOString();

  return {
    sourceUpdate: {
      id: LINKEDIN_IMPORT_SOURCE_UPDATE_ID,
      sourceProjectId: "bringhurstdo",
      projectId: "bringhurstdo",
      title: "LinkedIn Aggregate Analytics backfill",
      updateType: "weekly-review",
      summary:
        "Posts discovered from LinkedIn Aggregate Analytics Excel imports that were not previously tracked in Ops. Incoming Excel metrics are the source of truth.",
      sourceDate: now.slice(0, 10),
      sourceBoundary:
        "Metadata-only LinkedIn analytics backfill. No private messages, credentials, or audience exports.",
      approvalRequired: false,
      createdAt: now,
      notes: [
        "Created automatically by LinkedIn Excel import when TOP POSTS URLs are missing from Ops.",
      ],
    },
    contentPackage: {
      id: LINKEDIN_IMPORT_BACKFILL_PACKAGE_ID,
      sourceUpdateId: LINKEDIN_IMPORT_SOURCE_UPDATE_ID,
      title: "LinkedIn analytics import backfill",
      sourceProjectIds: ["bringhurstdo"],
      publishingProjectIds: ["bringhurstdo"],
      projectIds: ["bringhurstdo"],
      publicationTargetIds: [FOUNDER_LINKEDIN_TARGET_ID],
      status: "posted",
      approvalRequired: false,
      createdAt: now,
      updatedAt: now,
      notes: [
        "Ops content package for LinkedIn posts backfilled from Aggregate Analytics.",
        periodLabel
          ? `Latest import period: ${periodLabel}.`
          : "Period label not provided by import.",
        "Human approval is not required for metrics-only backfill rows.",
      ],
    },
    businessOutcome: {
      id: LINKEDIN_IMPORT_OUTCOME_ID,
      contentPackageId: LINKEDIN_IMPORT_BACKFILL_PACKAGE_ID,
      capturedAt: now.slice(0, 10),
      source: "manual",
      leads: "0",
      conversations: "0",
      revenue: "0",
      numericOutcomes: { conversations: 0, leads: 0, revenue: 0 },
      notes: ["Placeholder outcome row for analytics backfill package."],
    },
    platformDrafts: [],
    publishedPosts: [],
    performanceSnapshots: [],
  };
}

function ensureLinkedInImportBackfillPackage(
  records: OpsContentPackageRecord[],
  periodLabel: string,
): { records: OpsContentPackageRecord[]; packageId: string } {
  const existing = records.find(
    (record) => record.contentPackage.id === LINKEDIN_IMPORT_BACKFILL_PACKAGE_ID,
  );

  if (existing) {
    const updatedAt = new Date().toISOString();
    const next: OpsContentPackageRecord = {
      ...existing,
      contentPackage: {
        ...existing.contentPackage,
        updatedAt,
        notes: [
          ...existing.contentPackage.notes.filter(
            (note) => !note.startsWith("Latest import period:"),
          ),
          periodLabel
            ? `Latest import period: ${periodLabel}.`
            : "Period label not provided by import.",
        ],
      },
    };

    return {
      packageId: LINKEDIN_IMPORT_BACKFILL_PACKAGE_ID,
      records: records.map((record) =>
        record.contentPackage.id === LINKEDIN_IMPORT_BACKFILL_PACKAGE_ID
          ? next
          : record,
      ),
    };
  }

  return {
    packageId: LINKEDIN_IMPORT_BACKFILL_PACKAGE_ID,
    records: [...records, createLinkedInImportBackfillPackage(periodLabel)],
  };
}

function backfillLinkedInPublishedPost(
  record: OpsContentPackageRecord,
  topPost: LinkedInImportedTopPost,
): { record: OpsContentPackageRecord; publishedPostId: string } | null {
  const shareId = extractLinkedInActivityIds(topPost.postUrl)[0];

  if (!shareId) {
    return null;
  }

  const platformPostId = `urn:li:share:${shareId}`;
  const existing = record.publishedPosts.find((post) => {
    if (post.platform !== "LinkedIn") {
      return false;
    }

    const ids = [
      ...extractLinkedInActivityIds(post.platformPostId ?? ""),
      ...extractLinkedInActivityIds(post.postUrl ?? ""),
      ...extractLinkedInActivityIds(post.postedUrl ?? ""),
    ];

    return ids.includes(shareId);
  });

  if (existing) {
    const patchedPosts = record.publishedPosts.map((post) =>
      post.id === existing.id
        ? {
            ...post,
            status: "posted" as const,
            platformPostId: post.platformPostId || platformPostId,
            postUrl: topPost.postUrl,
            postedUrl: topPost.postUrl,
            postedAt: post.postedAt ?? new Date().toISOString(),
            postedManuallyAt:
              post.postedManuallyAt ?? new Date().toISOString(),
            manualNotes: [
              ...post.manualNotes.filter(
                (note) => !note.includes("LinkedIn Aggregate Analytics"),
              ),
              "Updated from LinkedIn Aggregate Analytics import (incoming Excel is source of truth).",
            ],
          }
        : post,
    );

    return {
      publishedPostId: existing.id,
      record: { ...record, publishedPosts: patchedPosts },
    };
  }

  const now = new Date().toISOString();
  const draftId = `platform-draft-linkedin-import-${shareId}`;
  const publishedPostId = `published-post-linkedin-import-${shareId}`;
  const title = titleFromLinkedInImportUrl(topPost.postUrl);

  const draft: PlatformDraft = {
    id: draftId,
    contentPackageId: record.contentPackage.id,
    sourceUpdateId: record.sourceUpdate.id,
    publicationTargetId: FOUNDER_LINKEDIN_TARGET_ID,
    sourceProjectId: "bringhurstdo",
    publishingProjectId: "bringhurstdo",
    projectId: "bringhurstdo",
    platform: "LinkedIn",
    accountName: FOUNDER_LINKEDIN_ACCOUNT_NAME,
    title,
    body: "Imported from LinkedIn Aggregate Analytics. Public post already live on LinkedIn; Ops tracks metrics only.",
    media: {
      mediaType: "none",
      mediaSummary: "No media metadata in Aggregate Analytics import.",
      visualHook: "n/a",
      creativeAngle: "build-in-public",
      productionEffort: "low",
      reuseStatus: "reused",
    },
    status: "posted",
    approvalRequired: false,
    utmCampaignId: "",
    generatedUrl: topPost.postUrl,
    safetyNotes: [
      "Backfilled from LinkedIn Excel import. Body is a metadata placeholder, not republished.",
    ],
    operatorNotes: [
      "Created because Excel TOP POSTS included this URL and Ops had no matching published post.",
    ],
    updatedAt: now,
  };

  const publishedPost: PublishedPost = {
    id: publishedPostId,
    accountName: FOUNDER_LINKEDIN_ACCOUNT_NAME,
    platform: "LinkedIn",
    platformDraftId: draftId,
    projectId: "bringhurstdo",
    publicationTargetId: FOUNDER_LINKEDIN_TARGET_ID,
    status: "posted",
    postedAt: now,
    postedManuallyAt: now,
    postUrl: topPost.postUrl,
    postedUrl: topPost.postUrl,
    platformPostId,
    manualNotes: [
      "Backfilled from LinkedIn Aggregate Analytics import. Incoming Excel URL/metrics are source of truth.",
    ],
  };

  return {
    publishedPostId,
    record: {
      ...record,
      contentPackage: {
        ...record.contentPackage,
        status: "posted",
        updatedAt: now,
      },
      platformDrafts: [
        ...record.platformDrafts.filter((item) => item.id !== draftId),
        draft,
      ],
      publishedPosts: [
        ...record.publishedPosts.filter((item) => item.id !== publishedPostId),
        publishedPost,
      ],
    },
  };
}

function asNonNegativeNumber(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/,/g, "").trim())
        : Number.NaN;

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.round(number);
}

export function validateLinkedInAnalyticsImportPayload(
  payload: unknown,
):
  | { ok: true; value: LinkedInAnalyticsImportPayload }
  | { ok: false; error: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Import payload must be an object." };
  }

  const record = payload as Record<string, unknown>;
  const discovery =
    record.discovery && typeof record.discovery === "object"
      ? (record.discovery as Record<string, unknown>)
      : null;
  const followers =
    record.followers && typeof record.followers === "object"
      ? (record.followers as Record<string, unknown>)
      : null;

  if (!discovery || !followers) {
    return {
      ok: false,
      error: "Import payload must include discovery and followers summaries.",
    };
  }

  if (!Array.isArray(record.topPosts)) {
    return { ok: false, error: "Import payload topPosts must be an array." };
  }

  if (record.topPosts.length > 50) {
    return { ok: false, error: "Import payload topPosts exceeds 50 rows." };
  }

  const topPosts: LinkedInImportedTopPost[] = [];

  for (const entry of record.topPosts) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, error: "Each topPosts entry must be an object." };
    }

    const row = entry as Record<string, unknown>;
    const postUrl = typeof row.postUrl === "string" ? row.postUrl.trim() : "";

    if (!postUrl.startsWith("https://www.linkedin.com/")) {
      return {
        ok: false,
        error: "topPosts URLs must be https://www.linkedin.com/ links.",
      };
    }

    topPosts.push({
      engagements: asNonNegativeNumber(row.engagements),
      impressions: asNonNegativeNumber(row.impressions),
      postUrl,
    });
  }

  return {
    ok: true,
    value: {
      discovery: {
        impressions: asNonNegativeNumber(discovery.impressions),
        membersReached: asNonNegativeNumber(discovery.membersReached),
        periodLabel:
          typeof discovery.periodLabel === "string"
            ? discovery.periodLabel.trim().slice(0, 80)
            : "",
      },
      followers: {
        newFollowers: asNonNegativeNumber(followers.newFollowers),
        totalFollowers: asNonNegativeNumber(followers.totalFollowers),
      },
      topPosts,
      totalEngagements: asNonNegativeNumber(record.totalEngagements),
    },
  };
}

export async function applyLinkedInAnalyticsImport(
  payload: LinkedInAnalyticsImportPayload,
): Promise<LinkedInAnalyticsImportResult> {
  const adapter = createDatabaseOpsPersistenceAdapter();
  const loaded = await adapter.loadContentPackages();
  let records = loaded.contentPackages;
  const matched: LinkedInAnalyticsImportResult["matched"] = [];
  const unmatchedUrls: string[] = [];
  const touchedPackageIds = new Set<string>();
  let backfilledCount = 0;

  // Prefer the stronger signal when the same URL appears in both TOP POSTS lists.
  const mergedByUrl = new Map<string, LinkedInImportedTopPost>();

  for (const topPost of payload.topPosts) {
    const key = normalizeLinkedInUrl(topPost.postUrl);
    const existing = mergedByUrl.get(key);

    if (!existing) {
      mergedByUrl.set(key, topPost);
      continue;
    }

    mergedByUrl.set(key, {
      engagements: Math.max(existing.engagements, topPost.engagements),
      impressions: Math.max(existing.impressions, topPost.impressions),
      postUrl: existing.postUrl,
    });
  }

  for (const topPost of mergedByUrl.values()) {
    let match = findMatchingPublishedPost(records, topPost.postUrl);

    if (!match) {
      const ensured = ensureLinkedInImportBackfillPackage(
        records,
        payload.discovery.periodLabel,
      );
      records = ensured.records;

      const backfillPackage = records.find(
        (record) => record.contentPackage.id === ensured.packageId,
      );

      if (!backfillPackage) {
        unmatchedUrls.push(topPost.postUrl);
        continue;
      }

      const backfilled = backfillLinkedInPublishedPost(
        backfillPackage,
        topPost,
      );

      if (!backfilled) {
        unmatchedUrls.push(topPost.postUrl);
        continue;
      }

      records = records.map((record) =>
        record.contentPackage.id === ensured.packageId
          ? backfilled.record
          : record,
      );
      backfilledCount += 1;
      match = {
        post: backfilled.record.publishedPosts.find(
          (post) => post.id === backfilled.publishedPostId,
        )!,
        record: backfilled.record,
      };
    }

    const packageRecord =
      records.find(
        (record) =>
          record.contentPackage.id === match!.record.contentPackage.id,
      ) ?? match.record;

    const next = upsertLinkedInImportSnapshot(
      packageRecord,
      match.post.id,
      {
        engagements: topPost.engagements,
        impressions: topPost.impressions,
        periodLabel: payload.discovery.periodLabel,
        postUrl: topPost.postUrl,
      },
    );

    records = records.map((record) =>
      record.contentPackage.id === packageRecord.contentPackage.id
        ? next
        : record,
    );
    touchedPackageIds.add(packageRecord.contentPackage.id);
    matched.push({
      engagements: topPost.engagements,
      impressions: topPost.impressions,
      postUrl: topPost.postUrl,
      publishedPostId: match.post.id,
    });
  }

  if (touchedPackageIds.size > 0) {
    // saveContentPackages prunes rows not present in the payload — always pass
    // the full recomposed set after in-memory mutations.
    await adapter.saveContentPackages(records);
  }

  return {
    backfilledCount,
    matched,
    matchedCount: matched.length,
    periodSummary: {
      impressions: payload.discovery.impressions,
      membersReached: payload.discovery.membersReached,
      newFollowers: payload.followers.newFollowers,
      periodLabel: payload.discovery.periodLabel,
      totalEngagements: payload.totalEngagements,
      totalFollowers: payload.followers.totalFollowers,
    },
    unmatchedCount: unmatchedUrls.length,
    unmatchedUrls,
    updatedPackageCount: touchedPackageIds.size,
  };
}
