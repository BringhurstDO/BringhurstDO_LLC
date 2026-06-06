export type OpsProjectId = "syncsoap" | "syncsafety" | "bringhurstdo";

export type OpsTone = "good" | "watch" | "blocked" | "neutral";

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
};

export type ContentDraftStatus =
  | "idea"
  | "draft"
  | "review"
  | "approved"
  | "scheduled";

export type ContentDraft = {
  id: string;
  projectId: OpsProjectId;
  title: string;
  channel: "LinkedIn" | "X" | "Instagram" | "Website";
  audience: string;
  status: ContentDraftStatus;
  publishWindow: string;
  approvalRequired: boolean;
  sourceKind: "mock" | "manual";
  safetyNotes: string[];
};

export type OpsDashboardData = {
  generatedAt: string;
  boundaries: string[];
  projects: OpsProjectSummary[];
  weeklyReport: WeeklyOperatorReport;
  contentDrafts: ContentDraft[];
};
