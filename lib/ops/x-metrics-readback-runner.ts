import "server-only";

import { createDatabaseOpsPersistenceAdapter } from "@/lib/ops/persistence-db";
import { opsDashboardData } from "@/lib/ops/mock-data";
import { getReadyXConnection } from "@/lib/ops/x-connection";
import { findXAccount, resolveXConfig } from "@/lib/ops/x-config";
import { lookupXPostMetrics } from "@/lib/ops/x-client";
import type {
  OpsContentPackageRecord,
  PerformanceSnapshot,
  PublicationTarget,
} from "@/lib/ops/types";

function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function daysAgoIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function buildTargetMaps(publicationTargets: PublicationTarget[]) {
  const accountIdByTargetId = new Map<string, string>();

  for (const target of publicationTargets) {
    accountIdByTargetId.set(target.id, target.accountId);
  }

  return { accountIdByTargetId };
}

function recentXPosts(records: OpsContentPackageRecord[], lookbackDays: number) {
  const cutoff = daysAgoIso(lookbackDays);
  const posts: Array<{
    accountId: string;
    contentPackageId: string;
    platformPostId: string;
    publishedPostId: string;
  }> = [];
  const { accountIdByTargetId } = buildTargetMaps(opsDashboardData.publicationTargets);

  for (const record of records) {
    for (const post of record.publishedPosts) {
      if (
        post.platform !== "X" ||
        post.status !== "posted" ||
        !post.platformPostId
      ) {
        continue;
      }

      const postedAt = post.postedAt ?? post.postedManuallyAt ?? "";

      if (postedAt && postedAt < cutoff) {
        continue;
      }

      const accountId = accountIdByTargetId.get(post.publicationTargetId);

      if (!accountId) {
        continue;
      }

      posts.push({
        accountId,
        contentPackageId: record.contentPackage.id,
        platformPostId: post.platformPostId,
        publishedPostId: post.id,
      });
    }
  }

  return posts;
}

function upsertSnapshot(
  record: OpsContentPackageRecord,
  publishedPostId: string,
  metric: {
    bookmarkCount: number;
    impressionCount: number;
    likeCount: number;
    quoteCount: number;
    replyCount: number;
    retweetCount: number;
  },
) {
  const capturedAt = new Date().toISOString();
  const reactions =
    metric.likeCount + metric.retweetCount + metric.quoteCount;
  const snapshot: PerformanceSnapshot = {
    capturedAt,
    clicks: "0",
    comments: String(metric.replyCount),
    id: `performance-x-${publishedPostId}-${nowId()}`,
    impressions: String(metric.impressionCount),
    notes: [
      "Weekly X API readback for Ops-published post id.",
      "Clicks are not collected from X public metrics.",
    ],
    numericMetrics: {
      clicks: 0,
      comments: metric.replyCount,
      impressions: metric.impressionCount,
      reactions,
      saves: metric.bookmarkCount,
    },
    publishedPostId,
    reactions: String(reactions),
    saves: String(metric.bookmarkCount),
    source: "x-api-weekly",
  };

  return {
    ...record,
    performanceSnapshots: [
      ...record.performanceSnapshots.filter(
        (item) =>
          !(
            item.publishedPostId === publishedPostId &&
            item.source === "x-api-weekly"
          ),
      ),
      snapshot,
    ],
  };
}

export async function runScheduledXMetricsReadback({
  lookbackDays = 14,
}: { lookbackDays?: number } = {}) {
  const config = resolveXConfig();

  if (!config.ok) {
    throw new Error(config.reason);
  }

  const adapter = createDatabaseOpsPersistenceAdapter();
  const loaded = await adapter.loadContentPackages();
  let records = loaded.contentPackages;
  const candidates = recentXPosts(records, lookbackDays);
  let updatedCount = 0;
  const errors: string[] = [];

  const byAccountId = new Map<string, typeof candidates>();

  for (const candidate of candidates) {
    const bucket = byAccountId.get(candidate.accountId) ?? [];
    bucket.push(candidate);
    byAccountId.set(candidate.accountId, bucket);
  }

  for (const [accountId, accountPosts] of byAccountId.entries()) {
    const account = findXAccount(config.config, accountId);

    if (!account) {
      errors.push(`Unknown X account: ${accountId}`);
      continue;
    }

    const ready = await getReadyXConnection(config.config, account);

    if (!ready.ok) {
      errors.push(`${account.label}: ${ready.error.message}`);
      continue;
    }

    const metrics = await lookupXPostMetrics({
      accessToken: ready.value.accessToken,
      tweetIds: accountPosts.map((post) => post.platformPostId),
    });
    const metricsByPostId = new Map(
      metrics.map((metric) => [metric.tweetId, metric]),
    );

    for (const post of accountPosts) {
      const metric = metricsByPostId.get(post.platformPostId);

      if (!metric) {
        continue;
      }

      records = records.map((record) =>
        record.contentPackage.id === post.contentPackageId
          ? upsertSnapshot(record, post.publishedPostId, metric)
          : record,
      );
      updatedCount += 1;
    }
  }

  if (updatedCount > 0) {
    await adapter.saveContentPackages(records);
  }

  return {
    candidateCount: candidates.length,
    errorCount: errors.length,
    errors,
    lookbackDays,
    status: errors.length > 0 ? "partial" : "success",
    updatedCount,
  };
}
