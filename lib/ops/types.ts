import type { MetadataOnlyString, SafeOpsText } from "@/lib/ops/safety";

export type OpsProjectId = "syncsoap" | "syncsafety" | "bringhurstdo";

export type OpsAccountProjectId = OpsProjectId | "kyle-bringhurst";

export type OpsTone = "good" | "watch" | "blocked" | "neutral";

export type ContentChannel =
  | "LinkedIn"
  | "Instagram"
  | "Facebook"
  | "X"
  | "Blog"
  | "Email";

export type SocialMetricPlatform =
  | "Meta/Instagram"
  | "Meta/Facebook"
  | "LinkedIn"
  | "X";

export type PublicationPlatform = ContentChannel;

export type ContentAudience =
  | "physicians"
  | "clinic owners"
  | "med students"
  | "EHS leaders"
  | "investors"
  | "general";

export type ContentStatus =
  | "idea"
  | "drafted"
  | "needs review"
  | "approved"
  | "posted"
  | "archived";

export type ContentRiskLevel = "low" | "medium" | "high";

export type WeeklyScorecardMetricId =
  | "posts"
  | "followers"
  | "websiteClicks"
  | "leads"
  | "conversations"
  | "spend"
  | "revenue";

export type ManualMetricSource = "manual" | "imported" | "future-read-only";

export type SourceUpdateType =
  | "product-update"
  | "launch-note"
  | "customer-learning"
  | "operator-note"
  | "weekly-review";

export type ContentPackageStatus =
  | "drafting"
  | "needs review"
  | "approved"
  | "partially posted"
  | "posted"
  | "archived";

export type PlatformDraftStatus =
  | "slot"
  | "drafted"
  | "needs review"
  | "approved"
  | "posted"
  | "archived";

export type PublishedPostStatus = "not posted" | "posted" | "archived";

export type OpsMediaType =
  | "none"
  | "image"
  | "carousel"
  | "screenshot"
  | "screen_recording"
  | "demo_video"
  | "reel"
  | "talking_head"
  | "mixed";

export type OpsCreativeAngle =
  | "build-in-public"
  | "product demo"
  | "problem/solution"
  | "founder story"
  | "workflow pain"
  | "before/after"
  | "educational"
  | "launch/update";

export type OpsProductionEffort = "low" | "medium" | "high";

export type OpsMediaReuseStatus = "new" | "reused" | "repurposed" | "remix";

export type OpsMediaMetadata = {
  mediaType: OpsMediaType;
  mediaSummary: SafeOpsText;
  visualHook: SafeOpsText;
  creativeAngle: OpsCreativeAngle;
  productionEffort: OpsProductionEffort;
  assetLocation?: MetadataOnlyString;
  reuseStatus: OpsMediaReuseStatus;
};

export type WeeklyScorecardMetric = {
  id: WeeklyScorecardMetricId;
  label: string;
  value: string;
  unit: string;
  weekStart: string;
  weekEnd: string;
  source: ManualMetricSource;
  tone: OpsTone;
  notes: SafeOpsText[];
};

export type OpsMetric = {
  label: string;
  value: string;
  detail: string;
  tone: OpsTone;
};

export type OpsProjectSummary = {
  id: OpsProjectId;
  name: string;
  role: string;
  status: string;
  statusTone: OpsTone;
  owner: string;
  environment: string;
  lastReviewedAt: string;
  metadataBoundary: string;
  metrics: OpsMetric[];
  nextActions: string[];
  integrationTodos: string[];
};

export type ContentIdea = {
  id: string;
  projectId: OpsProjectId;
  title: MetadataOnlyString;
  angle: SafeOpsText;
  audience: ContentAudience;
  channelFit: ContentChannel[];
  status: ContentStatus;
  riskLevel: ContentRiskLevel;
  sourceBoundary: MetadataOnlyString;
  notes: SafeOpsText[];
  createdAt: string;
};

export type DraftPost = {
  id: string;
  ideaId: string;
  projectId: OpsProjectId;
  title: MetadataOnlyString;
  channel: ContentChannel;
  audience: ContentAudience;
  status: ContentStatus;
  publishWindow: string;
  bodyPreview: SafeOpsText;
  approvalRequired: boolean;
  postedManuallyAt?: string;
  utmCampaignId?: string;
  safetyNotes: SafeOpsText[];
};

export type UtmCampaignLink = {
  id: string;
  projectId: OpsProjectId;
  label: MetadataOnlyString;
  destinationUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  generatedUrl: string;
  status: "mock" | "ready" | "archived";
  notes: SafeOpsText[];
};

export type ManualMetricEntry = {
  id: string;
  projectId: OpsProjectId;
  metricId: WeeklyScorecardMetricId;
  label: MetadataOnlyString;
  value: string;
  unit: string;
  weekStart: string;
  weekEnd: string;
  source: ManualMetricSource;
  enteredAt: string;
  notes: SafeOpsText[];
};

export type OpsAccountKind = "project" | "founder";

export type OpsAccountStatus =
  | "active"
  | "planned"
  | "blocked_pending_meta_trust"
  | "missing";

export type OpsAccountRegistryEntry = {
  id: string;
  projectId: OpsAccountProjectId;
  name: MetadataOnlyString;
  kind: OpsAccountKind;
  platform: ContentChannel | "Website";
  handle: MetadataOnlyString;
  profileUrl: string;
  role: MetadataOnlyString;
  notes: SafeOpsText[];
  accountType: MetadataOnlyString;
  publicHandle: MetadataOnlyString;
  status: OpsAccountStatus;
  statusTone: OpsTone;
  purpose: SafeOpsText;
  sourceBoundary: MetadataOnlyString;
  manualReviewCadence: string;
  allowedMetrics: MetadataOnlyString[];
  forbiddenData: MetadataOnlyString[];
  integrationPlaceholder: SafeOpsText;
};

export type OpsBrandProfile = {
  id: OpsAccountProjectId;
  displayName: MetadataOnlyString;
  role: MetadataOnlyString;
  voiceTone: SafeOpsText[];
  allowedTopics: SafeOpsText[];
  prohibitedClaims: SafeOpsText[];
  requiredDisclaimers: SafeOpsText[];
  safetyNotes: SafeOpsText[];
  sourceBoundary: MetadataOnlyString;
};

export type OpsAudienceProfile = {
  id: ContentAudience;
  label: MetadataOnlyString;
  description: SafeOpsText;
  contentUse: SafeOpsText[];
  safetyNotes: SafeOpsText[];
};

export type SocialMetricPlaceholder = {
  id: string;
  platform: SocialMetricPlatform;
  accountIds: string[];
  status: "placeholder" | "manual" | "future-read-only";
  sourceBoundary: MetadataOnlyString;
  futureMetrics: MetadataOnlyString[];
  forbiddenData: MetadataOnlyString[];
  notes: SafeOpsText[];
};

export type SourceUpdate = {
  id: string;
  /**
   * Product/project the source update is about. Future sourceDate values are
   * allowed for planned content; this remains metadata-only and must not carry
   * SyncSOAP clinical payloads.
   */
  sourceProjectId: OpsProjectId;
  /**
   * Backward-compatible alias for older exports. Prefer sourceProjectId in new
   * code so publishing/account attribution cannot be confused with source scope.
   */
  projectId: OpsProjectId;
  title: MetadataOnlyString;
  updateType: SourceUpdateType;
  summary: SafeOpsText;
  sourceDate: string;
  sourceBoundary: MetadataOnlyString;
  approvalRequired: boolean;
  createdAt: string;
  notes: SafeOpsText[];
};

export type PublicationTarget = {
  id: string;
  accountId: string;
  accountStatus?: OpsAccountStatus;
  projectId?: OpsProjectId;
  accountName: MetadataOnlyString;
  platform: PublicationPlatform;
  publicHandle: MetadataOnlyString;
  audience: ContentAudience;
  defaultDestinationUrl: string;
  sourceBoundary: MetadataOnlyString;
  approvalRequired: boolean;
  postingMode: "manual-only";
  spendMode: "manual-approval-required";
};

export type PlatformDraft = {
  id: string;
  contentPackageId: string;
  sourceUpdateId: string;
  publicationTargetId: string;
  sourceProjectId: OpsProjectId;
  publishingProjectId: OpsProjectId;
  /**
   * Backward-compatible alias for older exports. Prefer publishingProjectId in
   * new code when describing the account/brand doing the manual posting.
   */
  projectId: OpsProjectId;
  platform: PublicationPlatform;
  accountName: MetadataOnlyString;
  title: MetadataOnlyString;
  body: SafeOpsText;
  media: OpsMediaMetadata;
  status: PlatformDraftStatus;
  approvalRequired: boolean;
  utmCampaignId: string;
  generatedUrl: string;
  safetyNotes: SafeOpsText[];
  /** Internal operator/workflow notes — never paste to social platforms. */
  operatorNotes?: SafeOpsText[];
  /** Internal AI review reminders from the last apply run — not public copy. */
  aiReviewNotes?: SafeOpsText[];
  updatedAt: string;
  /** Preserved when an AI-improved body replaces a deterministic draft. */
  originalDeterministicBody?: SafeOpsText;
  /** Last successful Ops AI run that produced a pending or applied improvement. */
  lastAiRunId?: string;
  /** Content series this draft belongs to (Phase 8A). */
  seriesId?: string;
  /** 1-based position within the target's series schedule. */
  seriesIndex?: number;
  /** Suggested calendar day for manual posting (YYYY-MM-DD). Shown on 8B calendar; autoposted when 8C enabled. */
  suggestedScheduledFor?: string;
  /** Explicit operator opt-in for Phase 8C scheduled LinkedIn autopublish on suggestedScheduledFor. */
  autopublishEnabled?: boolean;
};

export type PublishedPost = {
  id: string;
  accountName: MetadataOnlyString;
  platform: PublicationPlatform;
  platformDraftId: string;
  projectId: OpsProjectId;
  publicationTargetId: string;
  status: PublishedPostStatus;
  postedAt?: string;
  postedUrl?: string;
  postedManuallyAt?: string;
  postUrl?: string;
  /** Platform post id/URN returned by the publishing API (enables reshares). */
  platformPostId?: MetadataOnlyString;
  manualNotes: SafeOpsText[];
};

export type PerformanceSnapshot = {
  id: string;
  publishedPostId: string;
  capturedAt: string;
  source: "manual";
  impressions: string;
  clicks: string;
  reactions: string;
  comments: string;
  saves: string;
  numericMetrics: {
    impressions: number;
    clicks: number;
    reactions: number;
    comments: number;
    saves: number;
  };
  notes: SafeOpsText[];
};

export type BusinessOutcome = {
  id: string;
  contentPackageId: string;
  capturedAt: string;
  source: "manual";
  leads: string;
  conversations: string;
  revenue: string;
  numericOutcomes: {
    leads: number;
    conversations: number;
    revenue: number;
  };
  notes: SafeOpsText[];
};

export type OpsContentPackageRecord = {
  businessOutcome: BusinessOutcome;
  contentPackage: ContentPackage;
  performanceSnapshots: PerformanceSnapshot[];
  platformDrafts: PlatformDraft[];
  publishedPosts: PublishedPost[];
  sourceUpdate: SourceUpdate;
};

export type OpsAiPromptHistoryRecord = {
  id: string;
  contentPackageId: string;
  createdAt: string;
  storageMode: "local-browser" | "database-ready";
  promptTitle: MetadataOnlyString;
  promptPreview: SafeOpsText;
  sourceBoundary: MetadataOnlyString;
  safetyChecklist: SafeOpsText[];
  includedContext: SafeOpsText[];
  excludedContext: SafeOpsText[];
  copiedManuallyAt?: string;
  notes: SafeOpsText[];
};

export type OpsAiProvider = "gemini" | "none" | "openai";

export type OpsAiPublicStatus = {
  disabledReason: string | null;
  enabled: boolean;
  manualReviewRequired: true;
  model: string | null;
  provider: OpsAiProvider;
  providerWarning: string | null;
};

export type OpsAiRunStatus =
  | "blocked_input"
  | "blocked_output"
  | "error"
  | "success";

export type OpsAiRunRecord = {
  id: string;
  contentPackageId: string;
  createdAt: string;
  provider: Exclude<OpsAiProvider, "none">;
  model: MetadataOnlyString;
  status: OpsAiRunStatus;
  inputSafetyResult: "fail" | "pass";
  outputSafetyResult: "fail" | "pass" | "skipped";
  platformCount: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: MetadataOnlyString;
  safetyIssues: SafeOpsText[];
  notes: SafeOpsText[];
  sourceBoundary: MetadataOnlyString;
};

export type OpsAiImprovedDraftProposal = {
  platformDraftId: string;
  platform: PublicationPlatform;
  accountName: MetadataOnlyString;
  title: MetadataOnlyString;
  body: SafeOpsText;
  mediaNote: SafeOpsText;
  safetyNotes: SafeOpsText[];
};

export type OpsAiImproveDraftsResponse = {
  manualReviewRequired: true;
  model: MetadataOnlyString;
  proposals: OpsAiImprovedDraftProposal[];
  provider: Exclude<OpsAiProvider, "none">;
  runId: string;
};

export type ContentSeriesMetadata = {
  id: string;
  postsPerWeek: number;
  seriesStartDate: string;
  updateType: SourceUpdateType;
  weekCount: number;
  /** When true, saved series drafts default autopublishEnabled on (still require approve). */
  autopublishSeries?: boolean;
};

export type OpsAiSeriesSplitProposal = {
  accountName: MetadataOnlyString;
  body: SafeOpsText;
  mediaNote: SafeOpsText;
  platform: PublicationPlatform;
  proposalId: string;
  publicationTargetId: string;
  safetyNotes: SafeOpsText[];
  seriesIndex: number;
  suggestedScheduledFor: string;
  title: MetadataOnlyString;
};

export type OpsAiSeriesSplitResponse = {
  manualReviewRequired: true;
  model: MetadataOnlyString;
  proposals: OpsAiSeriesSplitProposal[];
  provider: Exclude<OpsAiProvider, "none">;
  runId: string;
  seriesId: string;
};

export type OpsAiSeriesPlan = {
  postsPerWeek: number;
  reasoning: MetadataOnlyString;
  source: "ai" | "heuristic";
  totalPosts: number;
  weekCount: number;
};

export type OpsAiSeriesPlanResponse = {
  manualReviewRequired: true;
  model: MetadataOnlyString;
  plan: OpsAiSeriesPlan;
  provider: Exclude<OpsAiProvider, "none"> | "none";
  warning?: MetadataOnlyString;
};

export type OpsAutopublishDraftResultStatus = "error" | "published" | "skipped";

export type OpsAutopublishDraftResult = {
  accountName: MetadataOnlyString;
  contentPackageId: string;
  platform: PublicationPlatform;
  platformDraftId: string;
  postUrl?: string;
  reason?: SafeOpsText;
  status: OpsAutopublishDraftResultStatus;
};

export type OpsAutopublishRunStatus = "error" | "partial" | "success";

export type OpsAutopublishRunTrigger = "cron" | "manual";

export type OpsAutopublishRunRecord = {
  createdAt: string;
  draftResults: OpsAutopublishDraftResult[];
  errorCount: number;
  id: string;
  notes: SafeOpsText[];
  publishedCount: number;
  runDate: string;
  skippedCount: number;
  sourceBoundary: MetadataOnlyString;
  status: OpsAutopublishRunStatus;
  timeZone: MetadataOnlyString;
  trigger: OpsAutopublishRunTrigger;
};

export type OpsAutopublishPublicStatus = {
  cronConfigured: boolean;
  disabledReason: string | null;
  enabled: boolean;
  linkedInOnly: true;
  manualReviewRequired: false;
  platform: "LinkedIn";
  requiresDraftOptIn: true;
  requiresDraftStatus: "approved";
  runTimeLabel: MetadataOnlyString;
  timeZone: MetadataOnlyString;
};

export type OpsAutopublishRunResponse = {
  draftResults: OpsAutopublishDraftResult[];
  errorCount: number;
  publishedCount: number;
  runDate: string;
  runId: string;
  skippedCount: number;
  status: OpsAutopublishRunStatus;
  timeZone: MetadataOnlyString;
  trigger: OpsAutopublishRunTrigger;
};

export type OpsServerRecordMetadata = {
  id: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  sourceBoundary: MetadataOnlyString;
};

export type OpsServerContentPackageRecord = OpsServerRecordMetadata & {
  tableName: "ops_content_packages";
  data: ContentPackage;
};

export type OpsServerSourceUpdateRecord = OpsServerRecordMetadata & {
  tableName: "ops_source_updates";
  data: SourceUpdate;
};

export type OpsServerPlatformDraftRecord = OpsServerRecordMetadata & {
  tableName: "ops_platform_drafts";
  data: PlatformDraft;
};

export type OpsServerPublishedPostRecord = OpsServerRecordMetadata & {
  tableName: "ops_published_posts";
  data: PublishedPost;
};

export type OpsServerPerformanceSnapshotRecord = OpsServerRecordMetadata & {
  tableName: "ops_performance_snapshots";
  data: PerformanceSnapshot;
};

export type OpsServerBusinessOutcomeRecord = OpsServerRecordMetadata & {
  tableName: "ops_business_outcomes";
  data: BusinessOutcome;
};

export type OpsServerMediaMetadataRecord = OpsServerRecordMetadata & {
  tableName: "ops_media_metadata";
  platformDraftId: string;
  data: OpsMediaMetadata;
};

export type OpsServerAccountRegistryRecord = OpsServerRecordMetadata & {
  tableName: "ops_account_registry";
  data: OpsAccountRegistryEntry;
};

export type OpsServerBrandRuleRecord = OpsServerRecordMetadata & {
  tableName: "ops_brand_rules";
  data: OpsBrandProfile;
};

export type OpsServerAudienceProfileRecord = OpsServerRecordMetadata & {
  tableName: "ops_audience_profiles";
  data: OpsAudienceProfile;
};

export type OpsServerAiPromptHistoryRecord = OpsServerRecordMetadata & {
  tableName: "ops_ai_prompt_history";
  data: OpsAiPromptHistoryRecord;
};

export type OpsServerAiRunRecord = OpsServerRecordMetadata & {
  tableName: "ops_ai_runs";
  data: OpsAiRunRecord;
};

export type OpsServerPersistenceRecord =
  | OpsServerAccountRegistryRecord
  | OpsServerAiPromptHistoryRecord
  | OpsServerAiRunRecord
  | OpsServerAudienceProfileRecord
  | OpsServerBrandRuleRecord
  | OpsServerBusinessOutcomeRecord
  | OpsServerContentPackageRecord
  | OpsServerMediaMetadataRecord
  | OpsServerPerformanceSnapshotRecord
  | OpsServerPlatformDraftRecord
  | OpsServerPublishedPostRecord
  | OpsServerSourceUpdateRecord;

export type ContentPackage = {
  id: string;
  sourceUpdateId: string;
  title: MetadataOnlyString;
  sourceProjectIds: OpsProjectId[];
  publishingProjectIds: OpsProjectId[];
  /**
   * Backward-compatible combined project list for older views/imports. Prefer
   * sourceProjectIds and publishingProjectIds in new code.
   */
  projectIds: OpsProjectId[];
  publicationTargetIds: string[];
  status: ContentPackageStatus;
  approvalRequired: boolean;
  createdAt: string;
  updatedAt: string;
  notes: SafeOpsText[];
  /** Present when the package was created from a weekly summary series split. */
  series?: ContentSeriesMetadata;
};

export type ProjectHealthSnapshot = {
  id: string;
  projectId: OpsProjectId;
  name: string;
  siteStatus: string;
  siteStatusTone: OpsTone;
  deployStatus: string;
  deployStatusTone: OpsTone;
  monthlyCostEstimate: string;
  tractionNotes: SafeOpsText[];
  nextAction: SafeOpsText;
  capturedAt: string;
};

export type WeeklyReportSection = {
  title: string;
  tone: OpsTone;
  items: string[];
};

export type WeeklyOperatorReport = {
  id: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  mode: "mock";
  summary: string;
  sections: WeeklyReportSection[];
  weeklyWins: SafeOpsText[];
  risksAndBlockers: SafeOpsText[];
  costNotes: SafeOpsText[];
  marketingOutput: SafeOpsText[];
  nextActions: SafeOpsText[];
};

export type OpsDashboardData = {
  generatedAt: string;
  boundaries: string[];
  projects: OpsProjectSummary[];
  brandProfiles: OpsBrandProfile[];
  audienceProfiles: OpsAudienceProfile[];
  draftReviewChecklist: SafeOpsText[];
  weeklyReport: WeeklyOperatorReport;
  weeklyScorecard: WeeklyScorecardMetric[];
  contentIdeas: ContentIdea[];
  draftPosts: DraftPost[];
  utmCampaignLinks: UtmCampaignLink[];
  manualMetricEntries: ManualMetricEntry[];
  accountRegistry: OpsAccountRegistryEntry[];
  socialMetricPlaceholders: SocialMetricPlaceholder[];
  sourceUpdates: SourceUpdate[];
  publicationTargets: PublicationTarget[];
  contentPackages: ContentPackage[];
  platformDrafts: PlatformDraft[];
  publishedPosts: PublishedPost[];
  performanceSnapshots: PerformanceSnapshot[];
  businessOutcomes: BusinessOutcome[];
  projectHealthSnapshots: ProjectHealthSnapshot[];
};

// --- Phase 7A: Social account connection + manual-approved publishing ---
//
// These models support an explicitly approved, server-only OAuth connection for
// one platform at a time (LinkedIn first). Tokens never reach the browser; only
// public connection status and post results are returned to the client. Every
// publish remains operator-approved on a per-draft basis.

export type SocialConnectionPlatform = "LinkedIn";

export type SocialAuthorType = "organization" | "member";

/**
 * Public, browser-safe connection status. Never includes tokens, refresh
 * tokens, client secrets, or any credential material.
 */
export type SocialConnectionPublicStatus = {
  platform: SocialConnectionPlatform;
  /** Ops account id this connection maps to (e.g. account-founder-linkedin). */
  accountId: string;
  /** Configured display label for this account. */
  configuredLabel: MetadataOnlyString;
  /** Intended author type for this account (member vs organization). */
  configuredAuthorType: SocialAuthorType;
  /** Integration is enabled by env flag and required config is present. */
  configured: boolean;
  /** A stored, non-expired connection exists for this account. */
  connected: boolean;
  /** Why the integration is unavailable, when configured is false. */
  disabledReason: string | null;
  authorType: SocialAuthorType | null;
  /** Public display label for the connected author (e.g. account name). */
  accountLabel: MetadataOnlyString | null;
  /** Public handle/URN suffix is omitted; only a masked author id is shown. */
  authorIdMasked: string | null;
  /** ISO timestamp when the stored access token expires. */
  expiresAt: string | null;
  /** True when the stored token is expired or about to expire. */
  expired: boolean;
  scopes: string[];
  connectedAt: string | null;
  /** Manual approval is always required before any publish. */
  manualApprovalRequired: true;
};

/** Multi-account status response listing every configured account. */
export type SocialConnectionsStatusResponse = {
  platform: SocialConnectionPlatform;
  configured: boolean;
  disabledReason: string | null;
  accounts: SocialConnectionPublicStatus[];
};

/**
 * Server-only stored connection record. Token fields are encrypted at rest and
 * must never be serialized into client props, exports, logs, or screenshots.
 */
export type SocialConnectionRecord = {
  id: string;
  platform: SocialConnectionPlatform;
  accountId: string;
  authorType: SocialAuthorType;
  authorUrn: string;
  accountLabel: MetadataOnlyString;
  /** AES-256-GCM ciphertext of the access token. */
  accessTokenCipher: string;
  /** AES-256-GCM ciphertext of the refresh token, when provided. */
  refreshTokenCipher: string | null;
  scopes: string[];
  expiresAt: string;
  refreshTokenExpiresAt: string | null;
  connectedAt: string;
  updatedAt: string;
  sourceBoundary: MetadataOnlyString;
};

export type SocialPublishRequest = {
  platform: SocialConnectionPlatform;
  contentPackageId: string;
  platformDraftId: string;
  publicationTargetId: string;
  accountId: string;
  title: MetadataOnlyString;
  body: SafeOpsText;
  linkUrl?: string;
  /** Operator must explicitly confirm the draft is approved for posting. */
  confirmApproved: true;
};

export type SocialPublishResult = {
  platform: SocialConnectionPlatform;
  accountId: string;
  platformDraftId: string;
  publicationTargetId: string;
  platformPostId: string;
  postUrl: string;
  postedAt: string;
  publishLogId: string;
};

/** Reshare an already-published post from another connected account. */
export type SocialReshareRequest = {
  platform: SocialConnectionPlatform;
  accountId: string;
  contentPackageId: string;
  sourcePlatformDraftId: string;
  sourcePostUrn: string;
  commentary?: SafeOpsText;
  /** Operator must explicitly confirm the amplification. */
  confirmApproved: true;
};

export type SocialReshareResult = {
  platform: SocialConnectionPlatform;
  accountId: string;
  sourcePlatformDraftId: string;
  platformPostId: string;
  postUrl: string;
  postedAt: string;
  publishLogId: string;
};

export type SocialPublishLogStatus = "success" | "blocked" | "error";

/**
 * Server-only audit row for every publish attempt. Metadata only: it records
 * what was posted where and the outcome, never the access token.
 */
export type SocialPublishLogRecord = {
  id: string;
  platform: SocialConnectionPlatform;
  contentPackageId: string;
  platformDraftId: string;
  publicationTargetId: string;
  accountId: string;
  authorUrn: string;
  status: SocialPublishLogStatus;
  platformPostId: string | null;
  postUrl: string | null;
  bodyPreview: SafeOpsText;
  notes: SafeOpsText[];
  createdAt: string;
  sourceBoundary: MetadataOnlyString;
};
