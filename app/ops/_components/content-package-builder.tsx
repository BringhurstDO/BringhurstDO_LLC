"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ClipboardCheck,
  Download,
  FilePlus2,
  Link2,
  Plus,
  Save,
  Upload,
} from "lucide-react";

import { AiImprovePanel } from "@/app/ops/_components/ai-improve-panel";
import { collectMetadataOnlyIssues } from "@/lib/ops/safety";
import {
  createLocalStorageOpsPersistenceAdapter,
  createRemoteOpsPersistenceAdapter,
  type OpsStorageMode,
} from "@/lib/ops/persistence";
import type {
  BusinessOutcome,
  ContentPackage,
  ContentPackageStatus,
  OpsAiImprovedDraftProposal,
  OpsAiPublicStatus,
  OpsAudienceProfile,
  OpsBrandProfile,
  OpsContentPackageRecord,
  OpsAccountProjectId,
  OpsCreativeAngle,
  OpsMediaMetadata,
  OpsMediaReuseStatus,
  OpsMediaType,
  OpsProductionEffort,
  OpsProjectId,
  OpsProjectSummary,
  PerformanceSnapshot,
  PlatformDraft,
  PlatformDraftStatus,
  PublicationTarget,
  PublishedPost,
  PublishedPostStatus,
  SourceUpdate,
  SourceUpdateType,
} from "@/lib/ops/types";
import { buildUtmUrl } from "@/lib/ops/utm";

type DraftSlotInput = {
  assetLocation: string;
  body: string;
  creativeAngle: OpsCreativeAngle;
  id: string;
  mediaSummary: string;
  mediaType: OpsMediaType;
  productionEffort: OpsProductionEffort;
  reuseStatus: OpsMediaReuseStatus;
  status: PlatformDraftStatus;
  targetId: string;
  title: string;
  visualHook: string;
};

type LocalContentPackageRecord = OpsContentPackageRecord;

type WeeklyQueueState = "ready" | "not posted" | "posted" | "missing metrics";

type WeeklyContentQueueRow = {
  accountName: string;
  draftId: string;
  creativeAngle: OpsCreativeAngle;
  mediaType: OpsMediaType;
  packageTitle: string;
  platform: string;
  projectId: OpsProjectId;
  postStatus: PublishedPostStatus;
  postedAt: string;
  postedUrl: string;
  productionEffort: OpsProductionEffort;
  reuseStatus: OpsMediaReuseStatus;
  state: WeeklyQueueState;
  title: string;
  url: string;
  visualHook: string;
};

type PostedFilter = "all" | "posted" | "not posted";

type ContentPackageBuilderProps = {
  aiStatus: OpsAiPublicStatus;
  audienceProfiles: OpsAudienceProfile[];
  brandProfiles: OpsBrandProfile[];
  draftReviewChecklist: string[];
  initialRecords: LocalContentPackageRecord[];
  projects: OpsProjectSummary[];
  publicationTargets: PublicationTarget[];
  storageMode: Extract<OpsStorageMode, "database" | "local-browser">;
};

const storageKey = "bringhurstdo.ops.contentPackages.v1";
const maxPackageImportBytes = 200_000;
const xSinglePostLimit = 280;

const sourceUpdateTypes: SourceUpdateType[] = [
  "product-update",
  "launch-note",
  "customer-learning",
  "operator-note",
  "weekly-review",
];

const packageStatuses: ContentPackageStatus[] = [
  "drafting",
  "needs review",
  "approved",
  "partially posted",
  "posted",
  "archived",
];

const mediaTypes: OpsMediaType[] = [
  "none",
  "image",
  "carousel",
  "screenshot",
  "screen_recording",
  "demo_video",
  "reel",
  "talking_head",
  "mixed",
];

const creativeAngles: OpsCreativeAngle[] = [
  "build-in-public",
  "product demo",
  "problem/solution",
  "founder story",
  "workflow pain",
  "before/after",
  "educational",
  "launch/update",
];

const productionEfforts: OpsProductionEffort[] = ["low", "medium", "high"];
const reuseStatuses: OpsMediaReuseStatus[] = [
  "new",
  "reused",
  "repurposed",
  "remix",
];

const defaultMediaMetadata: OpsMediaMetadata = {
  creativeAngle: "build-in-public",
  mediaSummary: "No media planned.",
  mediaType: "none",
  productionEffort: "low",
  reuseStatus: "new",
  visualHook: "Text-only post.",
};

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || "content-package";
}

function nowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Source date is the user-selected planning/content date and may be future.
// Captured-at dates are the real current date for manual metric/outcome entry.
function currentCaptureDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function targetToSource(target: PublicationTarget) {
  return target.platform.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function campaignName(sourceTitle: string, target: PublicationTarget) {
  return `${slugify(sourceTitle)}_${targetToSource(target)}`;
}

function platformMedium(target: PublicationTarget) {
  return target.platform === "Email" ? "manual" : "organic";
}

function cleanTemplateInput(value: string, fallback: string) {
  return value.trim().replace(/\s+/g, " ") || fallback;
}

function withTerminalPunctuation(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return normalized;
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const clipped = value.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(" ");

  return withTerminalPunctuation(
    clipped.slice(0, lastSpace > 40 ? lastSpace : clipped.length),
  );
}

function sentenceExcerpt(value: string, maxLength: number) {
  const normalized = cleanTemplateInput(value, "");

  if (normalized.length <= maxLength) {
    return withTerminalPunctuation(normalized);
  }

  const clipped = normalized.slice(0, maxLength);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("!"),
    clipped.lastIndexOf("?"),
  );

  if (sentenceEnd >= 80) {
    return withTerminalPunctuation(clipped.slice(0, sentenceEnd + 1));
  }

  return truncateAtWord(normalized, maxLength);
}

function coerceManualNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value.replace(/[$,%\s,]/g, "");
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function numericMetricsFromSnapshot(snapshot: Partial<PerformanceSnapshot>) {
  return {
    clicks: coerceManualNumber(snapshot.clicks),
    comments: coerceManualNumber(snapshot.comments),
    impressions: coerceManualNumber(snapshot.impressions),
    reactions: coerceManualNumber(snapshot.reactions),
    saves: coerceManualNumber(snapshot.saves),
  };
}

function numericOutcomesFromOutcome(outcome: Partial<BusinessOutcome>) {
  return {
    conversations: coerceManualNumber(outcome.conversations),
    leads: coerceManualNumber(outcome.leads),
    revenue: coerceManualNumber(outcome.revenue),
  };
}

function collapseRepeatedPunctuation(value: string) {
  return value
    .replace(/\.{2,}/g, ".")
    .replace(/\s+\./g, ".")
    .replace(/([!?])\.+/g, "$1");
}

function bodyWithGeneratedUrl(
  body: string,
  generatedUrl: string,
  { appendIfMissing = true } = {},
) {
  const trimmed = body.trim();

  if (!trimmed) {
    return "";
  }

  const urlPattern = /https?:\/\/[^\s)]+/g;

  if (trimmed.match(urlPattern)) {
    return collapseRepeatedPunctuation(trimmed.replace(urlPattern, generatedUrl));
  }

  return collapseRepeatedPunctuation(
    appendIfMissing ? `${trimmed}\n\nUTM link: ${generatedUrl}` : trimmed,
  );
}

function campaignFromGeneratedUrl(generatedUrl: string, fallback: string) {
  try {
    return new URL(generatedUrl).searchParams.get("utm_campaign") ?? fallback;
  } catch {
    return fallback;
  }
}

function cleanXExcerptEnding(value: string) {
  let next = value.trim().replace(/[,:;\s-]+$/g, "").replace(/[.!?]+$/g, "");
  const danglingPhrasePatterns = [
    /\bgiven the length of the$/i,
    /\bgiven the length of$/i,
    /\bgiven the length$/i,
  ];
  let changed = true;

  while (changed) {
    changed = false;

    danglingPhrasePatterns.forEach((pattern) => {
      if (pattern.test(next)) {
        next = next.replace(pattern, "").trim().replace(/[,:;\s-]+$/g, "");
        changed = true;
      }
    });

    if (/\b(of|the|and|or|to|for|with)$/i.test(next)) {
      next = next.replace(/\s+\S+$/g, "").trim().replace(/[,:;\s-]+$/g, "");
      changed = true;
    }
  }

  return next;
}

function xSummaryExcerpt(summary: string, maxLength: number) {
  const normalized = cleanTemplateInput(summary, "");

  if (normalized.length <= maxLength) {
    return cleanXExcerptEnding(normalized);
  }

  const clipped = normalized.slice(0, maxLength);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("!"),
    clipped.lastIndexOf("?"),
  );

  if (sentenceEnd >= 35) {
    return cleanXExcerptEnding(clipped.slice(0, sentenceEnd + 1));
  }

  const phraseEnds = [",", ";", ":", " - ", " -- "]
    .map((marker) => clipped.lastIndexOf(marker))
    .filter((index) => index >= 35);
  const phraseEnd = phraseEnds.length > 0 ? Math.max(...phraseEnds) : -1;

  if (phraseEnd >= 35) {
    return cleanXExcerptEnding(clipped.slice(0, phraseEnd));
  }

  const lastSpace = clipped.lastIndexOf(" ");
  const wordBoundary = lastSpace >= 35 ? lastSpace : clipped.length;

  return cleanXExcerptEnding(clipped.slice(0, wordBoundary));
}

function xDraftBody(title: string, summary: string, audience: string, url: string) {
  const cleanTitle = cleanTemplateInput(title, "Product update");
  const prefix = /[!?]$/.test(cleanTitle) ? `${cleanTitle} ` : `${cleanTitle}: `;
  const audienceContext = audience === "general" ? "" : ` For ${audience}.`;
  const suffix = `${audienceContext} ${url}`;
  const budget = xSinglePostLimit - prefix.length - suffix.length;

  if (budget >= 40) {
    const summaryLine = xSummaryExcerpt(summary, budget);

    return collapseRepeatedPunctuation(`${prefix}${summaryLine}.${suffix}`);
  }

  return collapseRepeatedPunctuation(
    `Thread-ready: ${title}. Manual split required. ${url}`,
  );
}

function hashtagValue(value: string) {
  const tag = value.replace(/^@/, "").replace(/[^a-zA-Z0-9]+/g, "");

  return tag ? `#${tag}` : "";
}

function productHashtag(target: PublicationTarget) {
  if (target.projectId === "syncsoap") {
    return "#SyncSOAP";
  }

  if (target.projectId === "syncsafety") {
    return "#SyncSafety";
  }

  return "#BringhurstDO";
}

function buildUtmForTarget(
  target: PublicationTarget,
  campaign: string,
  content = target.id,
) {
  return buildUtmUrl({
    campaign,
    content,
    destinationUrl: target.defaultDestinationUrl,
    medium: platformMedium(target),
    source: targetToSource(target),
  });
}

function targetIsBlocked(target: PublicationTarget) {
  return (
    target.accountStatus !== undefined &&
    target.accountStatus !== "active"
  );
}

function draftTemplateBody({
  campaign,
  destinationUrl,
  sourceSummary,
  sourceTitle,
  target,
}: {
  campaign: string;
  destinationUrl: string;
  sourceSummary: string;
  sourceTitle: string;
  target: PublicationTarget;
}) {
  const title = cleanTemplateInput(sourceTitle, "Product update");
  const summary = cleanTemplateInput(
    sourceSummary,
    "A metadata-only operator update is ready for manual review.",
  );
  const account = target.accountName;
  const audience = target.audience;
  const productTag = productHashtag(target);
  const accountTag = hashtagValue(target.publicHandle);

  if (target.platform === "Facebook" && targetIsBlocked(target)) {
    return [
      `Blocked Facebook draft for ${account}.`,
      "This account is pending Meta trust/Page creation and should not be used for live posting.",
      "Keep this slot disabled until the account status becomes active.",
      "Manual approval is still required before any future publishing.",
    ].join("\n\n");
  }

  if (target.platform === "LinkedIn") {
    return [
      `${title}`,
      "",
      `${summary}`,
      "",
      `For ${audience}, the useful signal is simple: ${account} is keeping this update practical, reviewable, and tied to a manual operator workflow.`,
      "",
      `Campaign: ${campaign}`,
      `Learn more: ${destinationUrl}`,
      "",
      "Manual approval required before posting. No autoposting is connected.",
    ].join("\n");
  }

  if (target.platform === "Instagram") {
    return [
      `${title}`,
      "",
      `${sentenceExcerpt(summary, 180)}`,
      "",
      `Built for ${audience}.`,
      "Manual review before anything goes live.",
      "",
      `${destinationUrl}`,
      "",
      [productTag, accountTag, "#OperatorNotes", "#BuildInPublic"]
        .filter(Boolean)
        .join(" "),
    ].join("\n");
  }

  if (target.platform === "X") {
    return xDraftBody(
      title,
      summary,
      audience,
      destinationUrl,
    );
  }

  if (target.platform === "Facebook") {
    return [
      `${title}`,
      "",
      `${summary}`,
      "",
      `For ${audience}.`,
      `Learn more: ${destinationUrl}`,
      "",
      "Manual approval required before posting. No Meta API is connected.",
    ].join("\n");
  }

  return [
    `${title}`,
    "",
    `${summary}`,
    "",
    `Target: ${account} / ${target.platform} / ${audience}`,
    `Campaign: ${campaign}`,
    `Destination: ${destinationUrl}`,
    "",
    "Manual approval required before publishing.",
  ].join("\n");
}

function issueText(value: unknown, path: string) {
  return collectMetadataOnlyIssues(value, path).map(
    (issue) => `${issue.path}: ${issue.message}`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isLocalContentPackageRecord(
  value: unknown,
): value is LocalContentPackageRecord {
  if (!isRecord(value)) {
    return false;
  }

  const {
    businessOutcome,
    contentPackage,
    performanceSnapshots,
    platformDrafts,
    publishedPosts,
    sourceUpdate,
  } = value;

  return (
    isRecord(businessOutcome) &&
    isRecord(contentPackage) &&
    isRecord(sourceUpdate) &&
    Array.isArray(performanceSnapshots) &&
    Array.isArray(platformDrafts) &&
    Array.isArray(publishedPosts) &&
    isString(contentPackage.id) &&
    isString(contentPackage.title) &&
    isString(sourceUpdate.id) &&
    isString(sourceUpdate.title) &&
    isStringArray(contentPackage.publicationTargetIds)
  );
}

function isOpsProjectId(value: unknown): value is OpsProjectId {
  return value === "syncsoap" || value === "syncsafety" || value === "bringhurstdo";
}

function uniqueProjectIds(projectIds: unknown[]) {
  return Array.from(new Set(projectIds.filter(isOpsProjectId)));
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function normalizeMediaMetadata(value: unknown): OpsMediaMetadata {
  if (!isRecord(value)) {
    return defaultMediaMetadata;
  }

  const assetLocation = typeof value.assetLocation === "string"
    ? value.assetLocation.trim()
    : "";

  return {
    assetLocation: assetLocation || undefined,
    creativeAngle: isOneOf(value.creativeAngle, creativeAngles)
      ? value.creativeAngle
      : defaultMediaMetadata.creativeAngle,
    mediaSummary:
      typeof value.mediaSummary === "string" && value.mediaSummary.trim()
        ? value.mediaSummary
        : defaultMediaMetadata.mediaSummary,
    mediaType: isOneOf(value.mediaType, mediaTypes)
      ? value.mediaType
      : defaultMediaMetadata.mediaType,
    productionEffort: isOneOf(value.productionEffort, productionEfforts)
      ? value.productionEffort
      : defaultMediaMetadata.productionEffort,
    reuseStatus: isOneOf(value.reuseStatus, reuseStatuses)
      ? value.reuseStatus
      : defaultMediaMetadata.reuseStatus,
    visualHook:
      typeof value.visualHook === "string" && value.visualHook.trim()
        ? value.visualHook
        : defaultMediaMetadata.visualHook,
  };
}

function draftLooksGenerated(
  draft: PlatformDraft,
  sourceUpdate: SourceUpdate,
  target: PublicationTarget | undefined,
) {
  const body = draft.body.trim();
  const title = sourceUpdate.title.trim();

  if (!body) {
    return true;
  }

  if (
    body.includes("useful signal is simple") &&
    body.includes("Manual approval required before posting")
  ) {
    return true;
  }

  if (
    body.includes("Manual review before anything goes live") &&
    body.includes("#OperatorNotes")
  ) {
    return true;
  }

  if (
    draft.platform === "X" &&
    body.startsWith(`${title}:`) &&
    target &&
    body.includes(`For ${target.audience}`)
  ) {
    return true;
  }

  return (
    body.startsWith(`Manual ${draft.platform} draft for`) &&
    body.includes("No publishing API is connected")
  );
}

function generatedDraftNeedsRepair(
  draft: PlatformDraft,
) {
  const urls = draft.body.match(/https?:\/\/[^\s)]+/g) ?? [];

  return (
    !draft.body.trim() ||
    draft.body.includes("..") ||
    draft.body.includes("Should help me.\n\nBuilt for") ||
    urls.some((url) => url !== draft.generatedUrl) ||
    (urls.length === 0 && draft.platform !== "X") ||
    (draft.platform === "X" && draft.body.length > xSinglePostLimit) ||
    (draft.platform === "X" && !draft.body.includes(draft.generatedUrl)) ||
    (draft.platform === "X" && /For [a-z ]+\.?$/.test(draft.body.trim()))
  );
}

function draftTooLongNote(draft: PlatformDraft) {
  return draft.platform === "X" && draft.body.length > xSinglePostLimit
    ? "Manual review: X draft exceeds single-post length; split into a thread or shorten before posting."
    : undefined;
}

function appendUniqueNotes(notes: string[], additions: Array<string | undefined>) {
  return Array.from(
    new Set([
      ...notes,
      ...additions.filter((note): note is string => Boolean(note)),
    ]),
  );
}

function normalizePlatformDraft(
  draft: PlatformDraft,
  sourceUpdate: SourceUpdate,
  publicationTargets: PublicationTarget[],
) {
  const target = publicationTargets.find(
    (item) => item.id === draft.publicationTargetId,
  );
  const looksGenerated = draftLooksGenerated(draft, sourceUpdate, target);
  const needsRepair = generatedDraftNeedsRepair(draft);
  const canRegenerate = Boolean(looksGenerated && needsRepair && target);
  const repairedBody = canRegenerate
    ? draftTemplateBody({
        campaign: campaignFromGeneratedUrl(draft.generatedUrl, draft.utmCampaignId),
        destinationUrl: draft.generatedUrl,
        sourceSummary: sourceUpdate.summary,
        sourceTitle: sourceUpdate.title,
        target: target as PublicationTarget,
      })
    : bodyWithGeneratedUrl(draft.body, draft.generatedUrl, {
        appendIfMissing: false,
      });
  const safeBody =
    draft.platform === "X" && repairedBody.length > xSinglePostLimit && canRegenerate
      ? xDraftBody(
          sourceUpdate.title,
          sourceUpdate.summary,
          target?.audience ?? "general",
          draft.generatedUrl,
        )
      : repairedBody;
  const normalizedBody = bodyWithGeneratedUrl(safeBody, draft.generatedUrl, {
    appendIfMissing: canRegenerate,
  });
  const migrationNote =
    needsRepair && !canRegenerate
      ? "Migration note: draft body looked manually edited or target metadata was unavailable, so it was not regenerated automatically."
      : undefined;
  const regeneratedNote = canRegenerate
    ? "Migration note: recognized generated draft body was regenerated to current deterministic template."
    : undefined;

  return {
    ...draft,
    body: normalizedBody,
    safetyNotes: appendUniqueNotes(draft.safetyNotes, [
      migrationNote,
      regeneratedNote,
      draftTooLongNote({ ...draft, body: normalizedBody }),
    ]),
  };
}

function migrateLocalContentPackageRecord(
  value: unknown,
  publicationTargets: PublicationTarget[] = [],
): LocalContentPackageRecord | null {
  if (!isLocalContentPackageRecord(value)) {
    return null;
  }

  const sourceUpdateRecord = value.sourceUpdate as SourceUpdate & {
    sourceProjectId?: unknown;
  };
  const contentPackageRecord = value.contentPackage as ContentPackage & {
    publishingProjectIds?: unknown;
    sourceProjectIds?: unknown;
  };
  const sourceProjectId = isOpsProjectId(sourceUpdateRecord.sourceProjectId)
    ? sourceUpdateRecord.sourceProjectId
    : sourceUpdateRecord.projectId;
  const platformDrafts = value.platformDrafts.map((draft) => {
    const draftRecord = draft as PlatformDraft & {
      publishingProjectId?: unknown;
      sourceProjectId?: unknown;
    };
    const publishingProjectId = isOpsProjectId(draftRecord.publishingProjectId)
      ? draftRecord.publishingProjectId
      : draftRecord.projectId;

    const migratedDraft = {
      ...draft,
      media: normalizeMediaMetadata(draftRecord.media),
      projectId: publishingProjectId,
      publishingProjectId,
      sourceProjectId: isOpsProjectId(draftRecord.sourceProjectId)
        ? draftRecord.sourceProjectId
        : sourceProjectId,
    };

    return normalizePlatformDraft(
      migratedDraft,
      {
        ...value.sourceUpdate,
        projectId: sourceProjectId,
        sourceProjectId,
      },
      publicationTargets,
    );
  });
  const publishingProjectIds =
    Array.isArray(contentPackageRecord.publishingProjectIds)
      ? uniqueProjectIds(contentPackageRecord.publishingProjectIds)
      : uniqueProjectIds(platformDrafts.map((draft) => draft.publishingProjectId));
  const sourceProjectIds = Array.isArray(contentPackageRecord.sourceProjectIds)
    ? uniqueProjectIds(contentPackageRecord.sourceProjectIds)
    : [sourceProjectId];
  const sourceDate = value.sourceUpdate.sourceDate;
  const capturedAt = currentCaptureDate();
  const performanceSnapshots = value.performanceSnapshots.map((snapshot) => {
    const nextSnapshot = {
      ...snapshot,
      capturedAt:
        !snapshot.capturedAt || snapshot.capturedAt === sourceDate
          ? capturedAt
          : snapshot.capturedAt,
    };

    return {
      ...nextSnapshot,
      numericMetrics: numericMetricsFromSnapshot(nextSnapshot),
    };
  });
  const nextOutcome = {
    ...value.businessOutcome,
    capturedAt:
      !value.businessOutcome.capturedAt ||
      value.businessOutcome.capturedAt === sourceDate
        ? capturedAt
        : value.businessOutcome.capturedAt,
  };
  const publishedPosts = value.publishedPosts.map((post) => {
    const postRecord = post as PublishedPost & {
      accountName?: unknown;
      platform?: unknown;
      postedAt?: unknown;
      postedUrl?: unknown;
      projectId?: unknown;
    };
    const draft = platformDrafts.find((item) => item.id === post.platformDraftId);
    const postedUrl =
      typeof postRecord.postedUrl === "string"
        ? postRecord.postedUrl
        : post.postUrl;
    const postedAt =
      typeof postRecord.postedAt === "string"
        ? postRecord.postedAt
        : post.postedManuallyAt;

    return {
      ...post,
      accountName:
        typeof postRecord.accountName === "string"
          ? postRecord.accountName
          : draft?.accountName ?? "Unknown account",
      platform: isOneOf(postRecord.platform, [
        "LinkedIn",
        "Instagram",
        "Facebook",
        "X",
        "Blog",
        "Email",
      ] as const)
        ? postRecord.platform
        : draft?.platform ?? "LinkedIn",
      postedAt,
      postedManuallyAt: post.postedManuallyAt ?? postedAt,
      postedUrl,
      postUrl: post.postUrl ?? postedUrl,
      projectId: isOpsProjectId(postRecord.projectId)
        ? postRecord.projectId
        : draft?.publishingProjectId ?? sourceProjectId,
    };
  });

  return {
    businessOutcome: {
      ...nextOutcome,
      numericOutcomes: numericOutcomesFromOutcome(nextOutcome),
    },
    contentPackage: {
      ...value.contentPackage,
      projectIds: uniqueProjectIds([
        ...sourceProjectIds,
        ...publishingProjectIds,
        ...value.contentPackage.projectIds,
      ]),
      publishingProjectIds,
      sourceProjectIds,
    },
    performanceSnapshots,
    platformDrafts,
    publishedPosts,
    sourceUpdate: {
      ...value.sourceUpdate,
      projectId: sourceProjectId,
      sourceProjectId,
    },
  };
}

function packageExportFilename(record: LocalContentPackageRecord) {
  return `ops-content-package-${slugify(record.contentPackage.title)}.json`;
}

function downloadTextFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function metricHasValue(value: string) {
  const normalized = value.trim();

  return Boolean(normalized) && normalized !== "0" && normalized !== "0.0";
}

function snapshotHasMetrics(snapshot: PerformanceSnapshot | undefined) {
  if (!snapshot) {
    return false;
  }

  return [
    snapshot.impressions,
    snapshot.clicks,
    snapshot.reactions,
    snapshot.comments,
    snapshot.saves,
  ].some(metricHasValue);
}

function buildWeeklyQueueRows(records: LocalContentPackageRecord[]) {
  return records.flatMap((record): WeeklyContentQueueRow[] =>
    record.platformDrafts.map((draft) => {
      const post = record.publishedPosts.find(
        (item) => item.platformDraftId === draft.id,
      );
      const snapshot = post
        ? record.performanceSnapshots.find(
            (item) => item.publishedPostId === post.id,
          )
        : undefined;
      const postStatus = post?.status ?? "not posted";
      let state: WeeklyQueueState = "not posted";

      if (postStatus === "posted" && !snapshotHasMetrics(snapshot)) {
        state = "missing metrics";
      } else if (postStatus === "posted") {
        state = "posted";
      } else if (draft.status === "approved") {
        state = "ready";
      }

      return {
        accountName: draft.accountName,
        creativeAngle: draft.media.creativeAngle,
        draftId: draft.id,
        mediaType: draft.media.mediaType,
        packageTitle: record.contentPackage.title,
        platform: draft.platform,
        postedAt: post?.postedAt ?? post?.postedManuallyAt ?? "",
        postedUrl: post?.postedUrl ?? post?.postUrl ?? "",
        postStatus,
        productionEffort: draft.media.productionEffort,
        projectId: draft.publishingProjectId,
        reuseStatus: draft.media.reuseStatus,
        state,
        title: draft.title,
        url: draft.generatedUrl,
        visualHook: draft.media.visualHook,
      };
    }),
  );
}

function buildPostPacket(record: LocalContentPackageRecord) {
  const draftSections = record.platformDrafts
    .map((draft) => {
      const post = record.publishedPosts.find(
        (item) => item.platformDraftId === draft.id,
      );

      return `## ${draft.accountName} / ${draft.platform}

Status: ${draft.status}
Posted: ${post?.status ?? "not posted"}
Title: ${draft.title}
Source project: ${draft.sourceProjectId}
Publishing project: ${draft.publishingProjectId}
UTM URL: ${draft.generatedUrl}
Published URL: ${post?.postedUrl ?? post?.postUrl ?? "Not posted"}
Posted at: ${post?.postedAt ?? post?.postedManuallyAt ?? "Not posted"}
Media type: ${draft.media.mediaType}
Media summary: ${draft.media.mediaSummary}
Visual hook: ${draft.media.visualHook}
Creative angle: ${draft.media.creativeAngle}
Production effort: ${draft.media.productionEffort}
Asset reference: ${draft.media.assetLocation ?? "None"}
Reuse status: ${draft.media.reuseStatus}

${draft.body}

Safety notes:
${draft.safetyNotes.map((note) => `- ${note}`).join("\n")}`;
    })
    .join("\n\n");

  return `# Post Packet: ${record.contentPackage.title}

Source update: ${record.sourceUpdate.title}
Source project: ${record.sourceUpdate.sourceProjectId}
Source date: ${record.sourceUpdate.sourceDate}
Publishing projects: ${record.contentPackage.publishingProjectIds.join(", ")}
Approval required: ${record.contentPackage.approvalRequired ? "Yes" : "No"}
Boundary: metadata-only, no PHI, no credentials, no private messages, no raw logs.
Manual rule: post manually only after approval. No autoposting or spend mutation is connected.

${record.sourceUpdate.summary}

${draftSections}
`;
}

function formatPromptList(items: string[]) {
  return items.length > 0
    ? items.map((item) => `- ${item}`).join("\n")
    : "- None provided.";
}

function buildManualAiPrompt({
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
  record: LocalContentPackageRecord;
}) {
  const targets = record.platformDrafts.map((draft) => {
    const target = publicationTargets.find(
      (item) => item.id === draft.publicationTargetId,
    );

    return {
      draft,
      target,
    };
  });
  const brandIds = new Set<OpsAccountProjectId>([
    record.sourceUpdate.sourceProjectId,
    ...targets
      .filter((item): item is { draft: PlatformDraft; target: PublicationTarget } =>
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
  const brandRules = selectedBrands
    .map(
      (profile) => `## ${profile.displayName}
Role: ${profile.role}
Voice/tone:
${formatPromptList(profile.voiceTone)}
Allowed topics:
${formatPromptList(profile.allowedTopics)}
Prohibited claims:
${formatPromptList(profile.prohibitedClaims)}
Required disclaimers / safety notes:
${formatPromptList([...profile.requiredDisclaimers, ...profile.safetyNotes])}
Source boundary: ${profile.sourceBoundary}`,
    )
    .join("\n\n");
  const audienceRules = selectedAudiences
    .map(
      (profile) => `## ${profile.label}
Description: ${profile.description}
Use:
${formatPromptList(profile.contentUse)}
Safety notes:
${formatPromptList(profile.safetyNotes)}`,
    )
    .join("\n\n");
  const targetSections = targets
    .map(({ draft, target }) => {
      const targetSummary = target
        ? `${target.accountName} / ${target.platform} / ${target.publicHandle} / ${target.audience}`
        : `${draft.accountName} / ${draft.platform}`;

      return `## ${targetSummary}
Source project: ${draft.sourceProjectId}
Publishing project: ${draft.publishingProjectId}
Destination URL: ${target?.defaultDestinationUrl ?? "Unknown"}
UTM URL: ${draft.generatedUrl}
Posting mode: ${target?.postingMode ?? "manual-only"}
Spend mode: ${target?.spendMode ?? "manual-approval-required"}
Boundary: ${target?.sourceBoundary ?? "Metadata-only manual target."}`;
    })
    .join("\n\n");
  const mediaSections = record.platformDrafts
    .map(
      (draft) => `## ${draft.accountName} / ${draft.platform}
Media type: ${draft.media.mediaType}
Media summary: ${draft.media.mediaSummary}
Visual hook: ${draft.media.visualHook}
Creative angle: ${draft.media.creativeAngle}
Production effort: ${draft.media.productionEffort}
Asset reference only: ${draft.media.assetLocation ?? "None"}
Reuse status: ${draft.media.reuseStatus}`,
    )
    .join("\n\n");
  const draftSections = record.platformDrafts
    .map(
      (draft) => `## ${draft.accountName} / ${draft.platform}
Draft status: ${draft.status}
Draft title: ${draft.title}
Starting draft:
${draft.body}`,
    )
    .join("\n\n");

  return `# Manual AI Prompt Bridge: ${record.contentPackage.title}

You are helping draft public marketing/social content from a metadata-only BringhurstDO Ops package. No API is connected. This prompt was copied manually by a human operator.

## Non-Negotiable Safety Rules
- Do not infer, invent, request, or include PHI, patient identifiers, encounter text, transcripts, clinical payloads, credentials, private messages, raw logs, cookies, tokens, OAuth data, audience exports, or secret values.
- Do not claim diagnosis, treatment, billing, legal, safety, financial, compliance, ROI, or clinical outcomes unless directly supported in the allowed context below.
- Keep SyncSOAP content metadata-only: product positioning, workflow burden, aggregate readiness, and public-safe marketing language only.
- Manual human review is required before posting. Do not provide autoposting, API, OAuth, database, or ad-spend instructions.
- Preserve every exact UTM URL if you include a link.

## Included Context
- Metadata-only source update title, summary, type, date, and source project.
- Brand/project voice, allowed topics, prohibited claims, required disclaimers, and source boundaries.
- Audience guidance for the selected publication targets.
- Platform/account targets and public destination/UTM links.
- Media metadata descriptions only, not files.
- Existing deterministic drafts as starting material.

## Excluded Context
- Internal notes from the source update or package.
- PHI, patient identifiers, encounter IDs, encounter text, transcripts, clinical payloads, patient images, or clinical media.
- Credentials, cookies, tokens, OAuth data, private messages, audience exports, raw logs, source-system payloads, and secret values.
- Any media file, upload, storage bucket, or binary asset.

## Source Update
Title: ${record.sourceUpdate.title}
Source project: ${record.sourceUpdate.sourceProjectId}
Source date: ${record.sourceUpdate.sourceDate}
Update type: ${record.sourceUpdate.updateType}
Boundary: ${record.sourceUpdate.sourceBoundary}
Summary:
${record.sourceUpdate.summary}

## Brand Rules And Prohibited Claims
${brandRules || "No brand rules available."}

## Audience Profiles
${audienceRules || "No audience rules available."}

## Platform And Account Targets
${targetSections || "No platform targets available."}

## Media Metadata
${mediaSections || "No media metadata available."}

## Existing Deterministic Drafts
${draftSections || "No existing draft text available."}

## Review Checklist Before Posting
${formatPromptList(draftReviewChecklist)}

## Requested Output Format
Return revised drafts separately for LinkedIn, Instagram, and X when those platforms are present. If a platform is not present in the targets, say "Not requested" for that platform.

For each requested platform, return:
1. Draft title
2. Draft body
3. Suggested media note using only the provided media metadata
4. Safety notes and claims to review
5. Exact UTM URL used

Keep the drafts practical, public-safe, and aligned with the selected brand and audience rules.`;
}

function validPostUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function createImportedPackageCopy(record: LocalContentPackageRecord) {
  const importedAt = new Date().toISOString();
  const importSuffix = `imported-${nowId()}`;
  const sourceUpdateId = `${record.sourceUpdate.id}-${importSuffix}`;
  const contentPackageId = `${record.contentPackage.id}-${importSuffix}`;
  const draftIdMap = new Map<string, string>();
  const postIdMap = new Map<string, string>();

  const platformDrafts = record.platformDrafts.map((draft, index) => {
    const draftId = `${draft.id}-${importSuffix}-${index + 1}`;
    draftIdMap.set(draft.id, draftId);

    return {
      ...draft,
      contentPackageId,
      id: draftId,
      sourceUpdateId,
      updatedAt: importedAt,
    };
  });
  const publishedPosts = record.publishedPosts.map((post, index) => {
    const postId = `${post.id}-${importSuffix}-${index + 1}`;
    postIdMap.set(post.id, postId);

    return {
      ...post,
      id: postId,
      manualNotes: [
        ...post.manualNotes,
        "Imported copy created because the original package ID already existed.",
      ],
      platformDraftId:
        draftIdMap.get(post.platformDraftId) ??
        `${post.platformDraftId}-${importSuffix}`,
    };
  });

  return {
    businessOutcome: {
      ...record.businessOutcome,
      contentPackageId,
      id: `${record.businessOutcome.id}-${importSuffix}`,
      notes: [
        ...record.businessOutcome.notes,
        "Imported copy created because the original package ID already existed.",
      ],
    },
    contentPackage: {
      ...record.contentPackage,
      createdAt: importedAt,
      id: contentPackageId,
      notes: [
        ...record.contentPackage.notes,
        "Imported copy created because the original package ID already existed.",
      ],
      sourceUpdateId,
      title: `${record.contentPackage.title} (Imported copy)`,
      updatedAt: importedAt,
    },
    performanceSnapshots: record.performanceSnapshots.map((snapshot, index) => ({
      ...snapshot,
      id: `${snapshot.id}-${importSuffix}-${index + 1}`,
      notes: [
        ...snapshot.notes,
        "Imported copy created because the original package ID already existed.",
      ],
      publishedPostId:
        postIdMap.get(snapshot.publishedPostId) ?? snapshot.publishedPostId,
    })),
    platformDrafts,
    publishedPosts,
    sourceUpdate: {
      ...record.sourceUpdate,
      createdAt: importedAt,
      id: sourceUpdateId,
      notes: [
        ...record.sourceUpdate.notes,
        "Imported copy created because the original package ID already existed.",
      ],
      title: `${record.sourceUpdate.title} (Imported copy)`,
    },
  } satisfies LocalContentPackageRecord;
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

export function ContentPackageBuilder({
  aiStatus,
  audienceProfiles,
  brandProfiles,
  draftReviewChecklist,
  initialRecords,
  projects,
  publicationTargets,
  storageMode,
}: ContentPackageBuilderProps) {
  const [primaryProjectId, setPrimaryProjectId] =
    useState<OpsProjectId>("syncsoap");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceType, setSourceType] =
    useState<SourceUpdateType>("product-update");
  const [sourceDate, setSourceDate] = useState("2026-06-06");
  const [sourceSummary, setSourceSummary] = useState("");
  const [sourceNotes, setSourceNotes] = useState("");
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [draftSlots, setDraftSlots] = useState<DraftSlotInput[]>([]);
  const [records, setRecords] = useState<LocalContentPackageRecord[]>(initialRecords);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveIssues, setSaveIssues] = useState<string[]>([]);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [packetMessage, setPacketMessage] = useState("");
  const [aiPromptMessage, setAiPromptMessage] = useState("");
  const [storageMessage, setStorageMessage] = useState("");
  const [historyMediaType, setHistoryMediaType] = useState<"all" | OpsMediaType>(
    "all",
  );
  const [historyCreativeAngle, setHistoryCreativeAngle] = useState<
    "all" | OpsCreativeAngle
  >("all");
  const [historyProjectId, setHistoryProjectId] = useState<"all" | OpsProjectId>(
    "all",
  );
  const [historyPlatform, setHistoryPlatform] = useState<"all" | string>("all");
  const [historyPostedFilter, setHistoryPostedFilter] =
    useState<PostedFilter>("all");
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const storageIsDatabase = storageMode === "database";
  const storageLabel = storageIsDatabase
    ? "Storage mode: durable database"
    : "Storage mode: local browser";
  const storageWarning = storageIsDatabase
    ? "Content packages are saved through the protected Ops Postgres adapter. Keep JSON exports as a backup until database backups and restore drills are verified."
    : "Content packages are saved with the localStorage adapter on this device and browser. Export JSON before clearing browser data, switching devices, or testing in another browser.";
  const saveButtonLabel = storageIsDatabase ? "Save Package" : "Save Locally";
  const saveButtonHelper = storageIsDatabase
    ? "Saves to the protected Ops database after metadata-only validation."
    : "Saves to this browser only after metadata-only validation.";
  const saveSuccessMessage = storageIsDatabase
    ? "Content package saved to the Ops database after metadata-only validation."
    : "Content package saved locally after metadata-only validation.";
  const savedPackagesTitle = storageIsDatabase
    ? "Saved Content Packages"
    : "Saved Local Content Packages";
  const savedPackagesDescription = storageIsDatabase
    ? "Track posted/not posted state, post URLs, manual performance snapshots, and business outcomes in the Ops database."
    : "Track posted/not posted state, post URLs, manual performance snapshots, and business outcomes locally.";
  const importPackagesDescription = storageIsDatabase
    ? "Choose the JSON file downloaded by Export Package. Imports are validated before rendering and saved through the Ops database adapter."
    : "Choose the JSON file downloaded by Export Package. Imports are validated before rendering and saved only to this browser.";
  const weeklyQueueDescription = storageIsDatabase
    ? "Derived from saved content packages in the Ops database. It shows what is ready, not posted, posted, and missing manual performance metrics."
    : "Derived from saved local content packages. It shows what is ready, not posted, posted, and missing manual performance metrics.";
  const noMediaHistoryMessage = storageIsDatabase
    ? "No saved media metadata rows match these filters."
    : "No local media metadata rows match these filters.";

  const createPersistenceAdapter = useCallback(() => {
    return storageIsDatabase
      ? createRemoteOpsPersistenceAdapter()
      : createLocalStorageOpsPersistenceAdapter({
          storage: window.localStorage,
          storageKey,
        });
  }, [storageIsDatabase]);

  useEffect(() => {
    let isMounted = true;
    const adapter = createPersistenceAdapter();

    async function loadStoredPackages() {
      try {
        const loaded = await adapter.loadContentPackages();

        if (loaded.contentPackages.length === 0) {
          return;
        }

        const migratedRecords = loaded.contentPackages
          .map((item) =>
            migrateLocalContentPackageRecord(item, publicationTargets),
          )
          .filter((item): item is LocalContentPackageRecord => Boolean(item));
        const issues = issueText(migratedRecords, "storedContentPackages");

        if (
          isMounted &&
          issues.length === 0 &&
          migratedRecords.length === loaded.contentPackages.length
        ) {
          setRecords(migratedRecords);
          await adapter.saveContentPackages(migratedRecords);
          setStorageMessage(
            `Loaded ${migratedRecords.length} package record${
              migratedRecords.length === 1 ? "" : "s"
            } from ${loaded.source}.`,
          );
        }
      } catch {
        if (isMounted) {
          setSaveIssues(["Stored content packages could not be loaded."]);
        }
      }
    }

    void loadStoredPackages();

    return () => {
      isMounted = false;
    };
  }, [createPersistenceAdapter, publicationTargets]);

  const selectedTargets = useMemo(
    () =>
      publicationTargets.filter((target) =>
        selectedTargetIds.includes(target.id),
      ),
    [publicationTargets, selectedTargetIds],
  );

  const selectedProjectIds = useMemo(() => {
    const targetProjectIds = selectedTargets
      .map((target) => target.projectId)
      .filter((projectId): projectId is OpsProjectId => Boolean(projectId));

    return Array.from(new Set([primaryProjectId, ...targetProjectIds]));
  }, [primaryProjectId, selectedTargets]);

  const selectedBrandProfiles = useMemo(() => {
    const profileIds = new Set<OpsAccountProjectId>([
      primaryProjectId,
      ...selectedTargets.map(targetBrandProfileId),
    ]);

    return uniqueById(
      brandProfiles.filter((profile) => profileIds.has(profile.id)),
    );
  }, [brandProfiles, primaryProjectId, selectedTargets]);

  const selectedAudienceProfiles = useMemo(() => {
    const audienceIds = new Set(selectedTargets.map((target) => target.audience));

    return uniqueById(
      audienceProfiles.filter((profile) => audienceIds.has(profile.id)),
    );
  }, [audienceProfiles, selectedTargets]);

  const aiPreviewSafetyIssues = useMemo(
    () =>
      issueText(
        {
          sourceSummary,
          sourceTitle,
        },
        "aiContextCandidate",
      ),
    [sourceSummary, sourceTitle],
  );
  const aiContextPreview = useMemo(() => {
    const sourceIsSafe = aiPreviewSafetyIssues.length === 0;

    return {
      aiState: aiStatus.enabled ? "connected-manual-review" : "disabled",
      dataMode: storageIsDatabase ? "durable-database" : "local-browser",
      sourceUpdate: {
        sourceProjectId: primaryProjectId,
        sourceDate,
        title: sourceIsSafe
          ? sourceTitle || "Untitled metadata-only update"
          : "[blocked pending metadata-only review]",
        summary: sourceIsSafe
          ? sourceSummary || "No metadata-only source summary entered yet."
          : "[blocked pending metadata-only review]",
        updateType: sourceType,
        sourceBoundary:
          "Metadata-only business/product update; internal notes are excluded from AI context.",
      },
      brandRules: selectedBrandProfiles.map((profile) => ({
        brand: profile.displayName,
        voiceTone: profile.voiceTone,
        allowedTopics: profile.allowedTopics,
        prohibitedClaims: profile.prohibitedClaims,
        requiredDisclaimers: profile.requiredDisclaimers,
        sourceBoundary: profile.sourceBoundary,
      })),
      audienceRules: selectedAudienceProfiles.map((profile) => ({
        audience: profile.label,
        contentUse: profile.contentUse,
        safetyNotes: profile.safetyNotes,
      })),
      publicationTargets: selectedTargets.map((target) => ({
        accountName: target.accountName,
        platform: target.platform,
        publicHandle: target.publicHandle,
        audience: target.audience,
        destinationUrl: target.defaultDestinationUrl,
        postingMode: target.postingMode,
        spendMode: target.spendMode,
        sourceBoundary: target.sourceBoundary,
      })),
      reviewChecklist: draftReviewChecklist,
      excludedData:
        "No PHI, patient identifiers, encounter text, transcripts, clinical payloads, credentials, private messages, raw logs, cookies, tokens, OAuth data, or audience exports.",
    };
  }, [
    aiPreviewSafetyIssues.length,
    draftReviewChecklist,
    primaryProjectId,
    selectedAudienceProfiles,
    selectedBrandProfiles,
    selectedTargets,
    sourceDate,
    sourceSummary,
    sourceTitle,
    sourceType,
    aiStatus.enabled,
    storageIsDatabase,
  ]);

  const weeklyQueueRows = useMemo(() => buildWeeklyQueueRows(records), [records]);
  const weeklyQueueGroups = useMemo(
    () => ({
      "missing metrics": weeklyQueueRows.filter(
        (row) => row.state === "missing metrics",
      ),
      "not posted": weeklyQueueRows.filter((row) => row.state === "not posted"),
      posted: weeklyQueueRows.filter((row) => row.state === "posted"),
      ready: weeklyQueueRows.filter((row) => row.state === "ready"),
    }),
    [weeklyQueueRows],
  );
  const filteredHistoryRows = useMemo(
    () =>
      weeklyQueueRows.filter((row) => {
        if (historyMediaType !== "all" && row.mediaType !== historyMediaType) {
          return false;
        }

        if (
          historyCreativeAngle !== "all" &&
          row.creativeAngle !== historyCreativeAngle
        ) {
          return false;
        }

        if (historyProjectId !== "all" && row.projectId !== historyProjectId) {
          return false;
        }

        if (historyPlatform !== "all" && row.platform !== historyPlatform) {
          return false;
        }

        if (historyPostedFilter === "posted") {
          return row.postStatus === "posted";
        }

        if (historyPostedFilter === "not posted") {
          return row.postStatus !== "posted";
        }

        return true;
      }),
    [
      historyCreativeAngle,
      historyMediaType,
      historyPlatform,
      historyPostedFilter,
      historyProjectId,
      weeklyQueueRows,
    ],
  );
  const recentlyPostedRows = useMemo(
    () =>
      weeklyQueueRows
        .filter((row) => row.postStatus === "posted")
        .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
        .slice(0, 5),
    [weeklyQueueRows],
  );
  const historyPlatforms = useMemo(
    () => Array.from(new Set(weeklyQueueRows.map((row) => row.platform))).sort(),
    [weeklyQueueRows],
  );
  const recentSummaryText =
    recentlyPostedRows.length > 0
      ? `${recentlyPostedRows.length} recent posted item${
          recentlyPostedRows.length === 1 ? "" : "s"
        }: ${recentlyPostedRows
          .map((row) => `${row.platform} ${row.mediaType} / ${row.creativeAngle}`)
          .join("; ")}.`
      : "No manually posted content is recorded yet.";

  function toggleTarget(targetId: string) {
    const target = publicationTargets.find((item) => item.id === targetId);

    if (target && targetIsBlocked(target)) {
      setSaveIssues([
        `${target.accountName} is ${target.accountStatus}; activate the account before creating drafts.`,
      ]);
      return;
    }

    setSelectedTargetIds((current) =>
      current.includes(targetId)
        ? current.filter((id) => id !== targetId)
        : [...current, targetId],
    );
  }

  function generateDraftSlots() {
    const packageSlug = slugify(sourceTitle);
    const activeTargets = selectedTargets.filter(
      (target) => !targetIsBlocked(target),
    );

    if (activeTargets.length === 0) {
      setSaveIssues([
        "Select at least one active publication target before generating slots.",
      ]);
      return;
    }

    setDraftSlots(
      activeTargets.map((target, index) => {
        const campaign = campaignName(sourceTitle, target);
        const destinationUrl = buildUtmForTarget(
          target,
          campaign,
          `${target.id}_${index + 1}`,
        );

        return {
          assetLocation: "",
          body: draftTemplateBody({
            campaign,
            destinationUrl,
            sourceSummary,
            sourceTitle,
            target,
          }),
          creativeAngle: "build-in-public",
          id: `slot-${packageSlug}-${target.id}`,
          mediaSummary: "No media planned.",
          mediaType: "none",
          productionEffort: "low",
          reuseStatus: "new",
          status: "drafted",
          targetId: target.id,
          title: sourceTitle || `${target.accountName} draft`,
          visualHook: "Text-only post.",
        };
      }),
    );
    setSaveIssues([]);
  }

  function addBlankDraftSlot() {
    const target =
      selectedTargets.find((item) => !targetIsBlocked(item)) ??
      publicationTargets.find((item) => !targetIsBlocked(item));

    if (!target) {
      setSaveIssues([
        "Select or create an active publication target before adding a slot.",
      ]);
      return;
    }

    setDraftSlots((current) => [
      ...current,
      {
        assetLocation: "",
        body: "",
        creativeAngle: "build-in-public",
        id: `slot-manual-${nowId()}`,
        mediaSummary: "No media planned.",
        mediaType: "none",
        productionEffort: "low",
        reuseStatus: "new",
        status: "slot",
        targetId: target.id,
        title: "",
        visualHook: "Text-only post.",
      },
    ]);
  }

  function updateDraftSlot(
    slotId: string,
    patch: Partial<Omit<DraftSlotInput, "id">>,
  ) {
    setDraftSlots((current) =>
      current.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)),
    );
  }

  async function persistRecords(nextRecords: LocalContentPackageRecord[]) {
    const issues = issueText(nextRecords, "contentPackageRecords");

    if (issues.length > 0) {
      setSaveIssues(issues);
      setSaveMessage("");
      return false;
    }

    try {
      const adapter = createPersistenceAdapter();
      const saved = await adapter.saveContentPackages(nextRecords);

      setRecords(nextRecords);
      setSaveIssues([]);
      setStorageMessage(
        `Saved ${nextRecords.length} package record${
          nextRecords.length === 1 ? "" : "s"
        } to ${saved.source}.`,
      );
      return true;
    } catch {
      setSaveIssues(["Ops storage save failed. Export JSON before retrying."]);
      setSaveMessage("");
      return false;
    }
  }

  function exportPackage(record: LocalContentPackageRecord) {
    const issues = issueText(record, "contentPackageExport");

    if (issues.length > 0) {
      setSaveIssues(issues);
      setSaveMessage("");
      return;
    }

    downloadTextFile(
      packageExportFilename(record),
      "application/json",
      `${JSON.stringify(record, null, 2)}\n`,
    );
    setSaveIssues([]);
    setPacketMessage(`Exported ${record.contentPackage.title} as JSON.`);
  }

  async function copyPostPacket(record: LocalContentPackageRecord) {
    const packet = buildPostPacket(record);
    const issues = issueText(packet, "postPacket");

    if (issues.length > 0) {
      setSaveIssues(issues);
      setPacketMessage("");
      return;
    }

    try {
      await navigator.clipboard.writeText(packet);
      setPacketMessage(`Copied post packet for ${record.contentPackage.title}.`);
      setSaveIssues([]);
    } catch {
      setSaveIssues([
        "Clipboard copy failed. Use Export Package JSON as the fallback local handoff.",
      ]);
      setPacketMessage("");
    }
  }

  async function copyAiPrompt(record: LocalContentPackageRecord) {
    const prompt = buildManualAiPrompt({
      audienceProfiles,
      brandProfiles,
      draftReviewChecklist,
      publicationTargets,
      record,
    });
    const issues = issueText(prompt, "manualAiPrompt");

    if (issues.length > 0) {
      setSaveIssues(issues);
      setAiPromptMessage("");
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      setAiPromptMessage(`Copied manual AI prompt for ${record.contentPackage.title}.`);
      setSaveIssues([]);
    } catch {
      setSaveIssues([
        "Clipboard copy failed. Select and copy the AI Prompt Preview manually.",
      ]);
      setAiPromptMessage("");
    }
  }

  async function importPackageJson(rawJson: string, sourceLabel: string) {
    const trimmed = rawJson.trim();

    if (!trimmed) {
      setImportIssues(["Selected import file is empty."]);
      setImportMessage("");
      return;
    }

    if (new Blob([rawJson]).size > maxPackageImportBytes) {
      setImportIssues(["Content package imports must be 200 KB or smaller."]);
      setImportMessage("");
      return;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      setImportIssues([`${sourceLabel} is not valid JSON.`]);
      setImportMessage("");
      return;
    }

    const importedValues = Array.isArray(parsed) ? parsed : [parsed];

    if (importedValues.length > 20) {
      setImportIssues(["Import at most 20 content packages at a time."]);
      setImportMessage("");
      return;
    }

    const migratedImports = importedValues.map((value) =>
      migrateLocalContentPackageRecord(value, publicationTargets),
    );
    const shapeIssues = migratedImports.flatMap((value, index) =>
      value
        ? []
        : [`contentPackageImport[${index}] is not a valid content package export.`],
    );

    if (shapeIssues.length > 0) {
      setImportIssues(shapeIssues);
      setImportMessage("");
      return;
    }

    const importedRecords = migratedImports.filter(
      (record): record is LocalContentPackageRecord => Boolean(record),
    );
    const safetyIssues = issueText(importedRecords, "contentPackageImport");

    if (safetyIssues.length > 0) {
      setImportIssues(safetyIssues);
      setImportMessage("");
      return;
    }

    const knownPackageIds = new Set(
      records.map((record) => record.contentPackage.id),
    );
    let copyCount = 0;
    const normalizedRecords = importedRecords.map((record) => {
      if (!knownPackageIds.has(record.contentPackage.id)) {
        knownPackageIds.add(record.contentPackage.id);
        return record;
      }

      const copiedRecord = createImportedPackageCopy(record);
      knownPackageIds.add(copiedRecord.contentPackage.id);
      copyCount += 1;
      return copiedRecord;
    });
    const nextRecords = [...normalizedRecords, ...records];

    if (await persistRecords(nextRecords)) {
      setImportFileName(sourceLabel);
      setImportIssues([]);
      setImportMessage(
        `Imported ${normalizedRecords.length} content package record${
          normalizedRecords.length === 1 ? "" : "s"
        } from ${sourceLabel}${
          copyCount > 0
            ? `; ${copyCount} duplicate ID${copyCount === 1 ? "" : "s"} saved as imported copies.`
            : "."
        }`,
      );
      setSaveIssues([]);
      setSaveMessage("");
    }
  }

  function openImportFilePicker() {
    importFileInputRef.current?.click();
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setImportFileName(file.name);
    setImportIssues([]);
    setImportMessage("");

    const isJsonFile =
      file.type === "application/json" ||
      file.name.toLowerCase().endsWith(".json");

    if (!isJsonFile) {
      setImportIssues(["Choose a .json file exported from Export Package."]);
      setImportMessage("");
      return;
    }

    if (file.size > maxPackageImportBytes) {
      setImportIssues(["Content package imports must be 200 KB or smaller."]);
      setImportMessage("");
      return;
    }

    try {
      const rawJson = await file.text();
      await importPackageJson(rawJson, file.name);
    } catch {
      setImportIssues([`Could not read ${file.name}. Choose a local JSON export.`]);
      setImportMessage("");
    }
  }

  async function saveContentPackage() {
    const baseIssues: string[] = [];

    if (!sourceTitle.trim()) {
      baseIssues.push("Source update title is required.");
    }

    if (!sourceSummary.trim()) {
      baseIssues.push("Source update summary is required.");
    }

    if (selectedTargets.length === 0) {
      baseIssues.push("Select at least one publication target.");
    }

    const blockedSelectedTargets = selectedTargets.filter(targetIsBlocked);

    if (blockedSelectedTargets.length > 0) {
      baseIssues.push(
        `Blocked targets cannot be saved: ${blockedSelectedTargets
          .map((target) => target.accountName)
          .join(", ")}.`,
      );
    }

    if (draftSlots.length === 0) {
      baseIssues.push("Generate or manually add at least one draft slot.");
    }

    const blockedDraftTargets = draftSlots
      .map((slot) =>
        publicationTargets.find((item) => item.id === slot.targetId),
      )
      .filter((target): target is PublicationTarget =>
        Boolean(target && targetIsBlocked(target)),
      );

    if (blockedDraftTargets.length > 0) {
      baseIssues.push(
        `Draft slots include blocked targets: ${blockedDraftTargets
          .map((target) => target.accountName)
          .join(", ")}.`,
      );
    }

    if (baseIssues.length > 0) {
      setSaveIssues(baseIssues);
      setSaveMessage("");
      return;
    }

    const idSuffix = nowId();
    const packageSlug = slugify(sourceTitle);
    const sourceUpdateId = `source-update-${packageSlug}-${idSuffix}`;
    const contentPackageId = `content-package-${packageSlug}-${idSuffix}`;
    const createdAt = new Date().toISOString();
    const capturedAt = currentCaptureDate();
    const sourceUpdate: SourceUpdate = {
      approvalRequired: true,
      createdAt,
      id: sourceUpdateId,
      notes: sourceNotes
        .split(/\r?\n/)
        .map((note) => note.trim())
        .filter(Boolean),
      projectId: primaryProjectId,
      sourceProjectId: primaryProjectId,
      sourceBoundary:
        "Metadata-only business/product update. No PHI, clinical payloads, credentials, private messages, or raw logs.",
      sourceDate,
      summary: sourceSummary,
      title: sourceTitle,
      updateType: sourceType,
    };
    const contentPackage: ContentPackage = {
      approvalRequired: true,
      createdAt,
      id: contentPackageId,
      notes: [
        "Local/mock content package",
        "Manual approval required before posting",
        "No AI or posting API is connected",
      ],
      projectIds: selectedProjectIds,
      publishingProjectIds: uniqueProjectIds(
        selectedTargets.map((target) => target.projectId),
      ),
      publicationTargetIds: selectedTargets.map((target) => target.id),
      sourceProjectIds: [primaryProjectId],
      sourceUpdateId,
      status: "drafting",
      title: sourceTitle,
      updatedAt: createdAt,
    };
    const platformDrafts = draftSlots.map((slot, index): PlatformDraft => {
      const target =
        publicationTargets.find((item) => item.id === slot.targetId) ??
        selectedTargets[0];
      const campaign = campaignName(sourceTitle, target);
      const content = `${target.id}_${index + 1}`;
      const generatedUrl = buildUtmForTarget(target, campaign, content);
      const templateBody = draftTemplateBody({
          campaign,
          destinationUrl: generatedUrl,
          sourceSummary,
          sourceTitle,
          target,
        });
      const body = bodyWithGeneratedUrl(slot.body.trim() || templateBody, generatedUrl);
      const publishingProjectId = target.projectId ?? primaryProjectId;

      return {
        accountName: target.accountName,
        approvalRequired: true,
        body,
        contentPackageId,
        generatedUrl,
        id: `platform-draft-${packageSlug}-${target.id}-${index + 1}-${idSuffix}`,
        media: {
          assetLocation: slot.assetLocation.trim() || undefined,
          creativeAngle: slot.creativeAngle,
          mediaSummary: slot.mediaSummary.trim() || defaultMediaMetadata.mediaSummary,
          mediaType: slot.mediaType,
          productionEffort: slot.productionEffort,
          reuseStatus: slot.reuseStatus,
          visualHook: slot.visualHook.trim() || defaultMediaMetadata.visualHook,
        },
        platform: target.platform,
        projectId: publishingProjectId,
        publicationTargetId: target.id,
        publishingProjectId,
        safetyNotes: [
          "Manual approval required before posting",
          "No PHI, private identifiers, credentials, or raw logs",
          "No posting API is connected",
        ],
        sourceUpdateId,
        sourceProjectId: primaryProjectId,
        status: slot.status,
        title: slot.title || sourceTitle,
        updatedAt: createdAt,
        utmCampaignId: `utm-${packageSlug}-${target.id}-${index + 1}-${idSuffix}`,
      };
    });
    const publishedPosts = platformDrafts.map(
      (draft): PublishedPost => ({
        accountName: draft.accountName,
        id: `published-post-${draft.id}`,
        manualNotes: ["Track URL only after manual posting"],
        platform: draft.platform,
        platformDraftId: draft.id,
        projectId: draft.publishingProjectId,
        publicationTargetId: draft.publicationTargetId,
        status: "not posted",
      }),
    );
    const performanceSnapshots = publishedPosts.map(
      (post): PerformanceSnapshot => ({
        capturedAt,
        clicks: "0",
        comments: "0",
        id: `performance-${post.id}`,
        impressions: "0",
        notes: ["Manual metrics only"],
        numericMetrics: {
          clicks: 0,
          comments: 0,
          impressions: 0,
          reactions: 0,
          saves: 0,
        },
        publishedPostId: post.id,
        reactions: "0",
        saves: "0",
        source: "manual",
      }),
    );
    const businessOutcome: BusinessOutcome = {
      capturedAt,
      contentPackageId,
      conversations: "0",
      id: `outcome-${contentPackageId}`,
      leads: "0",
      notes: ["Aggregate outcomes only"],
      numericOutcomes: {
        conversations: 0,
        leads: 0,
        revenue: 0,
      },
      revenue: "$0",
      source: "manual",
    };
    const record: LocalContentPackageRecord = {
      businessOutcome,
      contentPackage,
      performanceSnapshots,
      platformDrafts,
      publishedPosts,
      sourceUpdate,
    };
    const nextRecords = [record, ...records];

    if (await persistRecords(nextRecords)) {
      setSaveMessage(saveSuccessMessage);
    }
  }

  function updateRecord(recordId: string, patch: Partial<LocalContentPackageRecord>) {
    const nextRecords = records.map((record) =>
      record.contentPackage.id === recordId ? { ...record, ...patch } : record,
    );

    void persistRecords(nextRecords);
  }

  async function applyAiProposals(
    record: LocalContentPackageRecord,
    proposals: OpsAiImprovedDraftProposal[],
    aiRunId: string,
  ) {
    const proposalMap = new Map(
      proposals.map((proposal) => [proposal.platformDraftId, proposal]),
    );
    const nextDrafts = record.platformDrafts.map((draft) => {
      const proposal = proposalMap.get(draft.id);

      if (!proposal) {
        return draft;
      }

      const originalDeterministicBody =
        draft.originalDeterministicBody ?? draft.body;

      return {
        ...draft,
        body: proposal.body,
        lastAiRunId: aiRunId,
        originalDeterministicBody,
        safetyNotes: [
          ...draft.safetyNotes,
          "AI-improved draft applied after manual review.",
          ...proposal.safetyNotes,
        ],
        status: "needs review" as PlatformDraftStatus,
        title: proposal.title,
        updatedAt: new Date().toISOString(),
      };
    });
    const nextRecord: LocalContentPackageRecord = {
      ...record,
      contentPackage: {
        ...record.contentPackage,
        notes: [
          ...record.contentPackage.notes,
          `AI draft improvement run ${aiRunId} applied after manual review.`,
        ],
        status: "needs review",
        updatedAt: new Date().toISOString(),
      },
      platformDrafts: nextDrafts,
    };

    return persistRecords(
      records.map((item) =>
        item.contentPackage.id === record.contentPackage.id ? nextRecord : item,
      ),
    );
  }

  async function revertAiDraft(
    record: LocalContentPackageRecord,
    draftId: string,
  ) {
    const nextDrafts = record.platformDrafts.map((draft) => {
      if (draft.id !== draftId || !draft.originalDeterministicBody) {
        return draft;
      }

      return {
        ...draft,
        body: draft.originalDeterministicBody,
        lastAiRunId: undefined,
        originalDeterministicBody: undefined,
        safetyNotes: [
          ...draft.safetyNotes,
          "Reverted to original deterministic draft after AI review.",
        ],
        status: "drafted" as PlatformDraftStatus,
        updatedAt: new Date().toISOString(),
      };
    });
    const nextRecord: LocalContentPackageRecord = {
      ...record,
      contentPackage: {
        ...record.contentPackage,
        updatedAt: new Date().toISOString(),
      },
      platformDrafts: nextDrafts,
    };

    return persistRecords(
      records.map((item) =>
        item.contentPackage.id === record.contentPackage.id ? nextRecord : item,
      ),
    );
  }

  function updatePublishedPost(
    record: LocalContentPackageRecord,
    postId: string,
    patch: Partial<PublishedPost>,
  ) {
    const nextPosts = record.publishedPosts.map((post) => {
      if (post.id !== postId) {
        return post;
      }

      const nextStatus = patch.status ?? post.status;
      const nextPostedAt =
        nextStatus === "posted"
          ? patch.postedAt ??
            patch.postedManuallyAt ??
            post.postedAt ??
            post.postedManuallyAt ??
            new Date().toISOString()
          : undefined;
      const nextPostedUrl = patch.postedUrl ?? patch.postUrl ?? post.postedUrl;

      return {
        ...post,
        ...patch,
        postedAt: nextPostedAt,
        postedManuallyAt: nextPostedAt,
        postedUrl: nextPostedUrl,
        postUrl: nextPostedUrl,
      };
    });

    const invalidUrl = nextPosts.find(
      (post) =>
        (post.postUrl && !validPostUrl(post.postUrl)) ||
        (post.postedUrl && !validPostUrl(post.postedUrl)),
    );

    if (invalidUrl) {
      setSaveIssues(["Published URL must be blank or an http/https URL."]);
      setSaveMessage("");
      return;
    }

    updateRecord(record.contentPackage.id, { publishedPosts: nextPosts });
  }

  function updatePerformanceSnapshot(
    record: LocalContentPackageRecord,
    snapshotId: string,
    patch: Partial<PerformanceSnapshot>,
  ) {
    updateRecord(record.contentPackage.id, {
      performanceSnapshots: record.performanceSnapshots.map((snapshot) =>
        snapshot.id === snapshotId
          ? {
              ...snapshot,
              ...patch,
              capturedAt: currentCaptureDate(),
              numericMetrics: numericMetricsFromSnapshot({
                ...snapshot,
                ...patch,
              }),
            }
          : snapshot,
      ),
    });
  }

  function updateBusinessOutcome(
    record: LocalContentPackageRecord,
    patch: Partial<BusinessOutcome>,
  ) {
    const nextOutcome = {
      ...record.businessOutcome,
      ...patch,
      capturedAt: currentCaptureDate(),
    };

    updateRecord(record.contentPackage.id, {
      businessOutcome: {
        ...nextOutcome,
        numericOutcomes: numericOutcomesFromOutcome(nextOutcome),
      },
    });
  }

  function repairGeneratedDraftBodies(record: LocalContentPackageRecord) {
    const repairedDrafts = record.platformDrafts.map((draft) =>
      normalizePlatformDraft(draft, record.sourceUpdate, publicationTargets),
    );
    const repairedCount = repairedDrafts.filter((draft, index) => {
      const original = record.platformDrafts[index];

      return (
        draft.body !== original.body ||
        draft.safetyNotes.length !== original.safetyNotes.length
      );
    }).length;

    if (repairedCount === 0) {
      setPacketMessage(
        `No recognized generated draft bodies needed repair for ${record.contentPackage.title}.`,
      );
      return;
    }

    updateRecord(record.contentPackage.id, {
      contentPackage: {
        ...record.contentPackage,
        notes: appendUniqueNotes(record.contentPackage.notes, [
          "Generated draft repair reviewed locally; manual approval still required before posting.",
        ]),
        updatedAt: new Date().toISOString(),
      },
      platformDrafts: repairedDrafts,
    });
    setPacketMessage(
      `Repaired ${repairedCount} generated draft ${
        repairedCount === 1 ? "body" : "bodies"
      } for ${record.contentPackage.title}.`,
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              <Save className="h-4 w-4" />
              {storageLabel}
            </div>
            <h2 className="mt-1 font-sans text-base font-semibold text-amber-950">
              {storageIsDatabase
                ? "Durable database persistence"
                : "Browser-local persistence only"}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-900">
              {storageWarning} No AI API, social API, OAuth, autoposting,
              ad-spend mutation, or forbidden SyncSOAP data is connected.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
            {storageIsDatabase ? "Durable DB: active" : "Durable DB: not connected"}
          </span>
        </div>
        {storageMessage ? (
          <p className="mt-3 text-sm font-medium text-amber-900">{storageMessage}</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <FilePlus2 className="h-4 w-4" />
            Source Update
          </div>
          <h2 className="mt-1 font-sans text-base font-semibold text-slate-950">
            Enter One Metadata-Only Update
          </h2>
        </div>
        <div className="grid gap-5 p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Source product
              <select
                value={primaryProjectId}
                onChange={(event) =>
                  setPrimaryProjectId(event.target.value as OpsProjectId)
                }
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Update type
              <select
                value={sourceType}
                onChange={(event) =>
                  setSourceType(event.target.value as SourceUpdateType)
                }
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              >
                {sourceUpdateTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Source date
              <input
                value={sourceDate}
                onChange={(event) => setSourceDate(event.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                type="date"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Title
            <input
              value={sourceTitle}
              onChange={(event) => setSourceTitle(event.target.value)}
              placeholder="Example: SyncSOAP beta positioning update"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Source update summary
            <textarea
              value={sourceSummary}
              onChange={(event) => setSourceSummary(event.target.value)}
              placeholder="Business/product update only. Do not paste PHI, transcripts, identifiers, private messages, credentials, or raw logs."
              className="min-h-28 rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-800"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Internal notes
            <textarea
              value={sourceNotes}
              onChange={(event) => setSourceNotes(event.target.value)}
              placeholder="One note per line. Metadata-only planning notes."
              className="min-h-20 rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-800"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              AI readiness
            </div>
            <h2 className="mt-1 font-sans text-base font-semibold text-slate-950">
              Brand Rules And AI Context Preview
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {aiStatus.enabled
                ? "AI draft improvement is connected for manual review only. Generated text is not auto-saved or posted."
                : "AI is disabled. This shows the bounded context that could be sent after OPS_AI_ENABLED=true and OPENAI_API_KEY are configured server-side."}
            </p>
          </div>
          <span
            className={`inline-flex rounded-md border px-3 py-1 text-xs font-semibold ${
              aiStatus.enabled
                ? "border-violet-200 bg-violet-50 text-violet-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {aiStatus.enabled
              ? "AI connected: manual review required"
              : aiStatus.disabledReason ?? "AI disabled: no API connected"}
          </span>
        </div>
        <div className="grid gap-5 p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {selectedBrandProfiles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Select a source product or publication target to preview brand
                rules.
              </div>
            ) : (
              selectedBrandProfiles.map((profile) => (
                <article
                  key={profile.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <h3 className="font-sans text-sm font-semibold text-slate-950">
                    {profile.displayName}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {profile.role}
                  </p>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="font-semibold text-slate-700">Voice</dt>
                      <dd className="mt-1 text-slate-600">
                        {profile.voiceTone.join("; ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">
                        Allowed topics
                      </dt>
                      <dd className="mt-1 text-slate-600">
                        {profile.allowedTopics.join("; ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">
                        Prohibited claims
                      </dt>
                      <dd className="mt-1 text-slate-600">
                        {profile.prohibitedClaims.join("; ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">
                        Required notes
                      </dt>
                      <dd className="mt-1 text-slate-600">
                        {profile.requiredDisclaimers.join("; ")}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-sans text-sm font-semibold text-slate-950">
                  Audience Profiles
                </h3>
                <div className="mt-3 grid gap-3">
                  {selectedAudienceProfiles.length === 0 ? (
                    <p className="text-sm leading-6 text-slate-600">
                      Select publication targets to preview clinician, clinic
                      owner, investor, EHS, or founder-audience guidance.
                    </p>
                  ) : (
                    selectedAudienceProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600"
                      >
                        <div className="font-semibold text-slate-950">
                          {profile.label}
                        </div>
                        <p className="mt-1">{profile.description}</p>
                        <p className="mt-2">
                          Use: {profile.contentUse.join("; ")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-sans text-sm font-semibold text-slate-950">
                  Draft Review Checklist
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {draftReviewChecklist.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-sans text-sm font-semibold text-white">
                    AI Context Preview
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {aiStatus.enabled
                      ? "Server-side generation uses this bounded context. Nothing posts automatically."
                      : "Local preview only. Nothing is transmitted."}
                  </p>
                </div>
                <span className="rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300">
                  {aiStatus.enabled ? "manual review" : "local only"}
                </span>
              </div>
              {aiPreviewSafetyIssues.length > 0 ? (
                <div className="mt-4 rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
                  Source text was excluded from this preview because it needs
                  metadata-only review: {aiPreviewSafetyIssues.join("; ")}
                </div>
              ) : null}
              <pre className="mt-4 max-h-[34rem] overflow-auto rounded-md bg-slate-900 p-3 text-xs leading-5 text-slate-100">
                {JSON.stringify(aiContextPreview, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Upload className="h-4 w-4" />
            Import Package
          </div>
          <h2 className="mt-1 font-sans text-base font-semibold text-slate-950">
            Import An Exported Package JSON File
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {importPackagesDescription}
          </p>
        </div>
        <div className="grid gap-4 p-5">
          <input
            ref={importFileInputRef}
            onChange={(event) => void handleImportFileChange(event)}
            type="file"
            accept=".json,application/json"
            className="hidden"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={openImportFilePicker}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <Upload className="h-4 w-4" />
              Import Package
            </button>
            <p className="text-sm text-slate-500">
              Opens a local file picker for .json files. Duplicate package IDs
              are saved as imported copies instead of replacing existing rows.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {importFileName
              ? `Last selected file: ${importFileName}`
              : "No import file selected yet."}
          </div>
          {importMessage ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {importMessage}
            </div>
          ) : null}
          {importIssues.length > 0 ? (
            <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <div className="flex items-start gap-3 font-medium">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                Import failed before rendering or saving.
              </div>
              <ul className="space-y-2">
                {importIssues.slice(0, 12).map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-sans text-base font-semibold text-slate-950">
            Weekly Content Queue
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {weeklyQueueDescription}
          </p>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-4">
          {(
            [
              ["ready", weeklyQueueGroups.ready],
              ["not posted", weeklyQueueGroups["not posted"]],
              ["posted", weeklyQueueGroups.posted],
              ["missing metrics", weeklyQueueGroups["missing metrics"]],
            ] as const
          ).map(([state, rows]) => (
            <div
              key={state}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-sans text-sm font-semibold capitalize text-slate-950">
                  {state}
                </h3>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                  {rows.length}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {rows.length === 0 ? (
                  <p className="text-sm leading-6 text-slate-500">
                    No drafts in this queue.
                  </p>
                ) : (
                  rows.slice(0, 6).map((row) => (
                    <article
                      key={`${state}-${row.draftId}`}
                      className="rounded-md border border-slate-200 bg-white p-3"
                    >
                      <div className="text-sm font-semibold text-slate-950">
                        {row.title}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {row.accountName} / {row.platform}
                      </div>
                      <div className="mt-2 break-all font-mono text-[11px] leading-5 text-slate-500">
                        {row.url}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-sans text-base font-semibold text-slate-950">
            Media And Creative History
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tracks what media metadata and creative angle were used without
            storing images, videos, uploads, patient media, or raw files.
          </p>
        </div>
        <div className="grid gap-5 p-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-950">
              What have I posted recently?
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {recentSummaryText}
            </p>
            {recentlyPostedRows.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {recentlyPostedRows.map((row) => (
                  <div
                    key={`recent-${row.draftId}`}
                    className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600"
                  >
                    <div className="font-semibold text-slate-950">
                      {row.title}
                    </div>
                    <div>
                      {row.projectId} / {row.accountName} / {row.platform} /{" "}
                      {row.mediaType} / {row.creativeAngle}
                    </div>
                    <div className="break-all font-mono text-xs text-slate-500">
                      {row.postedUrl || "Posted URL not recorded"}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <label className="grid gap-2 text-xs font-semibold text-slate-600">
              Media type
              <select
                value={historyMediaType}
                onChange={(event) =>
                  setHistoryMediaType(event.target.value as "all" | OpsMediaType)
                }
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
              >
                <option value="all">all</option>
                {mediaTypes.map((mediaType) => (
                  <option key={mediaType} value={mediaType}>
                    {mediaType}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-slate-600">
              Creative angle
              <select
                value={historyCreativeAngle}
                onChange={(event) =>
                  setHistoryCreativeAngle(
                    event.target.value as "all" | OpsCreativeAngle,
                  )
                }
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
              >
                <option value="all">all</option>
                {creativeAngles.map((angle) => (
                  <option key={angle} value={angle}>
                    {angle}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-slate-600">
              Project
              <select
                value={historyProjectId}
                onChange={(event) =>
                  setHistoryProjectId(event.target.value as "all" | OpsProjectId)
                }
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
              >
                <option value="all">all</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-slate-600">
              Platform
              <select
                value={historyPlatform}
                onChange={(event) => setHistoryPlatform(event.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
              >
                <option value="all">all</option>
                {historyPlatforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-slate-600">
              Posted state
              <select
                value={historyPostedFilter}
                onChange={(event) =>
                  setHistoryPostedFilter(event.target.value as PostedFilter)
                }
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
              >
                <option value="all">all</option>
                <option value="posted">posted</option>
                <option value="not posted">not posted</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3">
            {filteredHistoryRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                {noMediaHistoryMessage}
              </div>
            ) : (
              filteredHistoryRows.map((row) => (
                <article
                  key={`history-${row.draftId}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="font-sans text-sm font-semibold text-slate-950">
                        {row.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {row.packageTitle}
                      </p>
                    </div>
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                      {row.postStatus}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-slate-500">Project</dt>
                      <dd className="font-medium text-slate-900">
                        {row.projectId}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Account / platform</dt>
                      <dd className="font-medium text-slate-900">
                        {row.accountName} / {row.platform}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Media / angle</dt>
                      <dd className="font-medium text-slate-900">
                        {row.mediaType} / {row.creativeAngle}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Effort / reuse</dt>
                      <dd className="font-medium text-slate-900">
                        {row.productionEffort} / {row.reuseStatus}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Visual hook</dt>
                      <dd className="font-medium text-slate-900">
                        {row.visualHook}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Posted at</dt>
                      <dd className="font-medium text-slate-900">
                        {row.postedAt || "Not posted"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Metrics state</dt>
                      <dd className="font-medium text-slate-900">{row.state}</dd>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4">
                      <dt className="text-slate-500">Posted URL</dt>
                      <dd className="break-all font-mono text-xs leading-5 text-slate-600">
                        {row.postedUrl || "Not posted"}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-sans text-base font-semibold text-slate-950">
            Select Products, Accounts, And Platforms
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Targets are manual-only publication destinations. No posting or ad
            spend API is connected.
          </p>
        </div>
        <div className="grid gap-3 p-5 lg:grid-cols-2">
          {publicationTargets.map((target) => {
            const blocked = targetIsBlocked(target);

            return (
              <label
                key={target.id}
                className={`flex gap-3 rounded-lg border border-slate-200 p-4 text-sm ${
                  blocked
                    ? "cursor-not-allowed bg-slate-100 text-slate-500"
                    : "cursor-pointer bg-slate-50"
                }`}
              >
                <input
                  checked={selectedTargetIds.includes(target.id)}
                  disabled={blocked}
                  onChange={() => toggleTarget(target.id)}
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block font-semibold text-slate-950">
                    {target.accountName}
                  </span>
                  <span className="mt-1 block text-slate-600">
                    {target.platform} / {target.audience} / {target.publicHandle}
                  </span>
                  {blocked ? (
                    <span className="mt-2 inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                      {target.accountStatus}
                    </span>
                  ) : null}
                  <span className="mt-2 block text-xs leading-5 text-slate-500">
                    {target.sourceBoundary}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-sans text-base font-semibold text-slate-950">
              Platform-Specific Draft Slots
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Generate deterministic slots from the update, or add blank slots
              manually. This is not AI generation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateDraftSlots}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <ClipboardCheck className="h-4 w-4" />
              Generate Slots
            </button>
            <button
              type="button"
              onClick={addBlankDraftSlot}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Blank Slot
            </button>
          </div>
        </div>
        <div className="grid gap-4 p-5">
          {draftSlots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              Select targets, then generate or add draft slots.
            </div>
          ) : (
            draftSlots.map((slot) => {
              const target =
                publicationTargets.find((item) => item.id === slot.targetId) ??
                publicationTargets[0];

              return (
                <article
                  key={slot.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
                    <div className="grid gap-4">
                      <label className="grid gap-2 text-sm font-semibold text-slate-700">
                        Target
                        <select
                          value={slot.targetId}
                          onChange={(event) =>
                            updateDraftSlot(slot.id, {
                              targetId: event.target.value,
                            })
                          }
                          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                        >
                          {publicationTargets.map((item) => (
                            <option
                              key={item.id}
                              value={item.id}
                              disabled={targetIsBlocked(item)}
                            >
                              {item.accountName} / {item.platform}
                              {targetIsBlocked(item)
                                ? ` / ${item.accountStatus}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-700">
                        Status
                        <select
                          value={slot.status}
                          onChange={(event) =>
                            updateDraftSlot(slot.id, {
                              status: event.target.value as PlatformDraftStatus,
                            })
                          }
                          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                        >
                          {[
                            "slot",
                            "drafted",
                            "needs review",
                            "approved",
                            "posted",
                            "archived",
                          ].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
                        UTM destination: {target?.defaultDestinationUrl}
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Media Metadata Only
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Describe media references only. Do not upload files,
                          patient images, encounter media, transcripts, private
                          messages, or raw logs.
                        </p>
                        <div className="mt-3 grid gap-3">
                          <label className="grid gap-2 text-xs font-semibold text-slate-600">
                            Media type
                            <select
                              value={slot.mediaType}
                              onChange={(event) =>
                                updateDraftSlot(slot.id, {
                                  mediaType: event.target.value as OpsMediaType,
                                })
                              }
                              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
                            >
                              {mediaTypes.map((mediaType) => (
                                <option key={mediaType} value={mediaType}>
                                  {mediaType}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-2 text-xs font-semibold text-slate-600">
                            Creative angle
                            <select
                              value={slot.creativeAngle}
                              onChange={(event) =>
                                updateDraftSlot(slot.id, {
                                  creativeAngle: event.target
                                    .value as OpsCreativeAngle,
                                })
                              }
                              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
                            >
                              {creativeAngles.map((angle) => (
                                <option key={angle} value={angle}>
                                  {angle}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-2 text-xs font-semibold text-slate-600">
                              Effort
                              <select
                                value={slot.productionEffort}
                                onChange={(event) =>
                                  updateDraftSlot(slot.id, {
                                    productionEffort: event.target
                                      .value as OpsProductionEffort,
                                  })
                                }
                                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
                              >
                                {productionEfforts.map((effort) => (
                                  <option key={effort} value={effort}>
                                    {effort}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="grid gap-2 text-xs font-semibold text-slate-600">
                              Reuse
                              <select
                                value={slot.reuseStatus}
                                onChange={(event) =>
                                  updateDraftSlot(slot.id, {
                                    reuseStatus: event.target
                                      .value as OpsMediaReuseStatus,
                                  })
                                }
                                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
                              >
                                {reuseStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <label className="grid gap-2 text-xs font-semibold text-slate-600">
                            Media summary
                            <textarea
                              value={slot.mediaSummary}
                              onChange={(event) =>
                                updateDraftSlot(slot.id, {
                                  mediaSummary: event.target.value,
                                })
                              }
                              className="min-h-16 rounded-md border border-slate-300 bg-white p-2 text-sm leading-5 text-slate-900"
                            />
                          </label>
                          <label className="grid gap-2 text-xs font-semibold text-slate-600">
                            Visual hook
                            <input
                              value={slot.visualHook}
                              onChange={(event) =>
                                updateDraftSlot(slot.id, {
                                  visualHook: event.target.value,
                                })
                              }
                              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
                            />
                          </label>
                          <label className="grid gap-2 text-xs font-semibold text-slate-600">
                            Asset reference
                            <input
                              value={slot.assetLocation}
                              onChange={(event) =>
                                updateDraftSlot(slot.id, {
                                  assetLocation: event.target.value,
                                })
                              }
                              placeholder="External URL, local path note, or reference ID only"
                              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <label className="grid gap-2 text-sm font-semibold text-slate-700">
                        Draft title
                        <input
                          value={slot.title}
                          onChange={(event) =>
                            updateDraftSlot(slot.id, { title: event.target.value })
                          }
                          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-700">
                        Draft body
                        <textarea
                          value={slot.body}
                          onChange={(event) =>
                            updateDraftSlot(slot.id, { body: event.target.value })
                          }
                          className="min-h-36 rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-800"
                        />
                      </label>
                    </div>
                  </div>
                </article>
              );
            })
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={saveContentPackage}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <Save className="h-4 w-4" />
              {saveButtonLabel}
            </button>
            <p className="text-sm text-slate-500">
              {saveButtonHelper}
            </p>
          </div>

          {saveMessage ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {saveMessage}
            </div>
          ) : null}

          {saveIssues.length > 0 ? (
            <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <div className="flex items-start gap-3 font-medium">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                Fix these before saving or updating.
              </div>
              <ul className="space-y-2">
                {saveIssues.slice(0, 12).map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-sans text-base font-semibold text-slate-950">
            {savedPackagesTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {savedPackagesDescription}
          </p>
        </div>
        <div className="grid gap-5 p-5">
          {packetMessage ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {packetMessage}
            </div>
          ) : null}

          {aiPromptMessage ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {aiPromptMessage}
            </div>
          ) : null}

          {records.map((record) => {
            const manualAiPrompt = buildManualAiPrompt({
              audienceProfiles,
              brandProfiles,
              draftReviewChecklist,
              publicationTargets,
              record,
            });
            const manualAiPromptIssues = issueText(
              manualAiPrompt,
              "manualAiPromptPreview",
            );

            return (
            <article
              key={record.contentPackage.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-sans text-lg font-semibold text-slate-950">
                    {record.contentPackage.title}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    {record.sourceUpdate.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => exportPackage(record)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Export Package
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyPostPacket(record)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Post Packet
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyAiPrompt(record)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    <Copy className="h-4 w-4" />
                    Copy AI Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => repairGeneratedDraftBodies(record)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Repair Generated Drafts
                  </button>
                  <select
                    value={record.contentPackage.status}
                    onChange={(event) =>
                      updateRecord(record.contentPackage.id, {
                        contentPackage: {
                          ...record.contentPackage,
                          status: event.target.value as ContentPackageStatus,
                          updatedAt: new Date().toISOString(),
                        },
                      })
                    }
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
                  >
                    {packageStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <AiImprovePanel
                aiStatus={aiStatus}
                audienceProfiles={audienceProfiles}
                brandProfiles={brandProfiles}
                draftReviewChecklist={draftReviewChecklist}
                onApplyProposals={applyAiProposals}
                onRevertDraft={revertAiDraft}
                publicationTargets={publicationTargets}
                record={record}
              />

              <details className="mt-5 rounded-lg border border-amber-200 bg-amber-50/60">
                <summary className="cursor-pointer p-4 text-sm font-semibold text-amber-950">
                  AI Prompt Preview - manual copy only
                </summary>
                <div className="grid gap-4 border-t border-amber-200 p-4">
                  <div className="rounded-md border border-amber-200 bg-white p-3 text-sm leading-6 text-amber-950">
                    Manual AI bridge only. Review before using. No AI API is
                    connected. This preview excludes internal notes, secret
                    values, raw logs, private messages, transcripts, clinical
                    payloads, patient data, and media files.
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-md border border-slate-200 bg-white p-3">
                      <h4 className="font-sans text-sm font-semibold text-slate-950">
                        Included Context
                      </h4>
                      <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                        <li>Metadata-only source update title and summary</li>
                        <li>Brand rules and prohibited claims</li>
                        <li>Selected audience profiles</li>
                        <li>Platform/account targets and UTM links</li>
                        <li>Media metadata descriptions only</li>
                        <li>Existing deterministic drafts as starting material</li>
                      </ul>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white p-3">
                      <h4 className="font-sans text-sm font-semibold text-slate-950">
                        Excluded Context
                      </h4>
                      <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                        <li>Internal source notes and package notes</li>
                        <li>PHI, patient identifiers, encounter text, transcripts, or clinical payloads</li>
                        <li>Credentials, cookies, tokens, OAuth data, private messages, and raw logs</li>
                        <li>Media files, uploads, storage buckets, and binary assets</li>
                        <li>Posting, ad-spend, database, or API mutation instructions</li>
                      </ul>
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <h4 className="font-sans text-sm font-semibold text-slate-950">
                      Safety Checklist
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                      {draftReviewChecklist.map((item) => (
                        <li key={`ai-${record.contentPackage.id}-${item}`}>
                          {item}
                        </li>
                      ))}
                    </ul>
                    {manualAiPromptIssues.length > 0 ? (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                        Prompt preview blocked by metadata-only validation:{" "}
                        {manualAiPromptIssues.join("; ")}
                      </div>
                    ) : null}
                  </div>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                    {manualAiPrompt}
                  </pre>
                </div>
              </details>

              <div className="mt-5 grid gap-4">
                {record.platformDrafts.map((draft) => {
                  const post = record.publishedPosts.find(
                    (item) => item.platformDraftId === draft.id,
                  );
                  const snapshot = post
                    ? record.performanceSnapshots.find(
                        (item) => item.publishedPostId === post.id,
                      )
                    : undefined;

                  return (
                    <div
                      key={draft.id}
                      className="rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-slate-500" />
                            <h4 className="font-sans text-base font-semibold text-slate-950">
                              {draft.accountName} / {draft.platform}
                            </h4>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {draft.body}
                          </p>
                          <p className="mt-3 break-all font-mono text-xs leading-5 text-slate-500">
                            {draft.generatedUrl}
                          </p>
                          <dl className="mt-4 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 sm:grid-cols-2">
                            <div>
                              <dt className="font-semibold text-slate-700">
                                Media type
                              </dt>
                              <dd>{draft.media.mediaType}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-slate-700">
                                Creative angle
                              </dt>
                              <dd>{draft.media.creativeAngle}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-slate-700">
                                Effort / reuse
                              </dt>
                              <dd>
                                {draft.media.productionEffort} /{" "}
                                {draft.media.reuseStatus}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-slate-700">
                                Asset reference
                              </dt>
                              <dd className="break-all">
                                {draft.media.assetLocation ?? "None"}
                              </dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="font-semibold text-slate-700">
                                Media summary
                              </dt>
                              <dd>{draft.media.mediaSummary}</dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="font-semibold text-slate-700">
                                Visual hook
                              </dt>
                              <dd>{draft.media.visualHook}</dd>
                            </div>
                          </dl>
                        </div>

                        <div className="grid gap-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-2 text-sm font-semibold text-slate-700">
                              Posted state
                              <select
                                value={post?.status ?? "not posted"}
                                onChange={(event) =>
                                  post
                                    ? updatePublishedPost(record, post.id, {
                                        postedManuallyAt:
                                          event.target.value === "posted"
                                            ? new Date().toISOString()
                                            : undefined,
                                        status: event.target
                                          .value as PublishedPostStatus,
                                      })
                                    : undefined
                                }
                                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                              >
                                {["not posted", "posted", "archived"].map(
                                  (status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>

                            <label className="grid gap-2 text-sm font-semibold text-slate-700">
                              Published URL
                              <input
                                value={post?.postedUrl ?? post?.postUrl ?? ""}
                                onChange={(event) =>
                                  post
                                    ? updatePublishedPost(record, post.id, {
                                        postedUrl: event.target.value,
                                        postUrl: event.target.value,
                                      })
                                    : undefined
                                }
                                placeholder="https://..."
                                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                              />
                            </label>
                          </div>

                          {snapshot ? (
                            <div className="grid gap-3 sm:grid-cols-5">
                              {(
                                [
                                  "impressions",
                                  "clicks",
                                  "reactions",
                                  "comments",
                                  "saves",
                                ] as const
                              ).map((field) => (
                                <label
                                  key={field}
                                  className="grid gap-2 text-xs font-semibold capitalize text-slate-600"
                                >
                                  {field}
                                  <input
                                    value={snapshot[field]}
                                    onChange={(event) =>
                                      updatePerformanceSnapshot(record, snapshot.id, {
                                        [field]: event.target.value,
                                      })
                                    }
                                    className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
                                  />
                                </label>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="font-sans text-sm font-semibold text-slate-950">
                  Business Outcome
                </h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {(["leads", "conversations", "revenue"] as const).map((field) => (
                    <label
                      key={field}
                      className="grid gap-2 text-sm font-semibold capitalize text-slate-700"
                    >
                      {field}
                      <input
                        value={record.businessOutcome[field]}
                        onChange={(event) =>
                          updateBusinessOutcome(record, {
                            [field]: event.target.value,
                          })
                        }
                        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
