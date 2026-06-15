"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";

import { StatusPill } from "@/app/ops/_components/ops-ui";
import {
  buildUtmForTarget,
  campaignName,
  currentCaptureDate,
  nowId,
  slugify,
  targetIsBlocked,
} from "@/lib/ops/content-package-utils";
import {
  DEFAULT_DRAFT_OPERATOR_NOTES,
  DEFAULT_DRAFT_SAFETY_NOTES,
  DEFAULT_PACKAGE_OPERATOR_NOTES,
  prepareSeriesPublishableBody,
  sanitizePublishableBody,
} from "@/lib/ops/publishable-copy";
import {
  countRebalancedDrafts,
  rebalanceContentPackageSchedules,
} from "@/lib/ops/schedule-rebalance";
import { collectMetadataOnlyIssues } from "@/lib/ops/safety";
import { formatPlatformScheduleDefault } from "@/lib/ops/platform-schedule-defaults";
import {
  createLocalStorageOpsPersistenceAdapter,
  createRemoteOpsPersistenceAdapter,
  type OpsStorageMode,
} from "@/lib/ops/persistence";
import { buildSeriesSchedule } from "@/lib/ops/series-schedule";
import type {
  BusinessOutcome,
  ContentPackage,
  OpsAiPublicStatus,
  OpsAiSeriesPlan,
  OpsAiSeriesPlanResponse,
  OpsAiSeriesSplitProposal,
  OpsAiSeriesSplitResponse,
  OpsContentPackageRecord,
  OpsMediaMetadata,
  OpsProjectId,
  OpsProjectSummary,
  PerformanceSnapshot,
  PlatformDraft,
  PublicationTarget,
  PublishedPost,
  SourceUpdate,
  SourceUpdateType,
} from "@/lib/ops/types";

type ContentSeriesBuilderProps = {
  aiStatus: OpsAiPublicStatus;
  initialRecords: OpsContentPackageRecord[];
  projects: OpsProjectSummary[];
  publicationTargets: PublicationTarget[];
  storageMode: Extract<OpsStorageMode, "database" | "local-browser">;
};

const storageKey = "bringhurstdo.ops.contentPackages.v1";
const maxSummaryImportBytes = 100_000;

const sourceUpdateTypes: SourceUpdateType[] = [
  "product-update",
  "launch-note",
  "customer-learning",
  "operator-note",
  "weekly-review",
];

const defaultMediaMetadata: OpsMediaMetadata = {
  creativeAngle: "build-in-public",
  mediaSummary: "No media planned.",
  mediaType: "none",
  productionEffort: "low",
  reuseStatus: "new",
  visualHook: "Text-only post.",
};

function uniqueProjectIds(projectIds: OpsProjectId[]) {
  return Array.from(new Set(projectIds));
}

function issueText(value: unknown, path: string) {
  return collectMetadataOnlyIssues(value, path).map(
    (issue) => `${issue.path}: ${issue.message}`,
  );
}

function defaultSeriesStartDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isContentPackageRecord(value: unknown): value is OpsContentPackageRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as OpsContentPackageRecord;

  return (
    Boolean(record.contentPackage?.id) &&
    Array.isArray(record.platformDrafts) &&
    Array.isArray(record.publishedPosts) &&
    Boolean(record.sourceUpdate?.id)
  );
}

export function ContentSeriesBuilder({
  aiStatus,
  initialRecords,
  projects,
  publicationTargets,
  storageMode,
}: ContentSeriesBuilderProps) {
  const storageIsDatabase = storageMode === "database";
  const [primaryProjectId, setPrimaryProjectId] =
    useState<OpsProjectId>("syncsoap");
  const [seriesTitle, setSeriesTitle] = useState("");
  const [updateType, setUpdateType] =
    useState<SourceUpdateType>("weekly-review");
  const [seriesSummary, setSeriesSummary] = useState("");
  const [seriesStartDate, setSeriesStartDate] = useState(defaultSeriesStartDate);
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [weekCount, setWeekCount] = useState(1);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [proposals, setProposals] = useState<OpsAiSeriesSplitProposal[]>([]);
  const [seriesId, setSeriesId] = useState("");
  const [runId, setRunId] = useState("");
  const [records, setRecords] = useState(initialRecords);
  const [issues, setIssues] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seriesAutopublish, setSeriesAutopublish] = useState(false);
  const [summaryFileName, setSummaryFileName] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [schedulePlan, setSchedulePlan] = useState<OpsAiSeriesPlan | null>(null);
  const summaryFileInputRef = useRef<HTMLInputElement>(null);

  function openSummaryFilePicker() {
    summaryFileInputRef.current?.click();
  }

  async function handleSummaryFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setSummaryFileName(file.name);
    setIssues([]);

    const allowed =
      file.type === "text/plain" ||
      file.type === "text/markdown" ||
      file.name.toLowerCase().endsWith(".txt") ||
      file.name.toLowerCase().endsWith(".md");

    if (!allowed) {
      setIssues(["Upload a .txt or .md metadata-only summary file."]);
      return;
    }

    if (file.size > maxSummaryImportBytes) {
      setIssues(["Summary files must be 100 KB or smaller."]);
      return;
    }

    try {
      const text = (await file.text()).trim();

      if (!text) {
        setIssues(["Selected summary file is empty."]);
        return;
      }

      if (text.length > 12_000) {
        setIssues(["Summary must be 12,000 characters or fewer."]);
        return;
      }

      setSeriesSummary(text);

      if (!seriesTitle.trim()) {
        const baseName = file.name.replace(/\.(txt|md)$/i, "").trim();
        if (baseName) {
          setSeriesTitle(baseName);
        }
      }

      setMessage(`Loaded summary from ${file.name}.`);
    } catch {
      setIssues([`Could not read ${file.name}.`]);
    }
  }

  const selectedTargets = useMemo(
    () =>
      selectedTargetIds
        .map((id) => publicationTargets.find((target) => target.id === id))
        .filter((target): target is PublicationTarget => Boolean(target)),
    [publicationTargets, selectedTargetIds],
  );

  const schedulePreview = useMemo(() => {
    try {
      return buildSeriesSchedule({
        postsPerWeek,
        seriesStartDate,
        weekCount,
      });
    } catch {
      return [];
    }
  }, [postsPerWeek, seriesStartDate, weekCount]);

  const slotCount =
    schedulePreview.length > 0
      ? schedulePreview.length * selectedTargets.length
      : 0;
  const selectedPlatformScheduleDefaults = useMemo(
    () =>
      Array.from(new Set(selectedTargets.map((target) => target.platform))).map(
        (platform) => formatPlatformScheduleDefault(platform),
      ),
    [selectedTargets],
  );

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
          if (isMounted) {
            setRecords([]);
          }
          return;
        }

        const migratedRecords = loaded.contentPackages.filter(isContentPackageRecord);

        if (isMounted && migratedRecords.length > 0) {
          setRecords(migratedRecords);
        }
      } catch {
        if (isMounted) {
          setIssues(["Stored content packages could not be loaded."]);
        }
      }
    }

    void loadStoredPackages();

    return () => {
      isMounted = false;
    };
  }, [createPersistenceAdapter]);

  function toggleTarget(targetId: string) {
    const target = publicationTargets.find((item) => item.id === targetId);

    if (target && targetIsBlocked(target)) {
      setIssues([
        `${target.accountName} is ${target.accountStatus}; activate the account before splitting.`,
      ]);
      return;
    }

    setSelectedTargetIds((current) =>
      current.includes(targetId)
        ? current.filter((id) => id !== targetId)
        : [...current, targetId],
    );
    setIssues([]);
  }

  async function suggestSchedule() {
    if (!seriesSummary.trim()) {
      setIssues(["Paste a weekly summary before suggesting a schedule."]);
      return;
    }

    if (selectedTargets.length === 0) {
      setIssues(["Select at least one publication target first."]);
      return;
    }

    setPlanLoading(true);
    setIssues([]);
    setSchedulePlan(null);

    try {
      const response = await fetch("/ops/api/ai/plan-series", {
        body: JSON.stringify({
          publicationTargetIds: selectedTargetIds,
          seriesSummary,
          seriesTitle,
          updateType,
        }),
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as OpsAiSeriesPlanResponse & {
        error?: string;
        issues?: string[];
      };

      if (!response.ok) {
        setIssues(
          payload.issues?.length
            ? payload.issues
            : [payload.error ?? `Schedule suggestion failed with ${response.status}.`],
        );
        return;
      }

      setSchedulePlan(payload.plan);
      setMessage(
        payload.plan.source === "ai"
          ? "AI suggested a schedule below. Apply it or adjust manually."
          : "Heuristic schedule suggested below (AI unavailable). Apply or adjust manually.",
      );
    } catch {
      setIssues(["Schedule suggestion request failed. Check network and try again."]);
    } finally {
      setPlanLoading(false);
    }
  }

  function applySchedulePlan() {
    if (!schedulePlan) {
      return;
    }

    setPostsPerWeek(schedulePlan.postsPerWeek);
    setWeekCount(schedulePlan.weekCount);
    setMessage(
      `Applied ${schedulePlan.totalPosts} posts at ${schedulePlan.postsPerWeek}/week over ${schedulePlan.weekCount} week${schedulePlan.weekCount === 1 ? "" : "s"}.`,
    );
  }

  async function splitSeries() {
    if (!aiStatus.enabled) {
      setIssues([
        aiStatus.disabledReason ??
          "Ops AI is disabled. Configure OPS_AI_ENABLED and a provider API key server-side.",
      ]);
      setMessage("");
      return;
    }

    setLoading(true);
    setIssues([]);
    setMessage("");
    setProposals([]);
    setSeriesId("");
    setRunId("");

    try {
      const response = await fetch("/ops/api/ai/split-series", {
        body: JSON.stringify({
          postsPerWeek,
          publicationTargetIds: selectedTargetIds,
          seriesStartDate,
          seriesSummary,
          seriesTitle,
          sourceProjectId: primaryProjectId,
          totalPosts: schedulePlan?.totalPosts,
          updateType,
          weekCount,
        }),
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as OpsAiSeriesSplitResponse & {
        error?: string;
        issues?: string[];
        runId?: string;
      };

      if (!response.ok) {
        setIssues(
          payload.issues?.length
            ? payload.issues
            : [payload.error ?? `Series split failed with ${response.status}.`],
        );
        setRunId(typeof payload.runId === "string" ? payload.runId : "");
        return;
      }

      setProposals(payload.proposals);
      setSeriesId(payload.seriesId);
      setRunId(payload.runId);
      setMessage(
        `Generated ${payload.proposals.length} draft proposals for manual review. Nothing was saved yet.`,
      );
    } catch {
      setIssues(["Series split request failed. Check network and try again."]);
    } finally {
      setLoading(false);
    }
  }

  function updateProposalBody(proposalId: string, body: string) {
    setProposals((current) =>
      current.map((proposal) =>
        proposal.proposalId === proposalId
          ? { ...proposal, body: sanitizePublishableBody(body) }
          : proposal,
      ),
    );
  }

  async function persistRecords(nextRecords: OpsContentPackageRecord[]) {
    const validationIssues = issueText(nextRecords, "contentPackageRecords");

    if (validationIssues.length > 0) {
      setIssues(validationIssues);
      setMessage("");
      return false;
    }

    try {
      const adapter = createPersistenceAdapter();
      const saved = await adapter.saveContentPackages(nextRecords);
      setRecords(nextRecords);
      setIssues([]);
      setMessage(
        `Saved series package (${proposals.length} drafts) to ${saved.source}.`,
      );
      return true;
    } catch {
      setIssues(["Ops storage save failed. Export from New Package view if needed."]);
      setMessage("");
      return false;
    }
  }

  async function saveSeriesPackage() {
    const baseIssues: string[] = [];

    if (!seriesTitle.trim()) {
      baseIssues.push("Series title is required.");
    }

    if (!seriesSummary.trim()) {
      baseIssues.push("Weekly summary is required.");
    }

    if (selectedTargets.length === 0) {
      baseIssues.push("Select at least one publication target.");
    }

    if (proposals.length === 0) {
      baseIssues.push("Split the summary with AI before saving.");
    }

    if (!seriesId) {
      baseIssues.push("Missing series id from the AI run. Split again before saving.");
    }

    if (baseIssues.length > 0) {
      setIssues(baseIssues);
      setMessage("");
      return;
    }

    setSaving(true);

    const idSuffix = nowId();
    const packageSlug = slugify(seriesTitle);
    const sourceUpdateId = `source-update-${packageSlug}-${idSuffix}`;
    const contentPackageId = `content-package-${packageSlug}-${idSuffix}`;
    const createdAt = new Date().toISOString();
    const capturedAt = currentCaptureDate();

    const sourceUpdate: SourceUpdate = {
      approvalRequired: true,
      createdAt,
      id: sourceUpdateId,
      notes: [
        "Created from weekly summary series split (Phase 8A).",
        runId ? `AI run: ${runId}` : "AI run id unavailable.",
      ],
      projectId: primaryProjectId,
      sourceProjectId: primaryProjectId,
      sourceBoundary:
        "Metadata-only weekly summary. No PHI, clinical payloads, credentials, private messages, or raw logs.",
      sourceDate: seriesStartDate,
      summary: seriesSummary,
      title: seriesTitle,
      updateType,
    };

    const publishingProjectIds = uniqueProjectIds(
      selectedTargets.map((target) => target.projectId ?? primaryProjectId),
    );

    const contentPackage: ContentPackage = {
      approvalRequired: true,
      createdAt,
      id: contentPackageId,
      notes: [
        ...DEFAULT_PACKAGE_OPERATOR_NOTES,
        seriesAutopublish
          ? "Series package with suggested dates and LinkedIn autopublish opt-in per draft."
          : "Series package with suggested publish dates — manual posting unless autopublish enabled per draft.",
      ],
      projectIds: uniqueProjectIds([primaryProjectId, ...publishingProjectIds]),
      publishingProjectIds,
      publicationTargetIds: selectedTargets.map((target) => target.id),
      series: {
        autopublishSeries: seriesAutopublish,
        id: seriesId,
        postsPerWeek,
        seriesStartDate,
        updateType,
        weekCount,
      },
      sourceProjectIds: [primaryProjectId],
      sourceUpdateId,
      status: "needs review",
      title: seriesTitle,
      updatedAt: createdAt,
    };

    const platformDrafts = proposals.map((proposal): PlatformDraft => {
      const target =
        publicationTargets.find(
          (item) => item.id === proposal.publicationTargetId,
        ) ?? selectedTargets[0];
      const campaign = `${campaignName(seriesTitle, target)}-s${proposal.seriesIndex}`;
      const content = `${target.id}_series_${proposal.seriesIndex}`;
      const generatedUrl = buildUtmForTarget(target, campaign, content);
      const body = prepareSeriesPublishableBody(proposal.body.trim());
      const publishingProjectId = target.projectId ?? primaryProjectId;

      return {
        accountName: target.accountName,
        aiReviewNotes: proposal.safetyNotes,
        approvalRequired: true,
        autopublishEnabled:
          seriesAutopublish && target.platform === "LinkedIn",
        body,
        contentPackageId,
        generatedUrl,
        id: `platform-draft-${packageSlug}-${target.id}-${proposal.seriesIndex}-${idSuffix}`,
        lastAiRunId: runId || undefined,
        media: {
          ...defaultMediaMetadata,
          mediaSummary: proposal.mediaNote || defaultMediaMetadata.mediaSummary,
        },
        operatorNotes: [...DEFAULT_DRAFT_OPERATOR_NOTES],
        platform: target.platform,
        projectId: publishingProjectId,
        publicationTargetId: target.id,
        publishingProjectId,
        safetyNotes: [
          ...DEFAULT_DRAFT_SAFETY_NOTES,
          ...proposal.safetyNotes,
        ],
        seriesId,
        seriesIndex: proposal.seriesIndex,
        sourceProjectId: primaryProjectId,
        sourceUpdateId,
        status: "needs review",
        suggestedScheduledFor: proposal.suggestedScheduledFor,
        title: proposal.title || seriesTitle,
        updatedAt: createdAt,
        utmCampaignId: `utm-${packageSlug}-${target.id}-s${proposal.seriesIndex}-${idSuffix}`,
      };
    });

    const publishedPosts = platformDrafts.map(
      (draft): PublishedPost => ({
        accountName: draft.accountName,
        id: `published-post-${draft.id}`,
        manualNotes: [
          "Track URL only after manual posting",
          draft.suggestedScheduledFor
            ? `Suggested date: ${draft.suggestedScheduledFor}`
            : "No suggested date",
        ],
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

    const record: OpsContentPackageRecord = {
      businessOutcome,
      contentPackage,
      performanceSnapshots,
      platformDrafts,
      publishedPosts,
      sourceUpdate,
    };

    try {
      const mergedRecords = [record, ...records];
      const rebalancedRecords = rebalanceContentPackageSchedules(mergedRecords, {
        postsPerWeek,
      });
      const changedCount = countRebalancedDrafts(mergedRecords, rebalancedRecords);

      await persistRecords(rebalancedRecords);

      if (changedCount > 0) {
        setMessage((current) =>
          current
            ? `${current} Rebalanced ${changedCount} pending draft date${changedCount === 1 ? "" : "s"} on the publish calendar.`
            : `Rebalanced ${changedCount} pending draft date${changedCount === 1 ? "" : "s"} on the publish calendar.`,
        );
      }
    } finally {
      setSaving(false);
    }
  }

  const groupedProposals = useMemo(() => {
    const groups = new Map<string, OpsAiSeriesSplitProposal[]>();

    for (const proposal of proposals) {
      const key = proposal.suggestedScheduledFor;
      const existing = groups.get(key) ?? [];
      existing.push(proposal);
      groups.set(key, existing);
    }

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [proposals]);

  return (
    <div className="grid min-w-0 gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-sans text-base font-semibold text-slate-950">
          Weekly Summary
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Paste one metadata-only weekly summary. AI splits it into
          platform-specific posts with suggested publish dates. Review every
          draft before saving — nothing autoposts.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Source project
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
              value={updateType}
              onChange={(event) =>
                setUpdateType(event.target.value as SourceUpdateType)
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

          <label className="grid gap-2 text-sm font-semibold text-slate-700 lg:col-span-2">
            Series title
            <input
              value={seriesTitle}
              onChange={(event) => setSeriesTitle(event.target.value)}
              placeholder="Week of June 9 — SyncSOAP build notes"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
            />
          </label>

          <div className="lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="grid flex-1 gap-2 text-sm font-semibold text-slate-700">
                Weekly summary
                <textarea
                  value={seriesSummary}
                  onChange={(event) => setSeriesSummary(event.target.value)}
                  rows={8}
                  placeholder="Paste or upload your metadata-only weekly summary here..."
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                ref={summaryFileInputRef}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                onChange={(event) => void handleSummaryFileChange(event)}
              />
              <button
                type="button"
                onClick={openSummaryFilePicker}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" aria-hidden />
                Upload .txt or .md
              </button>
              {summaryFileName ? (
                <span className="text-xs text-slate-500">
                  Last file: {summaryFileName}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-sans text-base font-semibold text-slate-950">
          Schedule & Targets
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Series start date
            <input
              type="date"
              value={seriesStartDate}
              onChange={(event) => setSeriesStartDate(event.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Posts per week
            <input
              type="number"
              min={1}
              max={7}
              value={postsPerWeek}
              onChange={(event) =>
                setPostsPerWeek(
                  Math.min(7, Math.max(1, Number.parseInt(event.target.value, 10) || 1)),
                )
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Weeks
            <input
              type="number"
              min={1}
              max={8}
              value={weekCount}
              onChange={(event) =>
                setWeekCount(
                  Math.min(8, Math.max(1, Number.parseInt(event.target.value, 10) || 1)),
                )
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={planLoading || !seriesSummary.trim() || selectedTargets.length === 0}
            onClick={() => void suggestSchedule()}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-violet-300 bg-violet-50 px-3 text-sm font-semibold text-violet-900 hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {planLoading ? "Suggesting…" : "Suggest schedule with AI"}
          </button>
          {schedulePlan ? (
            <button
              type="button"
              onClick={applySchedulePlan}
              className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Apply suggestion
            </button>
          ) : null}
        </div>

        {schedulePlan ? (
          <div className="mt-4 rounded-md border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-950">
            <p className="font-semibold">
              Suggested: {schedulePlan.totalPosts} post
              {schedulePlan.totalPosts === 1 ? "" : "s"} at {schedulePlan.postsPerWeek}
              /week over {schedulePlan.weekCount} week
              {schedulePlan.weekCount === 1 ? "" : "s"}
              {schedulePlan.source === "heuristic" ? " (heuristic)" : ""}
            </p>
            <p className="mt-1 text-violet-900">{schedulePlan.reasoning}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-slate-600">
            AI can recommend post count and spread based on your summary so posts
            do not repeat themselves. Saving a new series rebalances all pending
            calendar dates — recent updates get near-term slots without jumping
            ahead of older series.
          </p>
        )}

        {schedulePreview.length > 0 && selectedTargets.length > 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
            {slotCount} post{slotCount === 1 ? "" : "s"} across{" "}
            {selectedTargets.length} target
            {selectedTargets.length === 1 ? "" : "s"} on{" "}
            {schedulePreview.join(", ")}.
            {" "}
            Dates are calendar days — manual posts any time that day; LinkedIn
            autopublish runs once daily (~9:00 AM Eastern by default).
          </p>
        ) : null}

        {selectedPlatformScheduleDefaults.length > 0 ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Planning buckets only, not saved per draft yet:{" "}
            {selectedPlatformScheduleDefaults.join("; ")}. Future manual
            overrides should stay within configured cron buckets.
          </p>
        ) : null}

        <div className="mt-4 grid gap-2">
          <p className="text-sm font-semibold text-slate-700">Publication targets</p>
          <div className="flex flex-wrap gap-2">
            {publicationTargets.map((target) => {
              const blocked = targetIsBlocked(target);
              const selected = selectedTargetIds.includes(target.id);

              return (
                <button
                  key={target.id}
                  type="button"
                  disabled={blocked}
                  onClick={() => toggleTarget(target.id)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                    blocked
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : selected
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-300 bg-white text-slate-800 hover:border-slate-400"
                  }`}
                >
                  {target.accountName} / {target.platform}
                  {blocked ? ` (${target.accountStatus})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-md border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
          <input
            type="checkbox"
            checked={seriesAutopublish}
            onChange={(event) => setSeriesAutopublish(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-semibold">Enable LinkedIn autopublish for this series</span>
            <span className="mt-1 block text-xs leading-5 text-violet-900">
              Sets autopublish on each LinkedIn draft after save. Drafts must still
              be approved before the daily cron can publish them (Phase 8C).
            </span>
          </span>
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading || !aiStatus.enabled}
            onClick={() => void splitSeries()}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {loading ? "Splitting…" : "Split with AI"}
          </button>

          {!aiStatus.enabled ? (
            <p className="text-sm text-amber-800">
              {aiStatus.disabledReason ?? "Ops AI is disabled."}
            </p>
          ) : null}
        </div>
      </section>

      {issues.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Issues
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {message}
          </div>
          {proposals.length > 0 ? (
            <p className="mt-2">
              Edit drafts below, then save as a content package. Manage the schedule
              in{" "}
              <Link href="/ops/content/calendar" className="font-semibold underline">
                Publish Calendar
              </Link>{" "}
              or full editing in{" "}
              <Link href="/ops/content/new" className="font-semibold underline">
                New Content Package
              </Link>
              .
            </p>
          ) : null}
        </div>
      ) : null}

      {proposals.length > 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-sans text-base font-semibold text-slate-950">
                Review Proposals
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {proposals.length} drafts · run {runId || "unknown"}
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSeriesPackage()}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Save className="h-4 w-4" aria-hidden />
              {saving ? "Saving…" : storageIsDatabase ? "Save Package" : "Save Locally"}
            </button>
          </div>

          <div className="mt-5 grid gap-6">
            {groupedProposals.map(([date, dateProposals]) => (
              <div key={date}>
                <h3 className="flex items-center gap-2 font-sans text-sm font-semibold text-slate-800">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  Suggested {date}
                </h3>
                <div className="mt-3 grid gap-4">
                  {dateProposals.map((proposal) => (
                    <article
                      key={proposal.proposalId}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">
                          {proposal.accountName} / {proposal.platform}
                        </span>
                        <StatusPill tone="watch">
                          #{proposal.seriesIndex}
                        </StatusPill>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{proposal.title}</p>
                      <textarea
                        value={proposal.body}
                        onChange={(event) =>
                          updateProposalBody(
                            proposal.proposalId,
                            event.target.value,
                          )
                        }
                        rows={5}
                        className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900"
                      />
                      {proposal.safetyNotes.length > 0 ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900">
                          {proposal.safetyNotes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
