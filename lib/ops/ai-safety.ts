import {
  collectMetadataOnlyIssues,
  type OpsSafetyIssue,
} from "@/lib/ops/safety";

const forbiddenAiClaimPatterns = [
  {
    allowIf: /designed to support HIPAA-aligned workflows/i,
    label: "unapproved HIPAA compliance claim",
    pattern: /\bhipaa[\s-]*compliant\b/i,
  },
  {
    label: "guaranteed clinical outcome",
    pattern:
      /\b(guarantee(d|s)?|ensure(s|d)?|promise(s|d)?)\b.{0,40}\b(cure|diagnos(e|is|ing)|treat(ment|ing)?|patient outcome|clinical outcome)\b/i,
  },
  {
    label: "guaranteed financial outcome",
    pattern:
      /\b(guarantee(d|s)?|ensure(s|d)?|promise(s|d)?)\b.{0,40}\b(revenue|roi|profit|billing|reimbursement|savings)\b/i,
  },
  {
    label: "guaranteed legal or compliance outcome",
    pattern:
      /\b(guarantee(d|s)?|ensure(s|d)?|promise(s|d)?)\b.{0,40}\b(compliance|legal|audit|hipaa|soc\s*2|fda)\b/i,
  },
  {
    label: "absolute efficacy claim",
    pattern: /\b(100%|always works|never fails|bulletproof|foolproof)\b/i,
  },
  {
    label: "internal security finding language",
    pattern:
      /\b(security finding|vulnerability report|penetration test|cve-\d{4}-\d+|zero-day|incident report)\b/i,
  },
  {
    label: "private pilot or customer reference",
    pattern: /\b(pilot customer|private beta customer|named customer|customer name)\b/i,
  },
] as const;

function collectAiClaimIssues(value: unknown, path = "aiContent"): OpsSafetyIssue[] {
  if (typeof value === "string") {
    return forbiddenAiClaimPatterns.flatMap((rule) => {
      if (!rule.pattern.test(value)) {
        return [];
      }

      if ("allowIf" in rule && rule.allowIf?.test(value)) {
        return [];
      }

      return [
        {
          message: `AI content matches ${rule.label}.`,
          path,
        },
      ];
    });
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectAiClaimIssues(item, `${path}[${index}]`),
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => collectAiClaimIssues(child, `${path}.${key}`),
  );
}

export function collectAiSafetyIssues(
  value: unknown,
  path = "aiPayload",
): OpsSafetyIssue[] {
  return [
    ...collectMetadataOnlyIssues(value, path),
    ...collectAiClaimIssues(value, path),
  ];
}

export function formatAiSafetyIssues(issues: OpsSafetyIssue[]) {
  return issues.map((issue) => `${issue.path}: ${issue.message}`);
}
