import type {
  OpsAccountProjectId,
  OpsAudienceProfile,
  OpsBrandProfile,
  OpsContentPackageRecord,
  PublicationTarget,
} from "@/lib/ops/types";

/** Allowlisted AI payload — must match the visible AI context preview plus platform drafts. */
export type OpsAiVisibleContext = {
  audienceRules: Array<{
    audience: string;
    contentUse: string[];
    safetyNotes: string[];
  }>;
  brandRules: Array<{
    allowedTopics: string[];
    brand: string;
    prohibitedClaims: string[];
    requiredDisclaimers: string[];
    sourceBoundary: string;
    voiceTone: string[];
  }>;
  contentPackageId: string;
  excludedData: string;
  manualReviewRequired: true;
  platformDrafts: Array<{
    accountName: string;
    body: string;
    generatedUrl: string;
    id: string;
    media: {
      creativeAngle: string;
      mediaSummary: string;
      mediaType: string;
      productionEffort: string;
      reuseStatus: string;
      visualHook: string;
    };
    platform: string;
    title: string;
  }>;
  publicationTargets: Array<{
    accountName: string;
    audience: string;
    destinationUrl: string;
    platform: string;
    postingMode: string;
    publicHandle: string;
    sourceBoundary: string;
    spendMode: string;
  }>;
  reviewChecklist: string[];
  sourceUpdate: {
    sourceBoundary: string;
    sourceDate: string;
    sourceProjectId: string;
    summary: string;
    title: string;
    updateType: string;
  };
};

const blockedPreviewMarker = "[blocked pending metadata-only review]";

function targetBrandProfileId(target: PublicationTarget): OpsAccountProjectId {
  return target.accountId.startsWith("account-founder")
    ? "kyle-bringhurst"
    : target.projectId ?? "bringhurstdo";
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: Set<string>, path: string, issues: string[]) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(`${path}.${key} is not allowlisted for AI context.`);
    }
  }
}

function requireString(value: unknown, path: string, issues: string[]) {
  if (typeof value !== "string" || !value.trim()) {
    issues.push(`${path} must be a non-empty string.`);
    return "";
  }

  return value.trim();
}

function requireStringArray(value: unknown, path: string, issues: string[]) {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array.`);
    return [];
  }

  return value.filter((item, index) => {
    if (typeof item !== "string" || !item.trim()) {
      issues.push(`${path}[${index}] must be a non-empty string.`);
      return false;
    }

    return true;
  });
}

export function buildOpsAiVisibleContextFromRecord({
  audienceProfiles,
  brandProfiles,
  draftReviewChecklist,
  publicationTargets,
  record,
}: {
  audienceProfiles: OpsAudienceProfile[];
  brandProfiles: OpsBrandProfile[];
  draftReviewChecklist: string[];
  publicationTargets: PublicationTarget[];
  record: OpsContentPackageRecord;
}): OpsAiVisibleContext {
  const targets = record.platformDrafts.map((draft) => ({
    draft,
    target: publicationTargets.find(
      (item) => item.id === draft.publicationTargetId,
    ),
  }));
  const brandIds = new Set<OpsAccountProjectId>([
    record.sourceUpdate.sourceProjectId,
    ...targets
      .filter(
        (item): item is { draft: typeof item.draft; target: PublicationTarget } =>
          Boolean(item.target),
      )
      .map(({ target }) => targetBrandProfileId(target)),
  ]);
  const audienceIds = new Set(
    targets
      .map(({ target }) => target?.audience)
      .filter((audience): audience is PublicationTarget["audience"] =>
        Boolean(audience),
      ),
  );
  const selectedBrands = uniqueById(
    brandProfiles.filter((profile) => brandIds.has(profile.id)),
  );
  const selectedAudiences = uniqueById(
    audienceProfiles.filter((profile) => audienceIds.has(profile.id)),
  );
  const selectedTargets = uniqueById(
    targets
      .map(({ target }) => target)
      .filter((target): target is PublicationTarget => Boolean(target)),
  );

  return {
    audienceRules: selectedAudiences.map((profile) => ({
      audience: profile.label,
      contentUse: profile.contentUse,
      safetyNotes: profile.safetyNotes,
    })),
    brandRules: selectedBrands.map((profile) => ({
      allowedTopics: profile.allowedTopics,
      brand: profile.displayName,
      prohibitedClaims: profile.prohibitedClaims,
      requiredDisclaimers: profile.requiredDisclaimers,
      sourceBoundary: profile.sourceBoundary,
      voiceTone: profile.voiceTone,
    })),
    contentPackageId: record.contentPackage.id,
    excludedData:
      "No PHI, patient identifiers, encounter text, transcripts, clinical payloads, private customer or pilot names, credentials, private messages, raw logs, cookies, tokens, OAuth data, audience exports, secret values, or sensitive internal security findings unless manually rewritten as public-safe marketing language.",
    manualReviewRequired: true,
    platformDrafts: record.platformDrafts.map((draft) => ({
      accountName: draft.accountName,
      body: draft.originalDeterministicBody ?? draft.body,
      generatedUrl: draft.generatedUrl,
      id: draft.id,
      media: {
        creativeAngle: draft.media.creativeAngle,
        mediaSummary: draft.media.mediaSummary,
        mediaType: draft.media.mediaType,
        productionEffort: draft.media.productionEffort,
        reuseStatus: draft.media.reuseStatus,
        visualHook: draft.media.visualHook,
      },
      platform: draft.platform,
      title: draft.title,
    })),
    publicationTargets: selectedTargets.map((target) => ({
      accountName: target.accountName,
      audience: target.audience,
      destinationUrl: target.defaultDestinationUrl,
      platform: target.platform,
      postingMode: target.postingMode,
      publicHandle: target.publicHandle,
      sourceBoundary: target.sourceBoundary,
      spendMode: target.spendMode,
    })),
    reviewChecklist: draftReviewChecklist,
    sourceUpdate: {
      sourceBoundary: record.sourceUpdate.sourceBoundary,
      sourceDate: record.sourceUpdate.sourceDate,
      sourceProjectId: record.sourceUpdate.sourceProjectId,
      summary: record.sourceUpdate.summary,
      title: record.sourceUpdate.title,
      updateType: record.sourceUpdate.updateType,
    },
  };
}

export function validateOpsAiVisibleContext(
  value: unknown,
  path = "aiVisibleContext",
): { context: OpsAiVisibleContext | null; issues: string[] } {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return { context: null, issues: [`${path} must be an object.`] };
  }

  hasOnlyKeys(
    value,
    new Set([
      "audienceRules",
      "brandRules",
      "contentPackageId",
      "excludedData",
      "manualReviewRequired",
      "platformDrafts",
      "publicationTargets",
      "reviewChecklist",
      "sourceUpdate",
    ]),
    path,
    issues,
  );

  if (value.manualReviewRequired !== true) {
    issues.push(`${path}.manualReviewRequired must be true.`);
  }

  const contentPackageId = requireString(value.contentPackageId, `${path}.contentPackageId`, issues);
  requireString(value.excludedData, `${path}.excludedData`, issues);
  requireStringArray(value.reviewChecklist, `${path}.reviewChecklist`, issues);

  const sourceUpdate = value.sourceUpdate;
  if (!isRecord(sourceUpdate)) {
    issues.push(`${path}.sourceUpdate must be an object.`);
  } else {
    hasOnlyKeys(
      sourceUpdate,
      new Set([
        "sourceBoundary",
        "sourceDate",
        "sourceProjectId",
        "summary",
        "title",
        "updateType",
      ]),
      `${path}.sourceUpdate`,
      issues,
    );

    const title = requireString(sourceUpdate.title, `${path}.sourceUpdate.title`, issues);
    const summary = requireString(sourceUpdate.summary, `${path}.sourceUpdate.summary`, issues);

    if (title.includes(blockedPreviewMarker) || summary.includes(blockedPreviewMarker)) {
      issues.push(`${path}.sourceUpdate contains blocked preview placeholder text.`);
    }
  }

  if (!Array.isArray(value.platformDrafts) || value.platformDrafts.length === 0) {
    issues.push(`${path}.platformDrafts must contain at least one draft.`);
  }

  if (issues.length > 0) {
    return { context: null, issues };
  }

  return {
    context: {
      ...(value as unknown as OpsAiVisibleContext),
      contentPackageId,
    },
    issues: [],
  };
}
