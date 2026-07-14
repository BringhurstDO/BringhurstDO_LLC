import "server-only";

import { META_GRAPH_URL } from "@/lib/ops/meta-client";

type InsightsMetricRow = {
  name?: string;
  period?: string;
  values?: Array<{ value?: number | Record<string, number> }>;
};

function metricValue(rows: InsightsMetricRow[], names: string[]) {
  for (const name of names) {
    const row = rows.find((item) => item.name === name);
    const raw = row?.values?.[0]?.value;

    if (typeof raw === "number" && Number.isFinite(raw)) {
      return Math.max(0, Math.round(raw));
    }

    if (raw && typeof raw === "object") {
      const sum = Object.values(raw).reduce(
        (total, value) => total + (typeof value === "number" ? value : 0),
        0,
      );

      if (Number.isFinite(sum)) {
        return Math.max(0, Math.round(sum));
      }
    }
  }

  return 0;
}

/**
 * Fetch one metric at a time. Graph rejects the entire batched request when any
 * metric name is deprecated/invalid (common after the June 2026 Page Insights
 * migration away from post_impressions*).
 */
async function fetchInsightMetric(input: {
  accessToken: string;
  metric: string;
  objectId: string;
  period?: string;
}): Promise<InsightsMetricRow | null> {
  const url = new URL(`${META_GRAPH_URL}/${input.objectId}/insights`);
  url.searchParams.set("metric", input.metric);
  url.searchParams.set("access_token", input.accessToken);

  if (input.period) {
    url.searchParams.set("period", input.period);
  }

  const response = await fetch(url.toString(), { method: "GET" });
  const text = await response.text();

  if (!response.ok) {
    // Permission / object errors should surface to the caller.
    if (
      text.includes("does not have permission") ||
      text.includes("Unsupported get request") ||
      text.includes("error_subcode\":33")
    ) {
      throw new Error(
        `Meta insights failed (${response.status}): ${text.slice(0, 400)}`,
      );
    }

    // Invalid/deprecated metric names are skipped so others can still load.
    return null;
  }

  const json = JSON.parse(text) as { data?: InsightsMetricRow[] };
  const row = Array.isArray(json.data) ? json.data[0] : null;
  return row ?? null;
}

async function fetchInsightMetrics(input: {
  accessToken: string;
  metrics: string[];
  objectId: string;
  period?: string;
}) {
  const rows: InsightsMetricRow[] = [];
  let hardError: Error | null = null;

  for (const metric of input.metrics) {
    try {
      const row = await fetchInsightMetric({
        accessToken: input.accessToken,
        metric,
        objectId: input.objectId,
        period: input.period,
      });

      if (row) {
        rows.push(row);
      }
    } catch (error) {
      hardError =
        error instanceof Error
          ? error
          : new Error("Meta insights request failed.");
      break;
    }
  }

  if (hardError && rows.length === 0) {
    throw hardError;
  }

  return rows;
}

export type MetaPostInsightMetrics = {
  comments: number;
  impressions: number;
  reactions: number;
  saves: number;
};

/**
 * Facebook Page post insights using post-June-2026 media-view metrics.
 * Intentionally omits deprecated post_impressions* names (Graph returns
 * "The value must be a valid insights metric" for those).
 */
export async function lookupFacebookPostInsights(input: {
  accessToken: string;
  pagePostId: string;
}): Promise<MetaPostInsightMetrics> {
  const rows = await fetchInsightMetrics({
    accessToken: input.accessToken,
    metrics: [
      "post_media_view",
      "post_total_media_view_unique",
      "post_reactions_by_type_total",
      "post_reactions_like_total",
      "post_activity_by_action_type",
    ],
    objectId: input.pagePostId,
    period: "lifetime",
  });

  const impressions = metricValue(rows, [
    "post_media_view",
    "post_total_media_view_unique",
  ]);
  const reactions = metricValue(rows, [
    "post_reactions_by_type_total",
    "post_reactions_like_total",
  ]);
  const activity = rows.find((row) => row.name === "post_activity_by_action_type");
  const activityValue = activity?.values?.[0]?.value;
  const comments =
    activityValue && typeof activityValue === "object"
      ? Math.max(0, Math.round(Number(activityValue.comment ?? 0)))
      : 0;

  return {
    comments,
    impressions,
    reactions,
    saves: 0,
  };
}

/**
 * Instagram media insights for a published IG media id.
 */
export async function lookupInstagramMediaInsights(input: {
  accessToken: string;
  igMediaId: string;
}): Promise<MetaPostInsightMetrics> {
  // Prefer current IG metric names; older impression aliases are tried last.
  const rows = await fetchInsightMetrics({
    accessToken: input.accessToken,
    metrics: [
      "views",
      "reach",
      "total_interactions",
      "likes",
      "comments",
      "saved",
      "impressions",
    ],
    objectId: input.igMediaId,
  });

  const impressions = metricValue(rows, ["views", "reach", "impressions"]);
  const reactions = metricValue(rows, ["likes", "total_interactions"]);
  const comments = metricValue(rows, ["comments"]);
  const saves = metricValue(rows, ["saved"]);

  return {
    comments,
    impressions,
    reactions,
    saves,
  };
}
