import { assertNoForbiddenOpsKeys } from "@/lib/ops/safety";
import type { OpsDashboardData } from "@/lib/ops/types";
import { buildUtmUrl } from "@/lib/ops/utm";

const syncSoapDestination = "https://www.bringhurstdo.com/syncsoap";
const syncSafetyDestination = "https://www.bringhurstdo.com/syncsafety";

// Metadata-only mock data for the private BringhurstDO operator console.
// Never add PHI, patient identifiers, encounter IDs, transcripts, secret values,
// cookies, tokens, raw logs, or clinical payloads to this module.
export const opsDashboardData: OpsDashboardData = {
  generatedAt: "2026-06-06T09:00:00-04:00",
  boundaries: [
    "Metadata summaries only",
    "No PHI or clinical payloads",
    "No secret values or raw logs",
    "Manual approval before social posting or spend",
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
        "Aggregate AWS cost subtotal",
        "Aggregate AI usage and cost totals",
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
          value: "Mock: 4 drafts",
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
        "Read-only deployment status",
        "Read-only marketing aggregate",
        "Content calendar export",
      ],
    },
    {
      id: "bringhurstdo",
      name: "BringhurstDO",
      role: "Parent company and ops aggregator",
      status: "Phase 2 mock workspace",
      statusTone: "good",
      owner: "BringhurstDO",
      environment: "This app, protected by Basic Auth",
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
          value: "Mock: expanded",
          detail: "No AI generation connected",
          tone: "good",
        },
        {
          label: "Content queue",
          value: "Mock: working",
          detail: "Manual tracking only; no posting API",
          tone: "good",
        },
      ],
      nextActions: [
        "Replace Basic Auth before mutation features",
        "Review mock operator report every Friday",
        "Keep future integration contracts metadata-only",
      ],
      integrationTodos: [
        "Read-only deployment status",
        "Scheduled local report generation",
        "Future auth provider or SSO",
      ],
    },
  ],
  contentIdeas: [
    {
      id: "idea-syncsoap-small-clinic-pilot",
      projectId: "syncsoap",
      title: "Small-clinic pilot readiness",
      angle:
        "Position SyncSOAP as a practical documentation workflow for small clinics before larger enterprise claims.",
      audience: "clinic owners",
      channelFit: ["LinkedIn", "Blog", "Email"],
      status: "idea",
      riskLevel: "medium",
      sourceBoundary:
        "Use product positioning and aggregate readiness notes only; no clinical payload examples.",
      notes: [
        "Keep claims measured",
        "Emphasize metadata-only evidence posture",
        "Avoid patient examples",
      ],
      createdAt: "2026-06-06",
    },
    {
      id: "idea-syncsoap-charting-fatigue",
      projectId: "syncsoap",
      title: "Charting fatigue without clinical details",
      angle:
        "Talk about documentation burden at the workflow level, not from specific encounters.",
      audience: "physicians",
      channelFit: ["LinkedIn", "X", "Blog"],
      status: "needs review",
      riskLevel: "high",
      sourceBoundary:
        "Use general workflow language only; no anecdotes from patient care.",
      notes: [
        "Review for overclaiming",
        "Avoid scribe-comparison claims without support",
      ],
      createdAt: "2026-06-06",
    },
    {
      id: "idea-syncsafety-osha-friction",
      projectId: "syncsafety",
      title: "OSHA workflow friction",
      angle:
        "Frame SyncSafety as a calmer way to organize incident documentation work.",
      audience: "general",
      channelFit: ["LinkedIn", "Blog"],
      status: "drafted",
      riskLevel: "low",
      sourceBoundary:
        "Use public product positioning and manual planning notes only.",
      notes: ["Keep claims product-led", "No external metrics connected"],
      createdAt: "2026-06-06",
    },
    {
      id: "idea-bringhurstdo-operator-console",
      projectId: "bringhurstdo",
      title: "Operator console philosophy",
      angle:
        "Explain why BringhurstDO aggregates business metadata while source apps keep sensitive data.",
      audience: "investors",
      channelFit: ["Blog", "LinkedIn", "Email"],
      status: "approved",
      riskLevel: "medium",
      sourceBoundary:
        "Discuss architecture principles without exposing internal security details.",
      notes: [
        "Keep private dashboard screenshots out of public posts",
        "Manual approval before publishing",
      ],
      createdAt: "2026-06-06",
    },
  ],
  draftPosts: [
    {
      id: "draft-syncsoap-beta-positioning",
      ideaId: "idea-syncsoap-small-clinic-pilot",
      projectId: "syncsoap",
      title: "SyncSOAP beta positioning update",
      channel: "LinkedIn",
      audience: "clinic owners",
      status: "idea",
      publishWindow: "Week of 2026-06-09",
      bodyPreview:
        "A practical note on small-clinic documentation drag and why the first SyncSOAP pilots stay deliberately narrow.",
      approvalRequired: true,
      utmCampaignId: "utm-syncsoap-beta-linkedin",
      safetyNotes: [
        "No patient stories",
        "No clinical examples",
        "No performance claims without review",
      ],
    },
    {
      id: "draft-syncsoap-physician-workflow",
      ideaId: "idea-syncsoap-charting-fatigue",
      projectId: "syncsoap",
      title: "Physician workflow note",
      channel: "X",
      audience: "physicians",
      status: "needs review",
      publishWindow: "Unscheduled",
      bodyPreview:
        "A short thread about documentation burden using only general workflow language.",
      approvalRequired: true,
      utmCampaignId: "utm-syncsoap-workflow-x",
      safetyNotes: [
        "Review tone carefully",
        "No encounter-level details",
        "No implied clinical output guarantees",
      ],
    },
    {
      id: "draft-syncsafety-osha-workflow",
      ideaId: "idea-syncsafety-osha-friction",
      projectId: "syncsafety",
      title: "OSHA workflow friction post",
      channel: "LinkedIn",
      audience: "general",
      status: "drafted",
      publishWindow: "Week of 2026-06-16",
      bodyPreview:
        "A product-led post about reducing administrative drag in safety documentation workflows.",
      approvalRequired: true,
      utmCampaignId: "utm-syncsafety-osha-linkedin",
      safetyNotes: [
        "Keep claims product-led",
        "Avoid implying automated filing without approval",
      ],
    },
    {
      id: "draft-bringhurstdo-ops-philosophy",
      ideaId: "idea-bringhurstdo-operator-console",
      projectId: "bringhurstdo",
      title: "Parent-company ops philosophy note",
      channel: "Blog",
      audience: "investors",
      status: "approved",
      publishWindow: "Unscheduled",
      bodyPreview:
        "A public-safe explanation of why BringhurstDO aggregates only metadata from project systems.",
      approvalRequired: true,
      safetyNotes: [
        "Keep ops-console details private",
        "Do not reveal internal cost or security posture",
      ],
    },
    {
      id: "draft-syncsafety-email-seed",
      ideaId: "idea-syncsafety-osha-friction",
      projectId: "syncsafety",
      title: "Safety manager email seed",
      channel: "Email",
      audience: "general",
      status: "posted",
      publishWindow: "Manual log: 2026-06-05",
      bodyPreview:
        "Manual tracking row for a previously sent positioning email; no sending API is connected.",
      approvalRequired: true,
      postedManuallyAt: "2026-06-05",
      safetyNotes: [
        "Manual posted tracking only",
        "No recipient list stored in BringhurstDO Ops",
      ],
    },
  ],
  utmCampaignLinks: [
    {
      id: "utm-syncsoap-beta-linkedin",
      projectId: "syncsoap",
      label: "SyncSOAP beta LinkedIn",
      destinationUrl: syncSoapDestination,
      source: "linkedin",
      medium: "organic",
      campaign: "syncsoap_beta",
      content: "small_clinic_pilot",
      generatedUrl: buildUtmUrl({
        destinationUrl: syncSoapDestination,
        source: "linkedin",
        medium: "organic",
        campaign: "syncsoap_beta",
        content: "small_clinic_pilot",
      }),
      status: "ready",
      notes: ["Default public SyncSOAP destination", "Manual posting only"],
    },
    {
      id: "utm-syncsoap-workflow-x",
      projectId: "syncsoap",
      label: "SyncSOAP workflow X thread",
      destinationUrl: syncSoapDestination,
      source: "x",
      medium: "organic",
      campaign: "syncsoap_workflow",
      content: "physician_thread",
      generatedUrl: buildUtmUrl({
        destinationUrl: syncSoapDestination,
        source: "x",
        medium: "organic",
        campaign: "syncsoap_workflow",
        content: "physician_thread",
      }),
      status: "mock",
      notes: ["Review copy before use", "No autoposting"],
    },
    {
      id: "utm-syncsafety-osha-linkedin",
      projectId: "syncsafety",
      label: "SyncSafety OSHA LinkedIn",
      destinationUrl: syncSafetyDestination,
      source: "linkedin",
      medium: "organic",
      campaign: "syncsafety_osha",
      content: "workflow_friction",
      generatedUrl: buildUtmUrl({
        destinationUrl: syncSafetyDestination,
        source: "linkedin",
        medium: "organic",
        campaign: "syncsafety_osha",
        content: "workflow_friction",
      }),
      status: "ready",
      notes: ["Default public SyncSafety destination", "Manual posting only"],
    },
  ],
  projectHealthSnapshots: [
    {
      id: "health-syncsoap-2026-06-06",
      projectId: "syncsoap",
      name: "SyncSOAP",
      siteStatus: "Mock: reachable",
      siteStatusTone: "neutral",
      deployStatus: "Mock: last deploy stable",
      deployStatusTone: "good",
      monthlyCostEstimate: "Mock: review manually",
      tractionNotes: [
        "Small-clinic pilot framing is the near-term bar",
        "Evidence status should remain summarized outside SyncSOAP",
      ],
      nextAction: "Draft metadata export contract before any live pull",
      capturedAt: "2026-06-06",
    },
    {
      id: "health-syncsafety-2026-06-06",
      projectId: "syncsafety",
      name: "SyncSafety",
      siteStatus: "Mock: public page active",
      siteStatusTone: "good",
      deployStatus: "Mock: no deploy check connected",
      deployStatusTone: "neutral",
      monthlyCostEstimate: "Mock: low",
      tractionNotes: [
        "Content pipeline has first safety workflow post ready",
        "Marketing metrics are intentionally not connected",
      ],
      nextAction: "Create read-only status file when source app is ready",
      capturedAt: "2026-06-06",
    },
    {
      id: "health-bringhurstdo-2026-06-06",
      projectId: "bringhurstdo",
      name: "BringhurstDO",
      siteStatus: "Mock: public pages unchanged",
      siteStatusTone: "good",
      deployStatus: "Mock: local build verified",
      deployStatusTone: "good",
      monthlyCostEstimate: "Mock: Vercel hobby-scale",
      tractionNotes: [
        "Private ops routes are Basic Auth protected",
        "Phase 2 remains local/mock-only",
      ],
      nextAction: "Verify production protection plan before deployment",
      capturedAt: "2026-06-06",
    },
  ],
  weeklyReport: {
    id: "weekly-operator-report-2026-06-01",
    weekStart: "2026-06-01",
    weekEnd: "2026-06-07",
    generatedAt: "2026-06-06T09:00:00-04:00",
    mode: "mock",
    summary:
      "Phase 2 turns the private console into a local working surface for content planning, project health snapshots, UTM helper links, and weekly operator review.",
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
          "Draft queue model supports manual planning and posted tracking.",
          "Posting remains manual until explicit approval and stronger controls exist.",
        ],
      },
    ],
    weeklyWins: [
      "Private ops dashboard shell is protected and build-verified.",
      "Content workspace model now separates ideas, drafts, and UTM links.",
      "Project health snapshots are modeled without live credentials.",
    ],
    risksAndBlockers: [
      "Basic Auth is still temporary and should not protect future mutation features alone.",
      "SyncSOAP integration must start from a metadata-only export contract.",
      "Production deployment should wait for env and protection review.",
    ],
    costNotes: [
      "No paid services were added.",
      "Cost estimates are mock notes until aggregate billing summaries are approved.",
    ],
    marketingOutput: [
      "Five mock draft rows are ready for manual review.",
      "Three UTM helper links are generated for public destinations only.",
      "No social posting API is connected.",
    ],
    nextActions: [
      "Review SyncSOAP metadata export fields.",
      "Approve or archive draft rows manually.",
      "Decide whether future reporting should be JSON, Markdown, or both.",
    ],
  },
};

assertNoForbiddenOpsKeys(opsDashboardData);
