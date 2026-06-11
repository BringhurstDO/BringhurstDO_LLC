import { collectMetadataOnlyIssues } from "@/lib/ops/safety";
import type { OpsContentPackageRecord } from "@/lib/ops/types";

type ValidationResult =
  | {
      issues: string[];
      ok: false;
      records: [];
    }
  | {
      issues: [];
      ok: true;
      records: OpsContentPackageRecord[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" && value[key].trim().length > 0;
}

function validateContentPackageRecordShape(
  value: unknown,
  path: string,
  issues: string[],
): value is OpsContentPackageRecord {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`);
    return false;
  }

  const sourceUpdate = value.sourceUpdate;
  const contentPackage = value.contentPackage;
  const businessOutcome = value.businessOutcome;

  if (!isRecord(sourceUpdate) || !hasString(sourceUpdate, "id")) {
    issues.push(`${path}.sourceUpdate.id is required.`);
  }

  if (!isRecord(contentPackage) || !hasString(contentPackage, "id")) {
    issues.push(`${path}.contentPackage.id is required.`);
  }

  if (!isRecord(businessOutcome) || !hasString(businessOutcome, "id")) {
    issues.push(`${path}.businessOutcome.id is required.`);
  }

  [
    "performanceSnapshots",
    "platformDrafts",
    "publishedPosts",
  ].forEach((key) => {
    if (!Array.isArray(value[key])) {
      issues.push(`${path}.${key} must be an array.`);
    }
  });

  return issues.length === 0;
}

export function validateOpsContentPackageRecords(
  value: unknown,
  path = "opsContentPackages",
): ValidationResult {
  const safetyIssues = collectMetadataOnlyIssues(value, path).map(
    (issue) => `${issue.path}: ${issue.message}`,
  );

  if (safetyIssues.length > 0) {
    return {
      issues: safetyIssues,
      ok: false,
      records: [],
    };
  }

  if (!Array.isArray(value)) {
    return {
      issues: [`${path} must be an array.`],
      ok: false,
      records: [],
    };
  }

  const shapeIssues: string[] = [];
  const records = value.filter((item, index): item is OpsContentPackageRecord =>
    validateContentPackageRecordShape(item, `${path}[${index}]`, shapeIssues),
  );

  if (shapeIssues.length > 0 || records.length !== value.length) {
    return {
      issues: shapeIssues,
      ok: false,
      records: [],
    };
  }

  return {
    issues: [],
    ok: true,
    records,
  };
}
