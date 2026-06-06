import type { OpsDashboardData } from "@/lib/ops/types";

// Metadata-only mock data for the private BringhurstDO operator console.
// Never add PHI, patient identifiers, encounter IDs, transcripts, secret values,
// cookies, tokens, raw logs, or clinical payloads to this module.
export const opsDashboardData: OpsDashboardData = {
  generatedAt: "2026-06-06T09:00:00-04:00",
  boundaries: [
    "Metadata summaries only",
    "No PHI or clinical payloads",
    "No secret values or raw logs",
    "Manual approval before social posting",
  ],
  projects: [
    {
      id: "syncsoap",
      name: "SyncSOAP",
      role: "HIPAA-sensitive clinical app",
      status: "Mock metadata only",
      statusTone: "watch",
      owner: "BringhurstDO",
      environment: "External app, no live connection",
      lastReviewedAt: "2026-06-06",
      metadataBoundary:
        "Only aggregate health, deployment, invite, cost, and evidence summaries belong here.",
      metrics: [
        {
          label: "Site health",
          value: "Mock: healthy",
          detail: "Future source: metadata-only status endpoint",
          tone: "neutral",
        },
        {
          label: "Compliance evidence",
          value: "Mock: collecting",
          detail: "Future source: evidence status summary, not evidence files",
          tone: "watch",
        },
        {
          label: "User / invite counts",
          value: "Mock: pending",
          detail: "Future source: aggregate counts only",
          tone: "neutral",
        },
      ],
      nextActions: [
        "Define a SyncSOAP metadata export contract",
        "Keep HIPAA app data ownership inside SyncSOAP",
        "Review pilot-readiness evidence summary weekly",
      ],
      integrationTodos: [
        "Read-only SyncSOAP health summary",
        "AWS Cost Explorer monthly subtotal",
        "AI usage and cost aggregate",
      ],
    },
    {
      id: "syncsafety",
      name: "SyncSafety",
      role: "Industrial compliance product",
      status: "Mock metadata only",
      statusTone: "neutral",
      owner: "BringhurstDO",
      environment: "Future project metadata feed",
      lastReviewedAt: "2026-06-06",
      metadataBoundary:
        "Only operational status, marketing status, and aggregate business metrics belong here.",
      metrics: [
        {
          label: "Product status",
          value: "Mock: active",
          detail: "Future source: public app uptime summary",
          tone: "good",
        },
        {
          label: "Content calendar",
          value: "Mock: 2 drafts",
          detail: "Draft queue requires manual approval",
          tone: "watch",
        },
        {
          label: "Marketing metrics",
          value: "Mock: not connected",
          detail: "Future source: read-only marketing aggregate",
          tone: "neutral",
        },
      ],
      nextActions: [
        "Create first read-only project status file",
        "Draft LinkedIn launch-support post",
        "Document public metrics worth tracking",
      ],
      integrationTodos: [
        "Vercel deployment status",
        "Read-only marketing aggregate",
        "Content calendar export",
      ],
    },
    {
      id: "bringhurstdo",
      name: "BringhurstDO",
      role: "Parent company and ops aggregator",
      status: "Phase 1 shell",
      statusTone: "good",
      owner: "BringhurstDO",
      environment: "This Vercel app",
      lastReviewedAt: "2026-06-06",
      metadataBoundary:
        "BringhurstDO aggregates summaries; source apps retain their own sensitive data.",
      metrics: [
        {
          label: "Ops console",
          value: "Mock: protected",
          detail: "Basic Auth middleware is temporary",
          tone: "watch",
        },
        {
          label: "Weekly report",
          value: "Mock: modeled",
          detail: "No AI generation connected",
          tone: "good",
        },
        {
          label: "Content queue",
          value: "Mock: modeled",
          detail: "Manual approval required before posting",
          tone: "good",
        },
      ],
      nextActions: [
        "Replace Basic Auth before mutation features",
        "Connect Vercel read-only deployment summaries",
        "Add weekly report generation cron after env review",
      ],
      integrationTodos: [
        "Vercel API read-only deploy status",
        "Vercel Cron weekly report job",
        "Future auth provider or Vercel SSO",
      ],
    },
  ],
  weeklyReport: {
    id: "weekly-operator-report-2026-06-01",
    weekStart: "2026-06-01",
    weekEnd: "2026-06-07",
    generatedAt: "2026-06-06T09:00:00-04:00",
    mode: "mock",
    summary:
      "Phase 1 establishes a private, metadata-only operator view with mock project status, weekly review structure, and a manually approved content queue.",
    sections: [
      {
        title: "Operational health",
        tone: "watch",
        items: [
          "SyncSOAP remains an external HIPAA-sensitive source system.",
          "BringhurstDO should consume only aggregate status once a safe export exists.",
          "Current dashboard values are mock placeholders.",
        ],
      },
      {
        title: "Cost and usage",
        tone: "neutral",
        items: [
          "No AWS, Vercel, or AI usage integrations are connected.",
          "Future reports should store summaries, not raw bills or secrets.",
        ],
      },
      {
        title: "Content pipeline",
        tone: "good",
        items: [
          "Draft queue model is ready for manual planning.",
          "Posting remains manual until explicit approval and stronger controls exist.",
        ],
      },
    ],
  },
  contentDrafts: [
    {
      id: "draft-syncsoap-beta-positioning",
      projectId: "syncsoap",
      title: "SyncSOAP beta positioning update",
      channel: "LinkedIn",
      audience: "Small-clinic operators and clinicians",
      status: "idea",
      publishWindow: "Week of 2026-06-09",
      approvalRequired: true,
      sourceKind: "mock",
      safetyNotes: [
        "No patient stories",
        "No clinical examples",
        "No performance claims without review",
      ],
    },
    {
      id: "draft-syncsafety-osha-workflow",
      projectId: "syncsafety",
      title: "OSHA workflow friction post",
      channel: "LinkedIn",
      audience: "Safety managers and plant leaders",
      status: "draft",
      publishWindow: "Week of 2026-06-16",
      approvalRequired: true,
      sourceKind: "mock",
      safetyNotes: [
        "Keep claims product-led",
        "Avoid implying automated filing without approval",
      ],
    },
    {
      id: "draft-bringhurstdo-operator-console",
      projectId: "bringhurstdo",
      title: "Parent-company ops philosophy note",
      channel: "Website",
      audience: "Prospective partners",
      status: "review",
      publishWindow: "Unscheduled",
      approvalRequired: true,
      sourceKind: "manual",
      safetyNotes: [
        "Keep ops-console details private",
        "Do not reveal internal cost or security posture",
      ],
    },
  ],
};
