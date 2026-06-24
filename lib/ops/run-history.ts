import "server-only";

import { neon } from "@neondatabase/serverless";

import { databasePersistenceConfigured } from "@/lib/ops/persistence-db";
import type {
  OpsAiRunRecord,
  OpsAutopublishRunRecord,
  OpsTone,
  SocialPublishLogRecord,
} from "@/lib/ops/types";

type JsonRow<T> = {
  data: T;
};

export type OpsRunHistoryItem = {
  id: string;
  createdAt: string;
  details: string[];
  label: string;
  status: string;
  summary: string;
  tone: OpsTone;
  type: "ai" | "autopublish" | "social-publish";
};

export type OpsRunHistorySummary = {
  counts: Record<OpsTone, number>;
  error: string | null;
  generatedAt: string;
  items: OpsRunHistoryItem[];
  limit: number;
  source: "database" | "database-error" | "database-not-configured";
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

function queryClient() {
  return neon(getDatabaseUrl());
}

function itemCounts(items: OpsRunHistoryItem[]) {
  return items.reduce(
    (counts, item) => ({
      ...counts,
      [item.tone]: counts[item.tone] + 1,
    }),
    { blocked: 0, good: 0, neutral: 0, watch: 0 } satisfies Record<OpsTone, number>,
  );
}

function autopublishTone(status: OpsAutopublishRunRecord["status"]): OpsTone {
  if (status === "success") {
    return "good";
  }

  if (status === "partial") {
    return "watch";
  }

  return "blocked";
}

function aiTone(status: OpsAiRunRecord["status"]): OpsTone {
  if (status === "success") {
    return "good";
  }

  if (status === "blocked_input" || status === "blocked_output") {
    return "watch";
  }

  return "blocked";
}

function socialTone(status: SocialPublishLogRecord["status"]): OpsTone {
  if (status === "success") {
    return "good";
  }

  if (status === "blocked") {
    return "watch";
  }

  return "blocked";
}

function mapAutopublishRun(record: OpsAutopublishRunRecord): OpsRunHistoryItem {
  return {
    createdAt: record.createdAt,
    details: [
      `Published ${record.publishedCount}`,
      `Skipped ${record.skippedCount}`,
      `Errors ${record.errorCount}`,
      `Trigger ${record.trigger}`,
    ],
    id: record.id,
    label: "Autopublish run",
    status: record.status,
    summary: `${record.draftResults.length} draft result${
      record.draftResults.length === 1 ? "" : "s"
    } for ${record.runDate}.`,
    tone: autopublishTone(record.status),
    type: "autopublish",
  };
}

function mapAiRun(record: OpsAiRunRecord): OpsRunHistoryItem {
  return {
    createdAt: record.createdAt,
    details: [
      `${record.provider} / ${record.model}`,
      `${record.platformCount} platform${record.platformCount === 1 ? "" : "s"}`,
      `Input ${record.inputSafetyResult}`,
      `Output ${record.outputSafetyResult}`,
      record.totalTokens ? `${record.totalTokens} tokens` : "Tokens not reported",
    ],
    id: record.id,
    label: "AI draft run",
    status: record.status,
    summary:
      record.safetyIssues.length > 0
        ? `${record.safetyIssues.length} safety issue${
            record.safetyIssues.length === 1 ? "" : "s"
          } recorded.`
        : "Metadata-only AI generation record.",
    tone: aiTone(record.status),
    type: "ai",
  };
}

function mapSocialPublishRun(record: SocialPublishLogRecord): OpsRunHistoryItem {
  return {
    createdAt: record.createdAt,
    details: [
      record.platform,
      `Package ${record.contentPackageId}`,
      `Draft ${record.platformDraftId}`,
      record.postUrl ? "Post URL captured" : "No post URL",
    ],
    id: record.id,
    label: "Social publish attempt",
    status: record.status,
    summary: `${record.platform} publish audit row for ${record.accountId}.`,
    tone: socialTone(record.status),
    type: "social-publish",
  };
}

async function readRows<T>(tableName: string, limit: number) {
  const sql = queryClient();

  return sql.query(
    `select data from ${tableName} order by created_at desc limit $1`,
    [limit],
  ) as unknown as Promise<JsonRow<T>[]>;
}

export async function loadOpsRunHistory(
  limit = 8,
): Promise<OpsRunHistorySummary> {
  if (!databasePersistenceConfigured()) {
    return {
      counts: { blocked: 0, good: 0, neutral: 0, watch: 0 },
      error: null,
      generatedAt: new Date().toISOString(),
      items: [],
      limit,
      source: "database-not-configured",
    };
  }

  try {
    const [autopublishRows, aiRows, socialRows] = await Promise.all([
      readRows<OpsAutopublishRunRecord>("ops_autopublish_runs", limit),
      readRows<OpsAiRunRecord>("ops_ai_runs", limit),
      readRows<SocialPublishLogRecord>("ops_social_publish_log", limit),
    ]);
    const items = [
      ...autopublishRows.map((row) => mapAutopublishRun(row.data)),
      ...aiRows.map((row) => mapAiRun(row.data)),
      ...socialRows.map((row) => mapSocialPublishRun(row.data)),
    ]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);

    return {
      counts: itemCounts(items),
      error: null,
      generatedAt: new Date().toISOString(),
      items,
      limit,
      source: "database",
    };
  } catch (error) {
    return {
      counts: { blocked: 0, good: 0, neutral: 0, watch: 0 },
      error:
        error instanceof Error
          ? error.message
          : "Unable to load recent Ops runs.",
      generatedAt: new Date().toISOString(),
      items: [],
      limit,
      source: "database-error",
    };
  }
}
