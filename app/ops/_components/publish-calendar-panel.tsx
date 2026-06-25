"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Megaphone,
  Trash2,
} from "lucide-react";

import { CalendarPostPerformance } from "@/app/ops/_components/social-performance-panel";
import { StatusPill } from "@/app/ops/_components/ops-ui";
import { opsFetch } from "@/app/ops/_components/ops-fetch";
import { collectMetadataOnlyIssues } from "@/lib/ops/safety";
import {
  createLocalStorageOpsPersistenceAdapter,
  createRemoteOpsPersistenceAdapter,
  type OpsStorageMode,
} from "@/lib/ops/persistence";
import {
  buildPublishCalendarRows,
  filterPublishCalendarRows,
  formatScheduledPublishLabel,
  groupPublishCalendarRows,
  localCalendarDate,
  type PublishCalendarRow,
  type PublishCalendarTiming,
} from "@/lib/ops/publish-calendar";
import { removeDraftFromRecords } from "@/lib/ops/content-package-mutations";
import {
  bumpSundayToMonday,
  formatCalendarDateWithWeekday,
  isSundayDate,
} from "@/lib/ops/schedule-date-utils";
import {
  formatPlatformScheduleDefault,
  OPS_SCHEDULE_BUCKETS,
  platformScheduleBucketId,
} from "@/lib/ops/platform-schedule-defaults";
import { sanitizePublishableBody } from "@/lib/ops/publishable-copy";
import {
  findPublishedPostForDraft,
  resolveLatestPerformanceSnapshot,
} from "@/lib/ops/social-performance";
import type {
  OpsScheduleBucketId,
  OpsContentPackageRecord,
  PlatformDraft,
  PlatformDraftStatus,
  PublicationPlatform,
  PublicationTarget,
  SocialConnectionPublicStatus,
  SocialConnectionsStatusResponse,
  SocialPublishResult,
} from "@/lib/ops/types";

type PublishCalendarPanelProps = {
  initialRecords: OpsContentPackageRecord[];
  publicationTargets: PublicationTarget[];
  storageMode: Extract<OpsStorageMode, "database" | "local-browser">;
};

const storageKey = "bringhurstdo.ops.contentPackages.v1";

const timingTone: Record<
  PublishCalendarTiming,
  "blocked" | "good" | "neutral" | "watch"
> = {
  overdue: "blocked",
  posted: "good",
  today: "watch",
  unscheduled: "neutral",
  upcoming: "neutral",
};

const CALENDAR_BODY_PREVIEW_CHARS = 160;

function CalendarDraftBody({ body, platform }: { body: string; platform: PublicationPlatform }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = body.trim();
  const isLong = trimmed.length > CALENDAR_BODY_PREVIEW_CHARS;
  const preview = isLong
    ? `${trimmed.slice(0, CALENDAR_BODY_PREVIEW_CHARS).trim()}…`
    : trimmed;
  const charLabel =
    platform === "X" ? `${trimmed.length}/280 characters` : `${trimmed.length} characters`;

  return (
    <div className="mt-2 w-full min-w-0">
      <div
        className={`max-w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800 whitespace-pre-wrap break-words ${
          expanded ? "max-h-96 overflow-y-auto" : ""
        }`}
      >
        {expanded || !isLong ? trimmed : preview}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-500">{charLabel}</span>
        {isLong ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-950"
          >
            {expanded ? "Show less" : "Show full post"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function issueText(value: unknown, path: string) {
  return collectMetadataOnlyIssues(value, path).map(
    (issue) => `${issue.path}: ${issue.message}`,
  );
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

export function PublishCalendarPanel({
  initialRecords,
  publicationTargets,
  storageMode,
}: PublishCalendarPanelProps) {
  const storageIsDatabase = storageMode === "database";
  const [records, setRecords] = useState(initialRecords);
  const [issues, setIssues] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [platformFilter, setPlatformFilter] = useState<PublicationPlatform | "all">(
    "all",
  );
  const [includePosted, setIncludePosted] = useState(false);
  const [linkedinStatus, setLinkedinStatus] =
    useState<SocialConnectionsStatusResponse | null>(null);
  const [xStatus, setXStatus] = useState<SocialConnectionsStatusResponse | null>(
    null,
  );
  const [metaStatus, setMetaStatus] =
    useState<SocialConnectionsStatusResponse | null>(null);
  const [publishingDraftId, setPublishingDraftId] = useState<string | null>(null);
  const [autopublishStatus, setAutopublishStatus] = useState<{
    cronConfigured: boolean;
    disabledReason: string | null;
    enabled: boolean;
    runDateToday: string;
    runTimeLabel: string;
    timeZone: string;
  } | null>(null);
  const [runningAutopublish, setRunningAutopublish] = useState(false);
  const [runningXMetricsRefresh, setRunningXMetricsRefresh] = useState(false);
  const [enableAutopublishOnApprove, setEnableAutopublishOnApprove] =
    useState(false);

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

  useEffect(() => {
    async function loadLinkedInStatus() {
      try {
        const response = await opsFetch("/ops/api/social/linkedin/status", {
          cache: "no-store",
        });
        setLinkedinStatus((await response.json()) as SocialConnectionsStatusResponse);
      } catch {
        setLinkedinStatus(null);
      }
    }

    async function loadXStatus() {
      try {
        const response = await opsFetch("/ops/api/social/x/status", {
          cache: "no-store",
        });
        setXStatus((await response.json()) as SocialConnectionsStatusResponse);
      } catch {
        setXStatus(null);
      }
    }

    async function loadMetaStatus() {
      try {
        const response = await opsFetch("/ops/api/social/meta/status", {
          cache: "no-store",
        });
        setMetaStatus((await response.json()) as SocialConnectionsStatusResponse);
      } catch {
        setMetaStatus(null);
      }
    }

    void loadLinkedInStatus();
    void loadXStatus();
    void loadMetaStatus();
  }, []);

  useEffect(() => {
    async function loadAutopublishStatus() {
      try {
        const response = await opsFetch("/ops/api/autopublish/status", {
          cache: "no-store",
        });
        setAutopublishStatus(
          (await response.json()) as NonNullable<typeof autopublishStatus>,
        );
      } catch {
        setAutopublishStatus(null);
      }
    }

    void loadAutopublishStatus();
  }, []);

  const targetAccountIdById = useMemo(() => {
    const map = new Map<string, string>();

    for (const target of publicationTargets) {
      map.set(target.id, target.accountId);
    }

    return map;
  }, [publicationTargets]);

  const linkedInAccountStatus = useCallback(
    (accountId: string | undefined): SocialConnectionPublicStatus | null => {
      if (!accountId || !linkedinStatus) {
        return null;
      }

      return (
        linkedinStatus.accounts.find(
          (account) => account.accountId === accountId,
        ) ?? null
      );
    },
    [linkedinStatus],
  );

  const xAccountStatus = useCallback(
    (accountId: string | undefined): SocialConnectionPublicStatus | null => {
      if (!accountId || !xStatus) {
        return null;
      }

      return (
        xStatus.accounts.find((account) => account.accountId === accountId) ??
        null
      );
    },
    [xStatus],
  );

  const metaAccountStatus = useCallback(
    (accountId: string | undefined): SocialConnectionPublicStatus | null => {
      if (!accountId || !metaStatus) {
        return null;
      }

      return (
        metaStatus.accounts.find((account) => account.accountId === accountId) ??
        null
      );
    },
    [metaStatus],
  );

  const calendarRows = useMemo(() => {
    const rows = buildPublishCalendarRows(records);
    return filterPublishCalendarRows(rows, {
      includePosted,
      platform: platformFilter,
    });
  }, [includePosted, platformFilter, records]);

  const todayRows = useMemo(
    () => calendarRows.filter((row) => row.timing === "today"),
    [calendarRows],
  );
  const overdueRows = useMemo(
    () => calendarRows.filter((row) => row.timing === "overdue"),
    [calendarRows],
  );
  const dateGroups = useMemo(
    () =>
      groupPublishCalendarRows(
        calendarRows.filter(
          (row) => row.timing !== "today" && row.timing !== "overdue",
        ),
      ),
    [calendarRows],
  );

  const platforms = useMemo(
    () =>
      Array.from(new Set(buildPublishCalendarRows(records).map((row) => row.platform))).sort(),
    [records],
  );
  const platformScheduleDefaults = useMemo(
    () => platforms.map((platform) => formatPlatformScheduleDefault(platform)),
    [platforms],
  );
  const xDraftsPresent = platforms.includes("X");

  async function persistRecords(nextRecords: OpsContentPackageRecord[]) {
    const validationIssues = issueText(nextRecords, "contentPackageRecords");

    if (validationIssues.length > 0) {
      setIssues(validationIssues);
      setMessage("");
      return false;
    }

    try {
      const adapter = createPersistenceAdapter();
      await adapter.saveContentPackages(nextRecords);
      setRecords(nextRecords);
      setIssues([]);
      return true;
    } catch {
      setIssues(["Ops storage save failed."]);
      setMessage("");
      return false;
    }
  }

  function updateRecord(
    contentPackageId: string,
    updater: (record: OpsContentPackageRecord) => OpsContentPackageRecord,
  ) {
    const nextRecords = records.map((record) =>
      record.contentPackage.id === contentPackageId ? updater(record) : record,
    );

    void persistRecords(nextRecords);
  }

  function findDraftRecord(draftId: string) {
    for (const record of records) {
      const draft = record.platformDrafts.find((item) => item.id === draftId);

      if (draft) {
        return { draft, record };
      }
    }

    return null;
  }

  function approveDraft(row: PublishCalendarRow) {
    updateRecord(row.contentPackageId, (record) => ({
      ...record,
      contentPackage: {
        ...record.contentPackage,
        updatedAt: new Date().toISOString(),
      },
      platformDrafts: record.platformDrafts.map((draft) =>
        draft.id === row.draftId
          ? {
              ...draft,
              autopublishEnabled:
                enableAutopublishOnApprove || draft.autopublishEnabled,
              status: "approved" as PlatformDraftStatus,
              updatedAt: new Date().toISOString(),
            }
          : draft,
      ),
    }));
    setMessage(
      enableAutopublishOnApprove
        ? `Approved and enabled autopublish for ${row.accountName} / ${row.platform}.`
        : `Approved ${row.accountName} / ${row.platform} draft.`,
    );
  }

  function toggleAutopublish(row: PublishCalendarRow, enabled: boolean) {
    updateRecord(row.contentPackageId, (record) => ({
      ...record,
      contentPackage: {
        ...record.contentPackage,
        updatedAt: new Date().toISOString(),
      },
      platformDrafts: record.platformDrafts.map((draft) =>
        draft.id === row.draftId
          ? {
              ...draft,
              autopublishEnabled: enabled,
              updatedAt: new Date().toISOString(),
            }
          : draft,
      ),
    }));
    setMessage(
      enabled
        ? `Autopublish enabled for ${row.title}.`
        : `Autopublish disabled for ${row.title}.`,
    );
  }

  async function refreshXMetricsNow() {
    setRunningXMetricsRefresh(true);
    setIssues([]);

    try {
      const response = await opsFetch("/ops/api/social/x/metrics/refresh", {
        cache: "no-store",
        method: "POST",
      });
      const payload = (await response.json()) as {
        candidateCount?: number;
        error?: string;
        errors?: string[];
        updatedCount?: number;
      };

      if (!response.ok) {
        setIssues([payload.error ?? `X metrics refresh failed (${response.status}).`]);
        setMessage("");
        return;
      }

      const adapter = createPersistenceAdapter();
      const loaded = await adapter.loadContentPackages();
      setRecords(loaded.contentPackages.filter(isContentPackageRecord));

      const errorNotes =
        payload.errors && payload.errors.length > 0
          ? ` Issues: ${payload.errors.join(" ")}`
          : "";

      setMessage(
        `X metrics refreshed for ${payload.updatedCount ?? 0} of ${payload.candidateCount ?? 0} recent posts.${errorNotes}`,
      );
    } catch {
      setIssues(["X metrics refresh request failed."]);
    } finally {
      setRunningXMetricsRefresh(false);
    }
  }

  async function runAutopublishNow() {
    setRunningAutopublish(true);
    setIssues([]);

    try {
      const response = await opsFetch("/ops/api/autopublish/run", {
        cache: "no-store",
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        errorCount?: number;
        publishedCount?: number;
        runDate?: string;
        skippedCount?: number;
      };

      if (!response.ok) {
        setIssues([payload.error ?? `Autopublish run failed (${response.status}).`]);
        setMessage("");
        return;
      }

      const adapter = createPersistenceAdapter();
      const loaded = await adapter.loadContentPackages();
      setRecords(loaded.contentPackages.filter(isContentPackageRecord));
      setMessage(
        `Autopublish run for ${payload.runDate}: published ${payload.publishedCount ?? 0}, skipped ${payload.skippedCount ?? 0}, errors ${payload.errorCount ?? 0}.`,
      );
    } catch {
      setIssues(["Autopublish run request failed."]);
    } finally {
      setRunningAutopublish(false);
    }
  }

  function rescheduleDraft(row: PublishCalendarRow, nextDate: string) {
    let finalDate = nextDate;

    if (
      finalDate &&
      row.autopublishEnabled &&
      isSundayDate(finalDate)
    ) {
      const bumped = bumpSundayToMonday(finalDate);

      if (
        window.confirm(
          `Autopublish does not run on Sundays. Move this draft to ${formatCalendarDateWithWeekday(bumped)} instead?`,
        )
      ) {
        finalDate = bumped;
      }
    }

    updateRecord(row.contentPackageId, (record) => ({
      ...record,
      contentPackage: {
        ...record.contentPackage,
        updatedAt: new Date().toISOString(),
      },
      platformDrafts: record.platformDrafts.map((draft) =>
        draft.id === row.draftId
          ? {
              ...draft,
              suggestedScheduledFor: finalDate || undefined,
              updatedAt: new Date().toISOString(),
            }
          : draft,
      ),
    }));
    setMessage(
      finalDate
        ? `Rescheduled ${row.title} to ${formatCalendarDateWithWeekday(finalDate)}.`
        : `Cleared suggested date for ${row.title}.`,
    );
  }

  function rescheduleDraftBucket(
    row: PublishCalendarRow,
    nextBucketId: OpsScheduleBucketId,
  ) {
    updateRecord(row.contentPackageId, (record) => ({
      ...record,
      contentPackage: {
        ...record.contentPackage,
        updatedAt: new Date().toISOString(),
      },
      platformDrafts: record.platformDrafts.map((draft) =>
        draft.id === row.draftId
          ? {
              ...draft,
              suggestedScheduleBucketId: nextBucketId,
              updatedAt: new Date().toISOString(),
            }
          : draft,
      ),
    }));
    setMessage(`Updated ${row.title} publish window.`);
  }

  async function removeScheduledDraft(row: PublishCalendarRow) {
    if (row.postStatus === "posted") {
      setIssues(["Posted drafts cannot be removed from the calendar."]);
      return;
    }

    const confirmed = window.confirm(
      `Remove "${row.title}" from the calendar? This deletes the draft slot and cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    const nextRecords = removeDraftFromRecords(records, row.draftId);

    if (await persistRecords(nextRecords)) {
      setMessage(`Removed ${row.title} from the publish calendar.`);
    }
  }

  function mergeLinkedInPublishResult(
    record: OpsContentPackageRecord,
    draft: PlatformDraft,
    result: SocialPublishResult,
  ) {
    const existingPost = record.publishedPosts.find(
      (post) => post.platformDraftId === draft.id,
    );
    const publishNote = `Published to ${draft.platform} via Ops calendar. Post id: ${result.platformPostId}`;

    const nextPost = existingPost
      ? {
          ...existingPost,
          manualNotes: Array.from(
            new Set([...existingPost.manualNotes, publishNote]),
          ),
          platformPostId: result.platformPostId,
          postUrl: result.postUrl,
          postedAt: result.postedAt,
          postedManuallyAt: result.postedAt,
          postedUrl: result.postUrl,
          status: "posted" as const,
        }
      : {
          accountName: draft.accountName,
          id: `published-${draft.id}`,
          manualNotes: [publishNote],
          platform: draft.platform,
          platformDraftId: draft.id,
          platformPostId: result.platformPostId,
          postUrl: result.postUrl,
          postedAt: result.postedAt,
          postedManuallyAt: result.postedAt,
          postedUrl: result.postUrl,
          projectId: draft.publishingProjectId,
          publicationTargetId: draft.publicationTargetId,
          status: "posted" as const,
        };

    return {
      ...record,
      platformDrafts: record.platformDrafts.map((item) =>
        item.id === draft.id ? { ...item, status: "posted" as const } : item,
      ),
      publishedPosts: existingPost
        ? record.publishedPosts.map((post) =>
            post.id === nextPost.id ? nextPost : post,
          )
        : [...record.publishedPosts, nextPost],
    };
  }

  async function publishDraftToLinkedIn(row: PublishCalendarRow) {
    const match = findDraftRecord(row.draftId);

    if (!match) {
      setIssues(["Draft record not found."]);
      return;
    }

    const { draft, record } = match;
    const accountId = targetAccountIdById.get(draft.publicationTargetId);
    const accountStatus = linkedInAccountStatus(accountId);

    if (!accountStatus?.connected) {
      setIssues([
        "LinkedIn account is not connected. Connect it on the Accounts page first.",
      ]);
      return;
    }

    if (draft.status !== "approved") {
      setIssues(["Approve this draft before publishing to LinkedIn."]);
      return;
    }

    const confirmed = window.confirm(
      `Publish this approved draft to LinkedIn as ${accountStatus.accountLabel ?? draft.accountName}? This posts publicly.`,
    );

    if (!confirmed) {
      return;
    }

    setPublishingDraftId(draft.id);
    setIssues([]);

    try {
      const response = await opsFetch("/ops/api/social/linkedin/publish", {
        body: JSON.stringify({
          accountId,
          body: sanitizePublishableBody(draft.body),
          confirmApproved: true,
          contentPackageId: record.contentPackage.id,
          platformDraftId: draft.id,
          publicationTargetId: draft.publicationTargetId,
          title: draft.title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const data = (await response.json()) as
        | SocialPublishResult
        | { error?: string };

      if (!response.ok || !("postUrl" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : "LinkedIn publish failed.",
        );
      }

      const nextRecords = records.map((item) =>
        item.contentPackage.id === record.contentPackage.id
          ? mergeLinkedInPublishResult(item, draft, data)
          : item,
      );

      if (await persistRecords(nextRecords)) {
        setMessage(
          `Published ${draft.accountName} draft to LinkedIn. Public URL saved.`,
        );
      }
    } catch (error) {
      setIssues([
        error instanceof Error ? error.message : "LinkedIn publish failed.",
      ]);
    } finally {
      setPublishingDraftId(null);
    }
  }

  async function publishDraftToX(row: PublishCalendarRow) {
    const match = findDraftRecord(row.draftId);

    if (!match) {
      setIssues(["Draft record not found."]);
      return;
    }

    const { draft, record } = match;
    const accountId = targetAccountIdById.get(draft.publicationTargetId);
    const accountStatus = xAccountStatus(accountId);

    if (!accountStatus?.connected) {
      setIssues([
        "X account is not connected. Connect it on the Accounts page first.",
      ]);
      return;
    }

    if (draft.status !== "approved") {
      setIssues(["Approve this draft before publishing to X."]);
      return;
    }

    const confirmed = window.confirm(
      `Publish this approved draft to X as ${accountStatus.accountLabel ?? draft.accountName}? This posts publicly.`,
    );

    if (!confirmed) {
      return;
    }

    setPublishingDraftId(draft.id);
    setIssues([]);

    try {
      const response = await opsFetch("/ops/api/social/x/publish", {
        body: JSON.stringify({
          accountId,
          body: sanitizePublishableBody(draft.body),
          confirmApproved: true,
          contentPackageId: record.contentPackage.id,
          platformDraftId: draft.id,
          publicationTargetId: draft.publicationTargetId,
          title: draft.title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const data = (await response.json()) as
        | SocialPublishResult
        | { error?: string };

      if (!response.ok || !("postUrl" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : "X publish failed.",
        );
      }

      const nextRecords = records.map((item) =>
        item.contentPackage.id === record.contentPackage.id
          ? mergeLinkedInPublishResult(item, draft, data)
          : item,
      );

      if (await persistRecords(nextRecords)) {
        setMessage(`Published ${draft.accountName} draft to X. Public URL saved.`);
      }
    } catch (error) {
      setIssues([error instanceof Error ? error.message : "X publish failed."]);
    } finally {
      setPublishingDraftId(null);
    }
  }

  async function publishDraftToFacebook(row: PublishCalendarRow) {
    const match = findDraftRecord(row.draftId);

    if (!match) {
      setIssues(["Draft record not found."]);
      return;
    }

    const { draft, record } = match;
    const accountId = targetAccountIdById.get(draft.publicationTargetId);
    const accountStatus = metaAccountStatus(accountId);

    if (!accountStatus?.connected) {
      setIssues([
        "Facebook Page is not connected. Connect it on the Accounts page first.",
      ]);
      return;
    }

    if (draft.status !== "approved") {
      setIssues(["Approve this draft before publishing to Facebook."]);
      return;
    }

    const confirmed = window.confirm(
      `Publish this approved draft to Facebook as ${accountStatus.accountLabel ?? draft.accountName}? This posts publicly.`,
    );

    if (!confirmed) {
      return;
    }

    setPublishingDraftId(draft.id);
    setIssues([]);

    try {
      const response = await opsFetch("/ops/api/social/meta/publish", {
        body: JSON.stringify({
          accountId,
          body: sanitizePublishableBody(draft.body),
          confirmApproved: true,
          contentPackageId: record.contentPackage.id,
          platform: "Facebook",
          platformDraftId: draft.id,
          publicationTargetId: draft.publicationTargetId,
          title: draft.title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const data = (await response.json()) as
        | SocialPublishResult
        | { error?: string };

      if (!response.ok || !("postUrl" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : "Facebook publish failed.",
        );
      }

      const nextRecords = records.map((item) =>
        item.contentPackage.id === record.contentPackage.id
          ? mergeLinkedInPublishResult(item, draft, data)
          : item,
      );

      if (await persistRecords(nextRecords)) {
        setMessage(
          `Published ${draft.accountName} draft to Facebook. Public URL saved.`,
        );
      }
    } catch (error) {
      setIssues([
        error instanceof Error ? error.message : "Facebook publish failed.",
      ]);
    } finally {
      setPublishingDraftId(null);
    }
  }

  async function publishDraftToInstagram(row: PublishCalendarRow) {
    const match = findDraftRecord(row.draftId);

    if (!match) {
      setIssues(["Draft record not found."]);
      return;
    }

    const { draft, record } = match;
    const accountId = targetAccountIdById.get(draft.publicationTargetId);
    const accountStatus = metaAccountStatus(accountId);

    if (!accountStatus?.connected) {
      setIssues([
        "Instagram is not ready. Connect the linked Facebook Page on the Accounts page first.",
      ]);
      return;
    }

    if (draft.status !== "approved") {
      setIssues(["Approve this draft before publishing to Instagram."]);
      return;
    }

    const confirmed = window.confirm(
      `Publish this approved draft to Instagram as ${accountStatus.accountLabel ?? draft.accountName}? Ops will attach a brand default image unless you set media assetLocation on the draft.`,
    );

    if (!confirmed) {
      return;
    }

    setPublishingDraftId(draft.id);
    setIssues([]);

    try {
      const response = await opsFetch("/ops/api/social/meta/publish", {
        body: JSON.stringify({
          accountId,
          assetLocation: draft.media.assetLocation,
          body: sanitizePublishableBody(draft.body),
          confirmApproved: true,
          contentPackageId: record.contentPackage.id,
          platform: "Instagram",
          platformDraftId: draft.id,
          publicationTargetId: draft.publicationTargetId,
          publishingProjectId: draft.publishingProjectId,
          title: draft.title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const data = (await response.json()) as
        | SocialPublishResult
        | { error?: string };

      if (!response.ok || !("postUrl" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : "Instagram publish failed.",
        );
      }

      const nextRecords = records.map((item) =>
        item.contentPackage.id === record.contentPackage.id
          ? mergeLinkedInPublishResult(item, draft, data)
          : item,
      );

      if (await persistRecords(nextRecords)) {
        setMessage(
          `Published ${draft.accountName} draft to Instagram. Public URL saved.`,
        );
      }
    } catch (error) {
      setIssues([
        error instanceof Error ? error.message : "Instagram publish failed.",
      ]);
    } finally {
      setPublishingDraftId(null);
    }
  }

  function CalendarRowCard({ row }: { row: PublishCalendarRow }) {
    const packageRecord = records.find(
      (record) => record.contentPackage.id === row.contentPackageId,
    );
    const publishedPost = packageRecord
      ? findPublishedPostForDraft(packageRecord, row.draftId)
      : undefined;
    const performanceSnapshot =
      packageRecord && publishedPost
        ? resolveLatestPerformanceSnapshot(packageRecord, publishedPost.id)
        : null;
    const accountId = targetAccountIdById.get(row.publicationTargetId);
    const accountStatus = linkedInAccountStatus(accountId);
    const canPublishLinkedIn =
      row.platform === "LinkedIn" &&
      row.draftStatus === "approved" &&
      row.postStatus !== "posted" &&
      accountStatus?.connected;
    const xStatusForRow = xAccountStatus(accountId);
    const canPublishX =
      row.platform === "X" &&
      row.draftStatus === "approved" &&
      row.postStatus !== "posted" &&
      xStatusForRow?.connected;
    const metaStatusForRow = metaAccountStatus(accountId);
    const canPublishFacebook =
      row.platform === "Facebook" &&
      row.draftStatus === "approved" &&
      row.postStatus !== "posted" &&
      metaStatusForRow?.connected;
    const canPublishInstagram =
      row.platform === "Instagram" &&
      row.draftStatus === "approved" &&
      row.postStatus !== "posted" &&
      metaStatusForRow?.connected;

    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-sans text-sm font-semibold text-slate-950">
                {row.accountName} / {row.platform}
              </h3>
              <StatusPill tone={timingTone[row.timing]}>{row.timing}</StatusPill>
              <StatusPill tone="neutral">{row.draftStatus}</StatusPill>
              {row.seriesIndex ? (
                <StatusPill tone="neutral">#{row.seriesIndex}</StatusPill>
              ) : null}
              {row.autopublishEnabled ? (
                <StatusPill tone="watch">autopublish</StatusPill>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {row.packageTitle} · {row.title}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {formatScheduledPublishLabel(row.suggestedScheduledFor, {
                autopublishEnabled: row.autopublishEnabled,
                platform: row.platform,
                runTimeLabel: autopublishStatus?.runTimeLabel,
                scheduleBucketId: row.suggestedScheduleBucketId,
              })}
            </p>
            <CalendarDraftBody body={row.body} platform={row.platform} />
            {row.scheduleWarnings.length > 0 ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                {row.scheduleWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {row.draftStatus !== "approved" && row.postStatus !== "posted" ? (
            <button
              type="button"
              onClick={() => approveDraft(row)}
              className="inline-flex h-9 items-center rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              Approve
            </button>
          ) : null}

          {canPublishLinkedIn ? (
            <button
              type="button"
              disabled={publishingDraftId === row.draftId}
              onClick={() => void publishDraftToLinkedIn(row)}
              className="inline-flex h-9 items-center rounded-md bg-[#0a66c2] px-3 text-xs font-semibold text-white hover:bg-[#004182] disabled:bg-slate-300"
            >
              {publishingDraftId === row.draftId
                ? "Publishing…"
                : "Publish to LinkedIn"}
            </button>
          ) : null}

          {canPublishX ? (
            <button
              type="button"
              disabled={publishingDraftId === row.draftId}
              onClick={() => void publishDraftToX(row)}
              className="inline-flex h-9 items-center rounded-md bg-slate-950 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300"
            >
              {publishingDraftId === row.draftId ? "Publishing…" : "Publish to X"}
            </button>
          ) : null}

          {canPublishFacebook ? (
            <button
              type="button"
              disabled={publishingDraftId === row.draftId}
              onClick={() => void publishDraftToFacebook(row)}
              className="inline-flex h-9 items-center rounded-md bg-[#1877F2] px-3 text-xs font-semibold text-white hover:bg-[#166fe5] disabled:bg-slate-300"
            >
              {publishingDraftId === row.draftId
                ? "Publishing…"
                : "Publish to Facebook"}
            </button>
          ) : null}

          {canPublishInstagram ? (
            <button
              type="button"
              disabled={publishingDraftId === row.draftId}
              onClick={() => void publishDraftToInstagram(row)}
              className="inline-flex h-9 items-center rounded-md bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] px-3 text-xs font-semibold text-white hover:opacity-90 disabled:bg-slate-300"
            >
              {publishingDraftId === row.draftId
                ? "Publishing…"
                : "Publish to Instagram"}
            </button>
          ) : null}

          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700">
            Date
            <input
              type="date"
              value={row.suggestedScheduledFor ?? ""}
              onChange={(event) => rescheduleDraft(row, event.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
            />
          </label>

          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700">
            Window
            <select
              value={
                row.suggestedScheduleBucketId ??
                platformScheduleBucketId(row.platform)
              }
              onChange={(event) =>
                rescheduleDraftBucket(
                  row,
                  event.target.value as OpsScheduleBucketId,
                )
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
            >
              {OPS_SCHEDULE_BUCKETS.map((bucket) => (
                <option key={bucket.id} value={bucket.id}>
                  {bucket.localTime}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-900">
            <input
              type="checkbox"
              checked={row.autopublishEnabled}
              disabled={
                row.postStatus === "posted" ||
                (row.platform !== "LinkedIn" &&
                  row.platform !== "X" &&
                  row.platform !== "Instagram")
              }
              onChange={(event) =>
                toggleAutopublish(row, event.target.checked)
              }
            />
            Autopublish on schedule
          </label>

          {row.postStatus !== "posted" ? (
            <button
              type="button"
              onClick={() => void removeScheduledDraft(row)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-800 hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remove
            </button>
          ) : null}

          <Link
            href="/ops/content/new"
            className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            Open package builder
          </Link>
        </div>

        {row.postedUrl ? (
          <p className="mt-3 break-all text-xs text-slate-500">{row.postedUrl}</p>
        ) : null}

        {row.postStatus === "posted" &&
        (row.platform === "X" || row.platform === "LinkedIn") ? (
          <CalendarPostPerformance
            comments={performanceSnapshot?.numericMetrics.comments ?? null}
            capturedAt={performanceSnapshot?.capturedAt ?? null}
            impressions={performanceSnapshot?.numericMetrics.impressions ?? null}
            platform={row.platform}
            reactions={performanceSnapshot?.numericMetrics.reactions ?? null}
            saves={performanceSnapshot?.numericMetrics.saves ?? null}
            source={performanceSnapshot?.source ?? null}
          />
        ) : null}
      </article>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-sans text-base font-semibold text-slate-950">
              Publish calendar
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Drafts with suggested dates from series splits and packages. Approve,
              optionally enable autopublish, or publish manually from here.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Dates show the weekday (America/New_York). Generated series skip
              Sundays; manual dates on Sunday with autopublish will catch up on
              the next weekday morning run. Overdue autopublish drafts stay in the
              Overdue section until published or rescheduled.
            </p>
            {platformScheduleDefaults.length > 0 ? (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Suggested windows: {platformScheduleDefaults.join("; ")}. X manual
                posts use the window guidance and one operator-approved API call per
                post. Instagram autopublish uses your caption plus a brand default
                image unless the draft media assetLocation points at a public image.
              </p>
            ) : null}
            {xDraftsPresent ? (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                X API cost posture: publish uses a single write request per approved
                post. Metrics readback should run weekly only; the calendar does not
                poll X read endpoints for scheduling.
              </p>
            ) : null}
            {autopublishStatus ? (
              <p className="mt-2 text-xs text-slate-500">
                Autopublish:{" "}
                {autopublishStatus.enabled ? (
                  <span className="font-semibold text-emerald-800">
                    enabled ({autopublishStatus.timeZone}, today{" "}
                    {autopublishStatus.runDateToday})
                  </span>
                ) : (
                  <span className="font-semibold text-amber-800">
                    disabled — {autopublishStatus.disabledReason}
                  </span>
                )}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex h-9 items-center gap-2 self-end text-sm text-slate-700">
              <input
                type="checkbox"
                checked={enableAutopublishOnApprove}
                onChange={(event) =>
                  setEnableAutopublishOnApprove(event.target.checked)
                }
              />
              Autopublish when approving
            </label>

            {autopublishStatus?.enabled ? (
              <button
                type="button"
                disabled={runningAutopublish}
                onClick={() => void runAutopublishNow()}
                className="inline-flex h-9 items-center rounded-md bg-violet-700 px-3 text-xs font-semibold text-white hover:bg-violet-800 disabled:bg-slate-300"
              >
                {runningAutopublish ? "Running…" : "Run autopublish now"}
              </button>
            ) : null}

            {storageIsDatabase && xDraftsPresent ? (
              <button
                type="button"
                disabled={runningXMetricsRefresh}
                onClick={() => void refreshXMetricsNow()}
                className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:bg-slate-100"
              >
                {runningXMetricsRefresh ? "Refreshing…" : "Refresh X metrics"}
              </button>
            ) : null}

            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Platform
              <select
                value={platformFilter}
                onChange={(event) =>
                  setPlatformFilter(event.target.value as PublicationPlatform | "all")
                }
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              >
                <option value="all">All</option>
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex h-9 items-center gap-2 self-end text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includePosted}
                onChange={(event) => setIncludePosted(event.target.checked)}
              />
              Show posted
            </label>
          </div>
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
        </div>
      ) : null}

      {todayRows.length > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-amber-950">
            <Megaphone className="h-4 w-4" aria-hidden />
            Today — {formatCalendarDateWithWeekday(localCalendarDate())} —{" "}
            {todayRows.length} draft
            {todayRows.length === 1 ? "" : "s"} ready to review
          </h2>
          <div className="mt-4 grid gap-3">
            {todayRows.map((row) => (
              <CalendarRowCard key={row.draftId} row={row} />
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Clock3 className="h-4 w-4" aria-hidden />
            Nothing scheduled for today
          </div>
          <p className="mt-2">
            Create a series at{" "}
            <Link href="/ops/content/series" className="font-semibold underline">
              Split Series
            </Link>{" "}
            or assign dates in{" "}
            <Link href="/ops/content/new" className="font-semibold underline">
              New Content Package
            </Link>
            .
          </p>
        </section>
      )}

      {overdueRows.length > 0 ? (
        <section className="rounded-lg border border-red-200 bg-red-50/60 p-5 shadow-sm">
          <h2 className="font-sans text-base font-semibold text-red-950">
            Overdue — {overdueRows.length} draft{overdueRows.length === 1 ? "" : "s"}
          </h2>
          <p className="mt-1 text-sm text-red-900">
            These missed their scheduled date. Autopublish catch-up runs on the
            next weekday morning bucket (up to 14 days). You can also publish
            manually or reschedule here.
          </p>
          <div className="mt-4 grid gap-3">
            {overdueRows.map((row) => (
              <CalendarRowCard key={row.draftId} row={row} />
            ))}
          </div>
        </section>
      ) : null}

      {dateGroups.map((group) => (
        <section
          key={group.date}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-slate-950">
            <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden />
            {group.label}
          </h2>
          <div className="mt-4 grid gap-3">
            {group.rows.map((row) => (
              <CalendarRowCard key={row.draftId} row={row} />
            ))}
          </div>
        </section>
      ))}

      {calendarRows.length === 0 ? (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          No calendar drafts yet. Save a content package or series split first.
        </section>
      ) : null}
    </div>
  );
}
