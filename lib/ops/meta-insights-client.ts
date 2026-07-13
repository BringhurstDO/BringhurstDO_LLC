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

async function fetchInsights(input: {
  accessToken: string;
  metric: string[];
  objectId: string;
  period?: string;
}) {
  const url = new URL(`${META_GRAPH_URL}/${input.objectId}/insights`);
  url.searchParams.set("metric", input.metric.join(","));
  url.searchParams.set("access_token", input.accessToken);

  if (input.period) {
    url.searchParams.set("period", input.period);
  }

  const response = await fetch(url.toString(), { method: "GET" });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Meta insights failed (${response.status}): ${text.slice(0, 400)}`,
    );
  }

  const json = JSON.parse(text) as { data?: InsightsMetricRow[] };
  return Array.isArray(json.data) ? json.data : [];
}

export type MetaPostInsightMetrics = {
  comments: number;
  impressions: number;
  reactions: number;
  saves: number;
};

/**
 * Facebook Page post insights. Prefer view-based metrics; fall back to legacy
 * impression/reaction metric names while Graph still serves them.
 */
export async function lookupFacebookPostInsights(input: {
  accessToken: string;
  pagePostId: string;
}): Promise<MetaPostInsightMetrics> {
  const preferredMetrics = [
    "post_media_view",
    "post_total_media_view_unique",
    "post_impressions",
    "post_impressions_unique",
    "post_reactions_by_type_total",
    "post_reactions_like_total",
    "post_activity_by_action_type",
  ];

  let rows: InsightsMetricRow[] = [];

  try {
    rows = await fetchInsights({
      accessToken: input.accessToken,
      metric: preferredMetrics,
      objectId: input.pagePostId,
      period: "lifetime",
    });
  } catch {
    // Retry a smaller legacy set — App Review / deprecations vary by token.
    rows = await fetchInsights({
      accessToken: input.accessToken,
      metric: [
        "post_impressions",
        "post_reactions_by_type_total",
        "post_activity_by_action_type",
      ],
      objectId: input.pagePostId,
      period: "lifetime",
    });
  }

  const impressions = metricValue(rows, [
    "post_media_view",
    "post_impressions",
    "post_total_media_view_unique",
    "post_impressions_unique",
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
  const metrics = [
    "views",
    "reach",
    "impressions",
    "likes",
    "comments",
    "saved",
    "total_interactions",
  ];

  let rows: InsightsMetricRow[] = [];

  try {
    rows = await fetchInsights({
      accessToken: input.accessToken,
      metric: metrics,
      objectId: input.igMediaId,
    });
  } catch {
    rows = await fetchInsights({
      accessToken: input.accessToken,
      metric: ["impressions", "reach", "likes", "comments", "saved"],
      objectId: input.igMediaId,
    });
  }

  const impressions = metricValue(rows, ["views", "impressions", "reach"]);
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
