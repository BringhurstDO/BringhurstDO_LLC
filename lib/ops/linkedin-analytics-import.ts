import "server-only";

import { createDatabaseOpsPersistenceAdapter } from "@/lib/ops/persistence-db";
import type {
  OpsContentPackageRecord,
  PerformanceSnapshot,
} from "@/lib/ops/types";

function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

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

function extractLinkedInShareId(value: string) {
  const normalized = normalizeLinkedInUrl(value);
  const match = normalized.match(/-([a-z0-9_-]{6,})$/i) ??
    normalized.match(/\/(?:posts|activity|feed\/update)\/[^/]*?([a-z0-9_-]{8,})/i);

  return match?.[1]?.toLowerCase() ?? "";
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
  const shareId = extractLinkedInShareId(importUrl);

  for (const record of records) {
    for (const post of record.publishedPosts) {
      if (post.platform !== "LinkedIn" || post.status !== "posted") {
        continue;
      }

      const urls = publishedPostUrls(post);

      if (urls.some((url) => url === normalizedImport || url.includes(normalizedImport) || normalizedImport.includes(url))) {
        return { post, record };
      }

      if (
        shareId &&
        urls.some((url) => url.includes(shareId))
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
    performanceSnapshots: [
      ...record.performanceSnapshots.filter(
        (item) =>
          !(
            item.publishedPostId === publishedPostId &&
            item.source === "linkedin-import"
          ),
      ),
      snapshot,
    ],
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
    const match = findMatchingPublishedPost(records, topPost.postUrl);

    if (!match) {
      unmatchedUrls.push(topPost.postUrl);
      continue;
    }

    const next = upsertLinkedInImportSnapshot(match.record, match.post.id, {
      engagements: topPost.engagements,
      impressions: topPost.impressions,
      periodLabel: payload.discovery.periodLabel,
      postUrl: topPost.postUrl,
    });

    records = records.map((record) =>
      record.contentPackage.id === match.record.contentPackage.id ? next : record,
    );
    touchedPackageIds.add(match.record.contentPackage.id);
    matched.push({
      engagements: topPost.engagements,
      impressions: topPost.impressions,
      postUrl: topPost.postUrl,
      publishedPostId: match.post.id,
    });
  }

  if (touchedPackageIds.size > 0) {
    const toSave = records.filter((record) =>
      touchedPackageIds.has(record.contentPackage.id),
    );
    await adapter.saveContentPackages(toSave);
  }

  return {
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
