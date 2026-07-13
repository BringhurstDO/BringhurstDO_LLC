import "server-only";

import {
  lookupFacebookPostInsights,
  lookupInstagramMediaInsights,
} from "@/lib/ops/meta-insights-client";
import {
  getReadyInstagramPublishConnection,
  getReadyMetaConnection,
} from "@/lib/ops/meta-connection";
import {
  findLinkedFacebookPageAccount,
  findMetaAccount,
  resolveMetaConfig,
} from "@/lib/ops/meta-config";
import { opsDashboardData } from "@/lib/ops/mock-data";
import { createDatabaseOpsPersistenceAdapter } from "@/lib/ops/persistence-db";
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

function recentMetaPosts(records: OpsContentPackageRecord[], lookbackDays: number) {
  const cutoff = daysAgoIso(lookbackDays);
  const posts: Array<{
    accountId: string;
    contentPackageId: string;
    platform: "Facebook" | "Instagram";
    platformPostId: string;
    publishedPostId: string;
  }> = [];
  const { accountIdByTargetId } = buildTargetMaps(opsDashboardData.publicationTargets);

  for (const record of records) {
    for (const post of record.publishedPosts) {
      if (
        (post.platform !== "Facebook" && post.platform !== "Instagram") ||
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
        platform: post.platform,
        platformPostId: post.platformPostId,
        publishedPostId: post.id,
      });
    }
  }

  return posts;
}

function upsertMetaSnapshot(
  record: OpsContentPackageRecord,
  publishedPostId: string,
  platform: "Facebook" | "Instagram",
  metric: {
    comments: number;
    impressions: number;
    reactions: number;
    saves: number;
  },
) {
  const capturedAt = new Date().toISOString();
  const snapshot: PerformanceSnapshot = {
    capturedAt,
    clicks: "0",
    comments: String(metric.comments),
    id: `performance-meta-${publishedPostId}-${nowId()}`,
    impressions: String(metric.impressions),
    notes: [
      `Weekly Meta API readback for Ops-published ${platform} post.`,
      "Clicks are not collected from Meta post insights in this v1.",
    ],
    numericMetrics: {
      clicks: 0,
      comments: metric.comments,
      impressions: metric.impressions,
      reactions: metric.reactions,
      saves: metric.saves,
    },
    publishedPostId,
    reactions: String(metric.reactions),
    saves: String(metric.saves),
    source: "meta-api-weekly",
  };

  return {
    ...record,
    performanceSnapshots: [
      ...record.performanceSnapshots.filter(
        (item) =>
          !(
            item.publishedPostId === publishedPostId &&
            item.source === "meta-api-weekly"
          ),
      ),
      snapshot,
    ],
  };
}

export async function runScheduledMetaMetricsReadback({
  lookbackDays = 28,
}: { lookbackDays?: number } = {}) {
  const config = resolveMetaConfig();

  if (!config.ok) {
    throw new Error(config.reason);
  }

  const adapter = createDatabaseOpsPersistenceAdapter();
  const loaded = await adapter.loadContentPackages();
  let records = loaded.contentPackages;
  const candidates = recentMetaPosts(records, lookbackDays);
  let updatedCount = 0;
  let emptyInsightCount = 0;
  const errors: string[] = [];

  for (const candidate of candidates) {
    const account = findMetaAccount(config.config, candidate.accountId);

    if (!account) {
      errors.push(`Unknown Meta account: ${candidate.accountId}`);
      continue;
    }

    try {
      let metrics;

      if (candidate.platform === "Instagram") {
        if (
          account.kind !== "instagram_business" ||
          !account.instagramBusinessAccountId
        ) {
          errors.push(
            `${account.label}: Instagram insights need an instagram_business account config.`,
          );
          continue;
        }

        const ready = await getReadyInstagramPublishConnection(
          config.config,
          account,
        );

        if (!ready.ok) {
          errors.push(`${account.label}: ${ready.error.message}`);
          continue;
        }

        metrics = await lookupInstagramMediaInsights({
          accessToken: ready.value.accessToken,
          igMediaId: candidate.platformPostId,
        });
      } else {
        const pageAccount =
          account.kind === "facebook_page"
            ? account
            : findLinkedFacebookPageAccount(config.config, account);

        if (!pageAccount) {
          errors.push(
            `${account.label}: Facebook insights need a linked facebook_page account.`,
          );
          continue;
        }

        const ready = await getReadyMetaConnection(pageAccount);

        if (!ready.ok) {
          errors.push(`${pageAccount.label}: ${ready.error.message}`);
          continue;
        }

        metrics = await lookupFacebookPostInsights({
          accessToken: ready.value.accessToken,
          pagePostId: candidate.platformPostId,
        });
      }

      if (
        metrics.impressions === 0 &&
        metrics.reactions === 0 &&
        metrics.comments === 0 &&
        metrics.saves === 0
      ) {
        emptyInsightCount += 1;
      }

      records = records.map((record) =>
        record.contentPackage.id === candidate.contentPackageId
          ? upsertMetaSnapshot(
              record,
              candidate.publishedPostId,
              candidate.platform,
              metrics,
            )
          : record,
      );
      updatedCount += 1;
    } catch (error) {
      errors.push(
        `${candidate.platform} ${candidate.platformPostId}: ${
          error instanceof Error ? error.message : "insights failed"
        }`,
      );
    }
  }

  if (updatedCount > 0) {
    await adapter.saveContentPackages(records);
  }

  return {
    candidateCount: candidates.length,
    emptyInsightCount,
    errorCount: errors.length,
    errors,
    lookbackDays,
    status: errors.length > 0 ? "partial" : "success",
    updatedCount,
  };
}
