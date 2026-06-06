import type { MetadataOnlyString, SafeOpsText } from "@/lib/ops/safety";

export type OpsProjectId = "syncsoap" | "syncsafety" | "bringhurstdo";

export type OpsTone = "good" | "watch" | "blocked" | "neutral";

export type ContentChannel = "LinkedIn" | "Instagram" | "X" | "Blog" | "Email";

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
  contentIdeas: ContentIdea[];
  draftPosts: DraftPost[];
  utmCampaignLinks: UtmCampaignLink[];
  projectHealthSnapshots: ProjectHealthSnapshot[];
};
