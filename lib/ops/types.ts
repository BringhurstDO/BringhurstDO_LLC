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
