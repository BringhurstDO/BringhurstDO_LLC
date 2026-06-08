import { collectMetadataOnlyIssues } from "@/lib/ops/safety";
import type {
  ManualMetricSource,
  OpsProjectId,
  OpsTone,
  WeeklyScorecardMetricId,
} from "@/lib/ops/types";

export const manualImportKinds = [
  "draftPosts",
  "utmCampaignLinks",
  "weeklyReport",
  "projectHealthSnapshots",
  "manualMetricEntries",
] as const;

export type ManualImportKind = (typeof manualImportKinds)[number];

export type ManualImportPreviewRow = {
  detail: string;
  label: string;
  value: string;
};

export type ManualImportValidationResult =
  | {
      issues: string[];
      ok: false;
      previewRows: [];
      summary: string;
    }
  | {
      issues: [];
      ok: true;
      previewRows: ManualImportPreviewRow[];
      summary: string;
    };

const projectIds = ["syncsoap", "syncsafety", "bringhurstdo"] as const;
const channels = ["LinkedIn", "Instagram", "Facebook", "X", "Blog", "Email"] as const;
const audiences = [
  "physicians",
  "clinic owners",
  "med students",
  "EHS leaders",
  "investors",
  "general",
] as const;
const contentStatuses = [
  "idea",
  "drafted",
  "needs review",
  "approved",
  "posted",
  "archived",
] as const;
const opsTones = ["good", "watch", "blocked", "neutral"] as const;
const utmStatuses = ["mock", "ready", "archived"] as const;
const scorecardMetricIds = [
  "posts",
  "followers",
  "websiteClicks",
  "leads",
  "conversations",
  "spend",
  "revenue",
] as const;
const manualMetricSources = ["manual", "imported", "future-read-only"] as const;

function invalid(issues: string[]): ManualImportValidationResult {
  return {
    issues,
    ok: false,
    previewRows: [],
    summary: "Import rejected before rendering.",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function validateUrl(value: unknown) {
  if (!isString(value)) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: string[],
) {
  if (!isString(record[key])) {
    issues.push(`${path}.${key} must be a non-empty string.`);
  }
}

function requireStringArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: string[],
) {
  if (!isStringArray(record[key])) {
    issues.push(`${path}.${key} must be an array of non-empty strings.`);
  }
}

function validateDraftPosts(value: unknown) {
  const issues: string[] = [];

  if (!Array.isArray(value)) {
    return invalid(["draftPosts import must be a JSON array."]);
  }

  if (value.length > 100) {
    issues.push("draftPosts import must contain 100 rows or fewer.");
  }

  value.forEach((item, index) => {
    const path = `draftPosts[${index}]`;

    if (!isRecord(item)) {
      issues.push(`${path} must be an object.`);
      return;
    }

    [
      "id",
      "ideaId",
      "title",
      "publishWindow",
      "bodyPreview",
    ].forEach((key) => requireString(item, key, path, issues));

    if (!isOneOf<readonly OpsProjectId[]>(item.projectId, projectIds)) {
      issues.push(`${path}.projectId must be syncsoap, syncsafety, or bringhurstdo.`);
    }

    if (!isOneOf(item.channel, channels)) {
      issues.push(
        `${path}.channel must be LinkedIn, Instagram, Facebook, X, Blog, or Email.`,
      );
    }

    if (!isOneOf(item.audience, audiences)) {
      issues.push(`${path}.audience is not an allowed audience.`);
    }

    if (!isOneOf(item.status, contentStatuses)) {
      issues.push(`${path}.status is not an allowed content status.`);
    }

    if (!isBoolean(item.approvalRequired)) {
      issues.push(`${path}.approvalRequired must be boolean.`);
    }

    if (item.postedManuallyAt !== undefined && !isString(item.postedManuallyAt)) {
      issues.push(`${path}.postedManuallyAt must be a string when present.`);
    }

    if (!isString(item.utmCampaignId)) {
      issues.push(`${path}.utmCampaignId is required for UTM discipline.`);
    }

    requireStringArray(item, "safetyNotes", path, issues);
  });

  if (issues.length > 0) {
    return invalid(issues);
  }

  return {
    issues: [],
    ok: true,
    previewRows: value.slice(0, 8).map((item) => {
      const draft = item as Record<string, unknown>;

      return {
        detail: String(draft.channel),
        label: String(draft.title),
        value: String(draft.status),
      };
    }),
    summary: `${value.length} draft post rows validated for local preview.`,
  } satisfies ManualImportValidationResult;
}

function validateManualMetricEntries(value: unknown) {
  const issues: string[] = [];

  if (!Array.isArray(value)) {
    return invalid(["manualMetricEntries import must be a JSON array."]);
  }

  if (value.length > 200) {
    issues.push("manualMetricEntries import must contain 200 rows or fewer.");
  }

  value.forEach((item, index) => {
    const path = `manualMetricEntries[${index}]`;

    if (!isRecord(item)) {
      issues.push(`${path} must be an object.`);
      return;
    }

    [
      "id",
      "label",
      "value",
      "unit",
      "weekStart",
      "weekEnd",
      "enteredAt",
    ].forEach((key) => requireString(item, key, path, issues));

    if (!isOneOf<readonly OpsProjectId[]>(item.projectId, projectIds)) {
      issues.push(`${path}.projectId must be syncsoap, syncsafety, or bringhurstdo.`);
    }

    if (
      !isOneOf<readonly WeeklyScorecardMetricId[]>(
        item.metricId,
        scorecardMetricIds,
      )
    ) {
      issues.push(`${path}.metricId is not an allowed scorecard metric.`);
    }

    if (!isOneOf<readonly ManualMetricSource[]>(item.source, manualMetricSources)) {
      issues.push(`${path}.source must be manual, imported, or future-read-only.`);
    }

    requireStringArray(item, "notes", path, issues);
  });

  if (issues.length > 0) {
    return invalid(issues);
  }

  return {
    issues: [],
    ok: true,
    previewRows: value.slice(0, 8).map((item) => {
      const metric = item as Record<string, unknown>;

      return {
        detail: `${String(metric.projectId)} / ${String(metric.metricId)}`,
        label: String(metric.label),
        value: `${String(metric.value)} ${String(metric.unit)}`,
      };
    }),
    summary: `${value.length} manual metric rows validated for local preview.`,
  } satisfies ManualImportValidationResult;
}

function validateUtmCampaignLinks(value: unknown) {
  const issues: string[] = [];

  if (!Array.isArray(value)) {
    return invalid(["utmCampaignLinks import must be a JSON array."]);
  }

  if (value.length > 100) {
    issues.push("utmCampaignLinks import must contain 100 rows or fewer.");
  }

  value.forEach((item, index) => {
    const path = `utmCampaignLinks[${index}]`;

    if (!isRecord(item)) {
      issues.push(`${path} must be an object.`);
      return;
    }

    [
      "id",
      "label",
      "source",
      "medium",
      "campaign",
      "content",
    ].forEach((key) => requireString(item, key, path, issues));

    if (!isOneOf<readonly OpsProjectId[]>(item.projectId, projectIds)) {
      issues.push(`${path}.projectId must be syncsoap, syncsafety, or bringhurstdo.`);
    }

    if (!validateUrl(item.destinationUrl)) {
      issues.push(`${path}.destinationUrl must be an http or https URL.`);
    }

    if (!validateUrl(item.generatedUrl)) {
      issues.push(`${path}.generatedUrl must be an http or https URL.`);
    }

    if (!isOneOf(item.status, utmStatuses)) {
      issues.push(`${path}.status must be mock, ready, or archived.`);
    }

    requireStringArray(item, "notes", path, issues);
  });

  if (issues.length > 0) {
    return invalid(issues);
  }

  return {
    issues: [],
    ok: true,
    previewRows: value.slice(0, 8).map((item) => {
      const link = item as Record<string, unknown>;

      return {
        detail: String(link.source),
        label: String(link.label),
        value: String(link.campaign),
      };
    }),
    summary: `${value.length} UTM link rows validated for local preview.`,
  } satisfies ManualImportValidationResult;
}

function validateWeeklyReport(value: unknown) {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return invalid(["weeklyReport import must be a JSON object."]);
  }

  ["id", "weekStart", "weekEnd", "generatedAt", "summary"].forEach((key) =>
    requireString(value, key, "weeklyReport", issues),
  );

  if (value.mode !== "mock") {
    issues.push("weeklyReport.mode must be mock for local imports.");
  }

  if (!Array.isArray(value.sections)) {
    issues.push("weeklyReport.sections must be an array.");
  } else {
    value.sections.forEach((section, index) => {
      const path = `weeklyReport.sections[${index}]`;

      if (!isRecord(section)) {
        issues.push(`${path} must be an object.`);
        return;
      }

      requireString(section, "title", path, issues);

      if (!isOneOf<readonly OpsTone[]>(section.tone, opsTones)) {
        issues.push(`${path}.tone is not an allowed ops tone.`);
      }

      requireStringArray(section, "items", path, issues);
    });
  }

  [
    "weeklyWins",
    "risksAndBlockers",
    "costNotes",
    "marketingOutput",
    "nextActions",
  ].forEach((key) => requireStringArray(value, key, "weeklyReport", issues));

  if (issues.length > 0) {
    return invalid(issues);
  }

  return {
    issues: [],
    ok: true,
    previewRows: [
      {
        detail: `${String(value.weekStart)} to ${String(value.weekEnd)}`,
        label: String(value.id),
        value: "mock weekly report",
      },
    ],
    summary: "Weekly report validated for local preview.",
  } satisfies ManualImportValidationResult;
}

function validateProjectHealthSnapshots(value: unknown) {
  const issues: string[] = [];

  if (!Array.isArray(value)) {
    return invalid(["projectHealthSnapshots import must be a JSON array."]);
  }

  if (value.length > 50) {
    issues.push("projectHealthSnapshots import must contain 50 rows or fewer.");
  }

  value.forEach((item, index) => {
    const path = `projectHealthSnapshots[${index}]`;

    if (!isRecord(item)) {
      issues.push(`${path} must be an object.`);
      return;
    }

    [
      "id",
      "name",
      "siteStatus",
      "deployStatus",
      "monthlyCostEstimate",
      "nextAction",
      "capturedAt",
    ].forEach((key) => requireString(item, key, path, issues));

    if (!isOneOf<readonly OpsProjectId[]>(item.projectId, projectIds)) {
      issues.push(`${path}.projectId must be syncsoap, syncsafety, or bringhurstdo.`);
    }

    if (!isOneOf<readonly OpsTone[]>(item.siteStatusTone, opsTones)) {
      issues.push(`${path}.siteStatusTone is not an allowed ops tone.`);
    }

    if (!isOneOf<readonly OpsTone[]>(item.deployStatusTone, opsTones)) {
      issues.push(`${path}.deployStatusTone is not an allowed ops tone.`);
    }

    requireStringArray(item, "tractionNotes", path, issues);
  });

  if (issues.length > 0) {
    return invalid(issues);
  }

  return {
    issues: [],
    ok: true,
    previewRows: value.slice(0, 8).map((item) => {
      const snapshot = item as Record<string, unknown>;

      return {
        detail: String(snapshot.deployStatus),
        label: String(snapshot.name),
        value: String(snapshot.siteStatus),
      };
    }),
    summary: `${value.length} project health rows validated for local preview.`,
  } satisfies ManualImportValidationResult;
}

export function validateManualImportPayload(
  kind: ManualImportKind,
  value: unknown,
): ManualImportValidationResult {
  const safetyIssues = collectMetadataOnlyIssues(value, kind).map(
    (issue) => `${issue.path}: ${issue.message}`,
  );

  if (safetyIssues.length > 0) {
    return invalid(safetyIssues);
  }

  switch (kind) {
    case "draftPosts":
      return validateDraftPosts(value);
    case "utmCampaignLinks":
      return validateUtmCampaignLinks(value);
    case "weeklyReport":
      return validateWeeklyReport(value);
    case "projectHealthSnapshots":
      return validateProjectHealthSnapshots(value);
    case "manualMetricEntries":
      return validateManualMetricEntries(value);
  }
}
