"use client";

import { useCallback, useState } from "react";
import { BarChart3, RefreshCw, Upload } from "lucide-react";

import { LiveDataBadge } from "@/app/ops/_components/ops-data-status";
import { OpsPanel } from "@/app/ops/_components/ops-ui";
import { opsFetch } from "@/app/ops/_components/ops-fetch";
import { parseLinkedInAggregateAnalyticsFile } from "@/lib/ops/linkedin-analytics-parse-client";
import {
  buildSocialPerformanceRows,
  formatPerformanceCapturedAt,
  type SocialPerformanceRow,
} from "@/lib/ops/social-performance";

type SocialPerformancePanelProps = {
  initialRows: SocialPerformanceRow[];
  onRowsChange?: (rows: SocialPerformanceRow[]) => void;
  showRefresh?: boolean;
  title?: string;
};

function formatCount(value: number | null) {
  if (value === null) {
    return "—";
  }

  return value.toLocaleString("en-US");
}

function sourceLabel(source: SocialPerformanceRow["source"]) {
  if (source === "x-api-weekly") {
    return "X API weekly";
  }

  if (source === "meta-api-weekly") {
    return "Meta API weekly";
  }

  if (source === "linkedin-import") {
    return "LinkedIn Excel import";
  }

  if (source === "manual") {
    return "Manual entry";
  }

  return "Pending";
}

async function reloadPerformanceRows(
  onRowsChange?: (rows: SocialPerformanceRow[]) => void,
) {
  const reload = await opsFetch("/ops/api/persistence/packages", {
    cache: "no-store",
  });
  const loaded = (await reload.json()) as {
    contentPackages?: unknown[];
  };

  if (!Array.isArray(loaded.contentPackages)) {
    return null;
  }

  const nextRows = buildSocialPerformanceRows(
    loaded.contentPackages as Parameters<typeof buildSocialPerformanceRows>[0],
  );
  onRowsChange?.(nextRows);
  return nextRows;
}

export function SocialPerformancePanel({
  initialRows,
  onRowsChange,
  showRefresh = true,
  title = "Social post performance",
}: SocialPerformancePanelProps) {
  const [rows, setRows] = useState(initialRows);
  const [message, setMessage] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [refreshingX, setRefreshingX] = useState(false);
  const [refreshingMeta, setRefreshingMeta] = useState(false);
  const [importingLinkedIn, setImportingLinkedIn] = useState(false);
  const [periodSummary, setPeriodSummary] = useState<{
    impressions: number;
    membersReached: number;
    newFollowers: number;
    periodLabel: string;
    totalEngagements: number;
    totalFollowers: number;
  } | null>(null);
  const [unmatchedUrls, setUnmatchedUrls] = useState<string[]>([]);

  const xRows = rows.filter((row) => row.platform === "X");
  const linkedInRows = rows.filter((row) => row.platform === "LinkedIn");
  const facebookRows = rows.filter((row) => row.platform === "Facebook");
  const instagramRows = rows.filter((row) => row.platform === "Instagram");

  const refreshXRows = useCallback(async () => {
    setRefreshingX(true);
    setIssues([]);
    setMessage("");

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
        throw new Error(payload.error ?? "X metrics refresh failed.");
      }

      const nextRows = await reloadPerformanceRows(onRowsChange);

      if (nextRows) {
        setRows(nextRows);
      }

      const errorNotes =
        payload.errors && payload.errors.length > 0
          ? ` Issues: ${payload.errors.join(" ")}`
          : "";

      setMessage(
        `Refreshed ${payload.updatedCount ?? 0} of ${payload.candidateCount ?? 0} recent X posts.${errorNotes}`,
      );
    } catch (error) {
      setIssues([
        error instanceof Error ? error.message : "X metrics refresh failed.",
      ]);
    } finally {
      setRefreshingX(false);
    }
  }, [onRowsChange]);

  const refreshMetaRows = useCallback(async () => {
    setRefreshingMeta(true);
    setIssues([]);
    setMessage("");

    try {
      const response = await opsFetch("/ops/api/social/meta/metrics/refresh", {
        cache: "no-store",
        method: "POST",
      });
      const payload = (await response.json()) as {
        candidateCount?: number;
        emptyInsightCount?: number;
        error?: string;
        errors?: string[];
        updatedCount?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Meta metrics refresh failed.");
      }

      const nextRows = await reloadPerformanceRows(onRowsChange);

      if (nextRows) {
        setRows(nextRows);
      }

      const errorNotes =
        payload.errors && payload.errors.length > 0
          ? ` Issues: ${payload.errors.slice(0, 3).join(" ")}`
          : "";
      const emptyNote =
        payload.emptyInsightCount && payload.emptyInsightCount > 0
          ? ` ${payload.emptyInsightCount} post(s) returned empty insights (permissions/reconnect may be needed).`
          : "";

      setMessage(
        `Refreshed ${payload.updatedCount ?? 0} of ${payload.candidateCount ?? 0} recent Facebook/Instagram posts.${emptyNote}${errorNotes}`,
      );
    } catch (error) {
      setIssues([
        error instanceof Error ? error.message : "Meta metrics refresh failed.",
      ]);
    } finally {
      setRefreshingMeta(false);
    }
  }, [onRowsChange]);

  async function handleLinkedInImport(file: File) {
    setImportingLinkedIn(true);
    setIssues([]);
    setMessage("");
    setUnmatchedUrls([]);
    setPeriodSummary(null);

    try {
      const compact = await parseLinkedInAggregateAnalyticsFile(file);
      const response = await opsFetch(
        "/ops/api/social/linkedin/analytics/import",
        {
          body: JSON.stringify(compact),
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json()) as {
        error?: string;
        matchedCount?: number;
        periodSummary?: {
          impressions: number;
          membersReached: number;
          newFollowers: number;
          periodLabel: string;
          totalEngagements: number;
          totalFollowers: number;
        };
        unmatchedCount?: number;
        unmatchedUrls?: string[];
        updatedPackageCount?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "LinkedIn analytics import failed.");
      }

      const nextRows = await reloadPerformanceRows(onRowsChange);

      if (nextRows) {
        setRows(nextRows);
      }

      if (payload.periodSummary) {
        setPeriodSummary(payload.periodSummary);
      }

      setUnmatchedUrls(payload.unmatchedUrls ?? []);
      setMessage(
        `Imported LinkedIn analytics: matched ${payload.matchedCount ?? 0} Ops post(s), updated ${payload.updatedPackageCount ?? 0} package(s). Excel file was not stored.`,
      );
    } catch (error) {
      setIssues([
        error instanceof Error
          ? error.message
          : "LinkedIn analytics import failed.",
      ]);
    } finally {
      setImportingLinkedIn(false);
    }
  }

  function PerformanceTable({
    emptyLabel,
    platformRows,
  }: {
    emptyLabel: string;
    platformRows: SocialPerformanceRow[];
  }) {
    if (platformRows.length === 0) {
      return <p className="text-sm text-slate-600">{emptyLabel}</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-[920px] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">
                Post
              </th>
              <th scope="col" className="px-4 py-3">
                Impressions
              </th>
              <th scope="col" className="px-4 py-3">
                Reactions
              </th>
              <th scope="col" className="px-4 py-3">
                Replies
              </th>
              <th scope="col" className="px-4 py-3">
                Saves
              </th>
              <th scope="col" className="px-4 py-3">
                Captured
              </th>
              <th scope="col" className="px-4 py-3">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {platformRows.map((row) => (
              <tr key={row.publishedPostId} className="align-top">
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-950">
                    {row.accountName} · {row.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {row.packageTitle}
                  </div>
                  <p className="mt-2 max-w-md text-xs leading-5 text-slate-600">
                    {row.bodyPreview}
                  </p>
                  {row.postedUrl ? (
                    <a
                      href={row.postedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block break-all text-xs font-semibold text-slate-700 underline"
                    >
                      {row.postedUrl}
                    </a>
                  ) : null}
                </td>
                <td className="px-4 py-4 font-medium text-slate-900">
                  {formatCount(row.impressions)}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {formatCount(row.reactions)}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {formatCount(row.comments)}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {formatCount(row.saves)}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {formatPerformanceCapturedAt(row.capturedAt)}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {sourceLabel(row.source)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const busy = refreshingX || refreshingMeta || importingLinkedIn;

  return (
    <OpsPanel
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <LiveDataBadge label="Live · Postgres" />
          {showRefresh ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void refreshXRows()}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshingX ? "animate-spin" : ""}`}
                  aria-hidden
                />
                {refreshingX ? "Refreshing X…" : "Refresh X"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void refreshMetaRows()}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshingMeta ? "animate-spin" : ""}`}
                  aria-hidden
                />
                {refreshingMeta ? "Refreshing Meta…" : "Refresh Meta"}
              </button>
              <label
                className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-sky-300 bg-sky-50 px-3 text-xs font-semibold text-sky-950 hover:bg-sky-100 ${
                  busy ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                {importingLinkedIn ? "Importing…" : "Import LinkedIn Excel"}
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={busy}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";

                    if (file) {
                      void handleLinkedInImport(file);
                    }
                  }}
                />
              </label>
            </>
          ) : null}
        </div>
      }
      eyebrow="Phase 10 — metrics readback"
      title={title}
    >
      <p className="text-sm leading-6 text-slate-600">
        X and Meta sync weekly (Wed cron) or on demand. LinkedIn Aggregate
        Analytics Excel is parsed in-browser; only compact totals and matched
        post metrics are saved — the workbook is never stored.
      </p>

      {message ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      {periodSummary ? (
        <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-950">
          <p className="font-semibold">
            LinkedIn period summary
            {periodSummary.periodLabel
              ? ` · ${periodSummary.periodLabel}`
              : ""}
          </p>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs text-sky-800/80">Impressions</dt>
              <dd className="font-semibold">
                {formatCount(periodSummary.impressions)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-sky-800/80">Members reached</dt>
              <dd className="font-semibold">
                {formatCount(periodSummary.membersReached)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-sky-800/80">Engagements</dt>
              <dd className="font-semibold">
                {formatCount(periodSummary.totalEngagements)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-sky-800/80">Followers</dt>
              <dd className="font-semibold">
                {formatCount(periodSummary.totalFollowers)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-sky-800/80">New followers</dt>
              <dd className="font-semibold">
                {formatCount(periodSummary.newFollowers)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-sky-900/80">
            Period totals are shown for operator review only (not written as a
            bulky file or demographics dump).
          </p>
        </div>
      ) : null}

      {unmatchedUrls.length > 0 ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-semibold">
            Unmatched LinkedIn TOP POSTS ({unmatchedUrls.length})
          </p>
          <ul className="mt-2 space-y-1 text-xs break-all">
            {unmatchedUrls.slice(0, 8).map((url) => (
              <li key={url}>{url}</li>
            ))}
          </ul>
          {unmatchedUrls.length > 8 ? (
            <p className="mt-1 text-xs">
              +{unmatchedUrls.length - 8} more not shown
            </p>
          ) : null}
        </div>
      ) : null}

      {issues.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 grid gap-6">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" aria-hidden />
            <h3 className="font-sans text-sm font-semibold text-slate-950">
              X ({xRows.length})
            </h3>
          </div>
          <PerformanceTable
            emptyLabel="No posted X drafts tracked in Postgres yet."
            platformRows={xRows}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" aria-hidden />
            <h3 className="font-sans text-sm font-semibold text-slate-950">
              LinkedIn ({linkedInRows.length})
            </h3>
          </div>
          <PerformanceTable
            emptyLabel="No posted LinkedIn drafts yet. Import Aggregate Analytics Excel to attach metrics."
            platformRows={linkedInRows}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" aria-hidden />
            <h3 className="font-sans text-sm font-semibold text-slate-950">
              Facebook ({facebookRows.length})
            </h3>
          </div>
          <PerformanceTable
            emptyLabel="No posted Facebook drafts yet."
            platformRows={facebookRows}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" aria-hidden />
            <h3 className="font-sans text-sm font-semibold text-slate-950">
              Instagram ({instagramRows.length})
            </h3>
          </div>
          <PerformanceTable
            emptyLabel="No posted Instagram drafts yet."
            platformRows={instagramRows}
          />
        </section>
      </div>
    </OpsPanel>
  );
}

export function CalendarPostPerformance({
  comments,
  capturedAt,
  impressions,
  platform,
  reactions,
  saves,
  source,
}: {
  comments: number | null;
  capturedAt: string | null;
  impressions: number | null;
  platform: "X" | "LinkedIn" | "Facebook" | "Instagram";
  reactions: number | null;
  saves: number | null;
  source: SocialPerformanceRow["source"];
}) {
  if (impressions === null && reactions === null) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        {platform === "X"
          ? "X metrics pending — weekly readback or Refresh X on Metrics."
          : platform === "Facebook" || platform === "Instagram"
            ? "Meta metrics pending — reconnect with insights scopes, then Refresh Meta on Metrics."
            : "No performance metrics saved yet. Import LinkedIn Aggregate Analytics on Metrics."}
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-950">
      <div className="font-semibold">Performance</div>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-emerald-800/80">Impressions</dt>
          <dd className="font-semibold">{formatCount(impressions)}</dd>
        </div>
        <div>
          <dt className="text-emerald-800/80">Reactions</dt>
          <dd className="font-semibold">{formatCount(reactions)}</dd>
        </div>
        <div>
          <dt className="text-emerald-800/80">Replies</dt>
          <dd className="font-semibold">{formatCount(comments)}</dd>
        </div>
        <div>
          <dt className="text-emerald-800/80">Saves</dt>
          <dd className="font-semibold">{formatCount(saves)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-emerald-900/80">
        {sourceLabel(source)} · {formatPerformanceCapturedAt(capturedAt)}
      </p>
    </div>
  );
}
