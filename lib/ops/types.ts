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
  status: PlatformDraftStatus;
  approvalRequired: boolean;
  utmCampaignId: string;
  generatedUrl: string;
  safetyNotes: SafeOpsText[];
  updatedAt: string;
};

export type PublishedPost = {
  id: string;
  platformDraftId: string;
  publicationTargetId: string;
  status: PublishedPostStatus;
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
