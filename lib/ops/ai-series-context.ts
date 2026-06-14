import type {
  OpsAccountProjectId,
  OpsAudienceProfile,
  OpsBrandProfile,
  OpsProjectId,
  PublicationPlatform,
  PublicationTarget,
  SourceUpdateType,
} from "@/lib/ops/types";

import {
  buildSeriesSchedule,
  platformBodyMaxChars,
} from "@/lib/ops/series-schedule";

/** Allowlisted AI payload for weekly summary → series split. */
export type OpsAiSeriesSplitContext = {
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
  excludedData: string;
  manualReviewRequired: true;
  reviewChecklist: string[];
  series: {
    id: string;
    postsPerWeek: number;
    sourceProjectId: string;
    startDate: string;
    summary: string;
    title: string;
    updateType: SourceUpdateType;
    weekCount: number;
  };
  slots: Array<{
    accountName: string;
    bodyMaxChars: number;
    destinationUrl: string;
    platform: PublicationPlatform;
    publicationTargetId: string;
    seriesIndex: number;
    slotId: string;
    suggestedScheduledFor: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value: unknown, path: string, issues: string[]) {
  if (typeof value !== "string" || !value.trim()) {
    issues.push(`${path} must be a non-empty string.`);
    return "";
  }

  return value.trim();
}

function requirePositiveInt(
  value: unknown,
  path: string,
  issues: string[],
  { max, min }: { max: number; min: number },
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    issues.push(`${path} must be an integer between ${min} and ${max}.`);
    return min;
  }

  return parsed;
}

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

export type SeriesSplitRequestInput = {
  audienceProfiles: OpsAudienceProfile[];
  brandProfiles: OpsBrandProfile[];
  draftReviewChecklist: string[];
  publicationTargets: PublicationTarget[];
  request: unknown;
};

export function validateSeriesSplitRequest({
  audienceProfiles,
  brandProfiles,
  draftReviewChecklist,
  publicationTargets,
  request,
}: SeriesSplitRequestInput):
  | { context: OpsAiSeriesSplitContext; issues: [] }
  | { context: null; issues: string[] } {
  const issues: string[] = [];

  if (!isRecord(request)) {
    return { context: null, issues: ["Request body must be an object."] };
  }

  const title = requireString(request.seriesTitle, "seriesTitle", issues);
  const summary = requireString(request.seriesSummary, "seriesSummary", issues);
  const sourceProjectId = requireString(
    request.sourceProjectId,
    "sourceProjectId",
    issues,
  ) as OpsProjectId;
  if (
    sourceProjectId !== "syncsoap" &&
    sourceProjectId !== "syncsafety" &&
    sourceProjectId !== "bringhurstdo"
  ) {
    issues.push("sourceProjectId must be syncsoap, syncsafety, or bringhurstdo.");
  }
  const seriesStartDate = requireString(
    request.seriesStartDate,
    "seriesStartDate",
    issues,
  );
  const updateType = requireString(
    request.updateType ?? "weekly-review",
    "updateType",
    issues,
  ) as SourceUpdateType;
  const postsPerWeek = requirePositiveInt(
    request.postsPerWeek ?? 3,
    "postsPerWeek",
    issues,
    { max: 7, min: 1 },
  );
  const weekCount = requirePositiveInt(
    request.weekCount ?? 1,
    "weekCount",
    issues,
    { max: 8, min: 1 },
  );

  const rawTargetIds = request.publicationTargetIds;
  const publicationTargetIds = Array.isArray(rawTargetIds)
    ? rawTargetIds.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
    : [];

  if (publicationTargetIds.length === 0) {
    issues.push("Select at least one publication target.");
  }

  const selectedTargets = publicationTargetIds
    .map((id) => publicationTargets.find((target) => target.id === id))
    .filter((target): target is PublicationTarget => Boolean(target));

  if (selectedTargets.length !== publicationTargetIds.length) {
    issues.push("One or more publication targets are unknown.");
  }

  for (const target of selectedTargets) {
    if (target.accountStatus && target.accountStatus !== "active") {
      issues.push(`Publication target ${target.accountName} is not active.`);
    }
  }

  if (summary.length > 12_000) {
    issues.push("seriesSummary must be 12,000 characters or fewer.");
  }

  if (issues.length > 0) {
    return { context: null, issues };
  }

  let scheduleDates: string[] = [];

  try {
    scheduleDates = buildSeriesSchedule({
      postsPerWeek,
      seriesStartDate,
      weekCount,
    });
  } catch (error) {
    return {
      context: null,
      issues: [
        error instanceof Error ? error.message : "Invalid series schedule.",
      ],
    };
  }

  const totalSlots = scheduleDates.length * selectedTargets.length;

  if (totalSlots > 40) {
    return {
      context: null,
      issues: [
        `Series would create ${totalSlots} posts (max 40). Reduce targets, posts per week, or weeks.`,
      ],
    };
  }

  const seriesId = `series-${Date.now().toString(36)}`;
  const slots = selectedTargets.flatMap((target) =>
    scheduleDates.map((suggestedScheduledFor, index) => ({
      accountName: target.accountName,
      bodyMaxChars: platformBodyMaxChars(target.platform),
      destinationUrl: target.defaultDestinationUrl,
      platform: target.platform,
      publicationTargetId: target.id,
      seriesIndex: index + 1,
      slotId: `${seriesId}-${target.id}-${index + 1}`,
      suggestedScheduledFor,
    })),
  );

  const brandIds = new Set(
    selectedTargets.map((target) => targetBrandProfileId(target)),
  );
  const audienceIds = new Set(selectedTargets.map((target) => target.audience));

  const context: OpsAiSeriesSplitContext = {
    audienceRules: uniqueById(
      audienceProfiles.filter((profile) => audienceIds.has(profile.id)),
    ).map((profile) => ({
      audience: profile.label,
      contentUse: profile.contentUse,
      safetyNotes: profile.safetyNotes,
    })),
    brandRules: uniqueById(
      brandProfiles.filter((profile) => brandIds.has(profile.id)),
    ).map((profile) => ({
      allowedTopics: profile.allowedTopics,
      brand: profile.displayName,
      prohibitedClaims: profile.prohibitedClaims,
      requiredDisclaimers: profile.requiredDisclaimers,
      sourceBoundary: profile.sourceBoundary,
      voiceTone: profile.voiceTone,
    })),
    excludedData:
      "No PHI, patient identifiers, encounter text, transcripts, clinical payloads, credentials, cookies, tokens, OAuth data, audience exports, secret values, or sensitive internal security findings unless manually rewritten as public-safe marketing language.",
    manualReviewRequired: true,
    reviewChecklist: draftReviewChecklist,
    series: {
      id: seriesId,
      postsPerWeek,
      sourceProjectId,
      startDate: seriesStartDate,
      summary,
      title,
      updateType,
      weekCount,
    },
    slots,
  };

  return { context, issues: [] };
}
