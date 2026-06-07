export type MetadataOnlyString = string;
export type SafeOpsText = MetadataOnlyString;

export type OpsSafetyIssue = {
  message: string;
  path: string;
};

const forbiddenFieldNames = [
  "patientName",
  "patientIdentifier",
  "patientId",
  "encounterId",
  "encounterText",
  "transcript",
  "clinicalPayload",
  "secret",
  "cookie",
  "token",
  "rawLog",
] as const;

const forbiddenValuePatterns = [
  {
    label: "credential-like assignment",
    pattern:
      /\b(secret|token|cookie|api[_\s-]?key|authorization|bearer)\b\s*[:=]/i,
  },
  {
    label: "patient or encounter label",
    pattern:
      /\b(patient\s*(name|id|identifier)|mrn|medical\s*record|encounter\s*(id|text)|transcript|clinical\s*payload)\b\s*[:=]/i,
  },
  {
    label: "raw log marker",
    pattern:
      /\b(raw\s*log|stack\s*trace|traceback|request\s*headers|set-cookie)\b\s*[:=]/i,
  },
  {
    label: "bearer token",
    pattern: /\bbearer\s+[a-z0-9._~+/=-]{12,}/i,
  },
  {
    label: "JWT-like token",
    pattern: /\beyJ[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+\b/i,
  },
  {
    label: "AWS access key-like value",
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    label: "email address",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
  {
    label: "US phone number",
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/,
  },
  {
    label: "SSN-like value",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/,
  },
] as const;

function normalizeFieldName(fieldName: string) {
  return fieldName.replace(/[\s_-]/g, "").toLowerCase();
}

export function collectForbiddenOpsKeyIssues(
  value: unknown,
  path = "opsData",
): OpsSafetyIssue[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectForbiddenOpsKeyIssues(item, `${path}[${index}]`),
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => {
      const normalizedKey = normalizeFieldName(key);
      const forbiddenName = forbiddenFieldNames.find(
        (fieldName) => normalizedKey === normalizeFieldName(fieldName),
      );

      const keyIssues: OpsSafetyIssue[] = forbiddenName
        ? [
            {
              path,
              message: `Unsafe ops field "${key}" matches forbidden field "${forbiddenName}".`,
            },
          ]
        : [];

      return [
        ...keyIssues,
        ...collectForbiddenOpsKeyIssues(child, `${path}.${key}`),
      ];
    },
  );
}

export function collectForbiddenOpsValueIssues(
  value: unknown,
  path = "opsData",
): OpsSafetyIssue[] {
  if (typeof value === "string") {
    const matchedPattern = forbiddenValuePatterns.find(({ pattern }) =>
      pattern.test(value),
    );

    return matchedPattern
      ? [
          {
            path,
            message: `Unsafe ops value matches ${matchedPattern.label}.`,
          },
        ]
      : [];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectForbiddenOpsValueIssues(item, `${path}[${index}]`),
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => collectForbiddenOpsValueIssues(child, `${path}.${key}`),
  );
}

export function collectMetadataOnlyIssues(
  value: unknown,
  path = "opsData",
): OpsSafetyIssue[] {
  return [
    ...collectForbiddenOpsKeyIssues(value, path),
    ...collectForbiddenOpsValueIssues(value, path),
  ];
}

// Phase 2 local/mock data must remain metadata-only. This guard catches casual
// model drift toward unsafe field names before live integrations exist.
export function assertNoForbiddenOpsKeys(value: unknown, path = "opsData") {
  const firstIssue = collectForbiddenOpsKeyIssues(value, path)[0];

  if (firstIssue) {
    throw new Error(`${firstIssue.message} Path: ${firstIssue.path}.`);
  }
}

export function assertMetadataOnlyOpsPayload(value: unknown, path = "opsData") {
  const firstIssue = collectMetadataOnlyIssues(value, path)[0];

  if (firstIssue) {
    throw new Error(`${firstIssue.message} Path: ${firstIssue.path}.`);
  }
}

export function hasForbiddenOpsFieldName(fieldName: string) {
  const normalizedKey = normalizeFieldName(fieldName);
  const forbiddenName = forbiddenFieldNames.find(
    (forbiddenFieldName) =>
      normalizedKey === normalizeFieldName(forbiddenFieldName),
  );

  return Boolean(forbiddenName);
}
