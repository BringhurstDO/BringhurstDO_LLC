import type {
  OpsAccountProjectId,
  OpsAudienceProfile,
  OpsBrandProfile,
  OpsContentPackageRecord,
  PublicationTarget,
} from "@/lib/ops/types";

export type OpsAiImproveContext = {
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
  rules: {
    audienceProfiles: Array<{
      audience: string;
      contentUse: string[];
      safetyNotes: string[];
    }>;
    brandProfiles: Array<{
      allowedTopics: string[];
      brand: string;
      prohibitedClaims: string[];
      requiredDisclaimers: string[];
      sourceBoundary: string;
      voiceTone: string[];
    }>;
  };
  sourceUpdate: {
    sourceBoundary: string;
    sourceDate: string;
    sourceProjectId: string;
    summary: string;
    title: string;
    updateType: string;
  };
};

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

export function buildOpsAiImproveContext({
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
}): OpsAiImproveContext {
  const targets = record.platformDrafts.map((draft) => ({
    draft,
    target: publicationTargets.find(
      (item) => item.id === draft.publicationTargetId,
    ),
  }));
  const brandIds = new Set<OpsAccountProjectId>([
    record.sourceUpdate.sourceProjectId,
    ...targets
      .filter((item): item is { draft: typeof item.draft; target: PublicationTarget } =>
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
    contentPackageId: record.contentPackage.id,
    excludedData:
      "No PHI, patient identifiers, encounter text, transcripts, clinical payloads, credentials, private messages, raw logs, cookies, tokens, OAuth data, audience exports, or secret values.",
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
    rules: {
      audienceProfiles: selectedAudiences.map((profile) => ({
        audience: profile.label,
        contentUse: profile.contentUse,
        safetyNotes: profile.safetyNotes,
      })),
      brandProfiles: selectedBrands.map((profile) => ({
        allowedTopics: profile.allowedTopics,
        brand: profile.displayName,
        prohibitedClaims: profile.prohibitedClaims,
        requiredDisclaimers: profile.requiredDisclaimers,
        sourceBoundary: profile.sourceBoundary,
        voiceTone: profile.voiceTone,
      })),
    },
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
