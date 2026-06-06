export type MetadataOnlyString = string;
export type SafeOpsText = MetadataOnlyString;

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

function normalizeFieldName(fieldName: string) {
  return fieldName.replace(/[\s_-]/g, "").toLowerCase();
}

// Phase 2 local/mock data must remain metadata-only. This guard catches casual
// model drift toward unsafe field names before live integrations exist.
export function assertNoForbiddenOpsKeys(value: unknown, path = "opsData") {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      assertNoForbiddenOpsKeys(item, `${path}[${index}]`);
    });
    return;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
    const normalizedKey = normalizeFieldName(key);
    const forbiddenName = forbiddenFieldNames.find(
      (fieldName) => normalizedKey === normalizeFieldName(fieldName),
    );

    if (forbiddenName) {
      throw new Error(
        `Unsafe ops field "${key}" at ${path}; matches forbidden field "${forbiddenName}".`,
      );
    }

    assertNoForbiddenOpsKeys(child, `${path}.${key}`);
  });
}
