import type {
  OpsContentPackageRecord,
  PerformanceSnapshot,
  PublicationPlatform,
} from "@/lib/ops/types";

const snapshotSourcePriority: Record<PerformanceSnapshot["source"], number> = {
  "x-api-weekly": 2,
  manual: 1,
};

export function findPublishedPostForDraft(
  record: OpsContentPackageRecord,
  draftId: string,
) {
  return record.publishedPosts.find((post) => post.platformDraftId === draftId);
}

export function resolveLatestPerformanceSnapshot(
  record: OpsContentPackageRecord,
  publishedPostId: string,
): PerformanceSnapshot | null {
  const snapshots = record.performanceSnapshots.filter(
    (snapshot) => snapshot.publishedPostId === publishedPostId,
  );

  if (snapshots.length === 0) {
    return null;
  }

  return [...snapshots].sort((left, right) => {
    const priorityDiff =
      snapshotSourcePriority[right.source] - snapshotSourcePriority[left.source];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return right.capturedAt.localeCompare(left.capturedAt);
  })[0];
}

export type SocialPerformanceRow = {
  accountName: string;
  bodyPreview: string;
  capturedAt: string | null;
  comments: number | null;
  contentPackageId: string;
  draftId: string;
  impressions: number | null;
  packageTitle: string;
  platform: PublicationPlatform;
  platformPostId: string | null;
  postedAt: string | null;
  postedUrl: string;
  publishedPostId: string;
  reactions: number | null;
  saves: number | null;
  source: PerformanceSnapshot["source"] | null;
  title: string;
};

export function buildSocialPerformanceRows(
  records: OpsContentPackageRecord[],
): SocialPerformanceRow[] {
  const rows: SocialPerformanceRow[] = [];

  for (const record of records) {
    for (const draft of record.platformDrafts) {
      const post = findPublishedPostForDraft(record, draft.id);

      if (!post || post.status !== "posted") {
        continue;
      }

      if (post.platform !== "X" && post.platform !== "LinkedIn") {
        continue;
      }

      const snapshot = resolveLatestPerformanceSnapshot(record, post.id);
      const bodyPreview =
        draft.body.length > 120
          ? `${draft.body.slice(0, 120).trim()}…`
          : draft.body;

      rows.push({
        accountName: draft.accountName,
        bodyPreview,
        capturedAt: snapshot?.capturedAt ?? null,
        comments: snapshot?.numericMetrics.comments ?? null,
        contentPackageId: record.contentPackage.id,
        draftId: draft.id,
        impressions: snapshot?.numericMetrics.impressions ?? null,
        packageTitle: record.contentPackage.title,
        platform: post.platform,
        platformPostId: post.platformPostId ?? null,
        postedAt: post.postedAt ?? post.postedManuallyAt ?? null,
        postedUrl: post.postedUrl ?? post.postUrl ?? "",
        publishedPostId: post.id,
        reactions: snapshot?.numericMetrics.reactions ?? null,
        saves: snapshot?.numericMetrics.saves ?? null,
        source: snapshot?.source ?? null,
        title: draft.title,
      });
    }
  }

  return rows.sort((left, right) =>
    (right.postedAt ?? "").localeCompare(left.postedAt ?? ""),
  );
}

export type XPerformanceSummary = {
  lastCapturedAt: string | null;
  postedCount: number;
  totalImpressions: number;
  totalReactions: number;
  withMetricsCount: number;
};

export function buildXPerformanceSummary(
  records: OpsContentPackageRecord[],
): XPerformanceSummary {
  const rows = buildSocialPerformanceRows(records).filter(
    (row) => row.platform === "X",
  );
  const withMetrics = rows.filter((row) => row.impressions !== null);

  return {
    lastCapturedAt:
      withMetrics
        .map((row) => row.capturedAt)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null,
    postedCount: rows.length,
    totalImpressions: withMetrics.reduce(
      (sum, row) => sum + (row.impressions ?? 0),
      0,
    ),
    totalReactions: withMetrics.reduce(
      (sum, row) => sum + (row.reactions ?? 0),
      0,
    ),
    withMetricsCount: withMetrics.length,
  };
}

export function formatPerformanceCapturedAt(capturedAt: string | null) {
  if (!capturedAt) {
    return "Not captured yet";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/New_York",
    }).format(new Date(capturedAt));
  } catch {
    return capturedAt;
  }
}
