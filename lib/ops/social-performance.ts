import type {
  OpsContentPackageRecord,
  PerformanceSnapshot,
  PublicationPlatform,
} from "@/lib/ops/types";

const snapshotSourcePriority: Record<PerformanceSnapshot["source"], number> = {
  "meta-api-weekly": 3,
  "x-api-weekly": 3,
  "linkedin-import": 2,
  manual: 1,
};

/**
 * Incoming platform/import metrics are source of truth for a published post.
 * Replace same-source rows and drop manual placeholders when an ingest source arrives.
 */
export function replacePerformanceSnapshot(
  snapshots: PerformanceSnapshot[],
  next: PerformanceSnapshot,
): PerformanceSnapshot[] {
  const ingestOverwritesManual = next.source !== "manual";

  return [
    ...snapshots.filter((item) => {
      if (item.publishedPostId !== next.publishedPostId) {
        return true;
      }

      if (item.source === next.source) {
        return false;
      }

      if (ingestOverwritesManual && item.source === "manual") {
        return false;
      }

      return true;
    }),
    next,
  ];
}

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

      if (
        post.platform !== "X" &&
        post.platform !== "LinkedIn" &&
        post.platform !== "Facebook" &&
        post.platform !== "Instagram"
      ) {
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

const OPS_SCORECARD_TIME_ZONE = "America/New_York";

export type WeeklySocialPlatformBreakdown = {
  comments: number;
  impressions: number;
  platform: PublicationPlatform;
  posts: number;
  postsWithMetrics: number;
  reactions: number;
  saves: number;
};

export type WeeklySocialScorecard = {
  byPlatform: WeeklySocialPlatformBreakdown[];
  comments: number;
  impressions: number;
  lastCapturedAt: string | null;
  posts: number;
  postsWithMetrics: number;
  reactions: number;
  saves: number;
  sources: PerformanceSnapshot["source"][];
  weekEnd: string;
  weekStart: string;
};

function zonedCalendarDate(
  date: Date,
  timeZone = OPS_SCORECARD_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseCalendarDate(value: string): { day: number; month: number; year: number } | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function addCalendarDays(ymd: string, days: number): string {
  const parsed = parseCalendarDate(ymd);
  if (!parsed) {
    return ymd;
  }

  const next = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days, 12));
  return next.toISOString().slice(0, 10);
}

/** Monday=0 … Sunday=6 for a YYYY-MM-DD calendar date. */
function mondayBasedWeekday(ymd: string): number {
  const parsed = parseCalendarDate(ymd);
  if (!parsed) {
    return 0;
  }

  const weekday = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12),
  ).getUTCDay();
  return weekday === 0 ? 6 : weekday - 1;
}

export function resolveOpsWeekBounds(
  reference: Date = new Date(),
  weekStart?: string,
  weekEnd?: string,
): { weekEnd: string; weekStart: string } {
  if (weekStart && weekEnd) {
    return { weekStart, weekEnd };
  }

  const today = zonedCalendarDate(reference);
  const start = addCalendarDays(today, -mondayBasedWeekday(today));
  return {
    weekStart: start,
    weekEnd: addCalendarDays(start, 6),
  };
}

function postedCalendarDate(postedAt: string | null): string | null {
  if (!postedAt?.trim()) {
    return null;
  }

  if (parseCalendarDate(postedAt.trim())) {
    return postedAt.trim();
  }

  const date = new Date(postedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return zonedCalendarDate(date);
}

function emptyPlatformBreakdown(
  platform: PublicationPlatform,
): WeeklySocialPlatformBreakdown {
  return {
    comments: 0,
    impressions: 0,
    platform,
    posts: 0,
    postsWithMetrics: 0,
    reactions: 0,
    saves: 0,
  };
}

/**
 * Weekly social rollup for scorecard cards: posts published in the Ops week
 * (Mon–Sun, America/New_York) plus latest snapshot engagement totals.
 */
export function buildWeeklySocialScorecard(
  records: OpsContentPackageRecord[],
  weekStart?: string,
  weekEnd?: string,
  reference: Date = new Date(),
): WeeklySocialScorecard {
  const bounds = resolveOpsWeekBounds(reference, weekStart, weekEnd);
  const rows = buildSocialPerformanceRows(records).filter((row) => {
    const postedOn = postedCalendarDate(row.postedAt);
    return (
      postedOn !== null &&
      postedOn >= bounds.weekStart &&
      postedOn <= bounds.weekEnd
    );
  });

  const byPlatformMap = new Map<PublicationPlatform, WeeklySocialPlatformBreakdown>();
  const sources = new Set<PerformanceSnapshot["source"]>();
  let comments = 0;
  let impressions = 0;
  let reactions = 0;
  let saves = 0;
  let postsWithMetrics = 0;
  const capturedAts: string[] = [];

  for (const row of rows) {
    const bucket =
      byPlatformMap.get(row.platform) ?? emptyPlatformBreakdown(row.platform);
    bucket.posts += 1;

    const hasMetrics =
      row.impressions !== null ||
      row.reactions !== null ||
      row.comments !== null ||
      row.saves !== null;

    if (hasMetrics) {
      postsWithMetrics += 1;
      bucket.postsWithMetrics += 1;
      impressions += row.impressions ?? 0;
      reactions += row.reactions ?? 0;
      comments += row.comments ?? 0;
      saves += row.saves ?? 0;
      bucket.impressions += row.impressions ?? 0;
      bucket.reactions += row.reactions ?? 0;
      bucket.comments += row.comments ?? 0;
      bucket.saves += row.saves ?? 0;
      if (row.source) {
        sources.add(row.source);
      }
      if (row.capturedAt) {
        capturedAts.push(row.capturedAt);
      }
    }

    byPlatformMap.set(row.platform, bucket);
  }

  return {
    byPlatform: [...byPlatformMap.values()].sort((left, right) =>
      left.platform.localeCompare(right.platform),
    ),
    comments,
    impressions,
    lastCapturedAt: capturedAts.sort().at(-1) ?? null,
    posts: rows.length,
    postsWithMetrics,
    reactions,
    saves,
    sources: [...sources].sort(),
    weekEnd: bounds.weekEnd,
    weekStart: bounds.weekStart,
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
