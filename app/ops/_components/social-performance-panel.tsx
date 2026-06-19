"use client";

import { useCallback, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";

import { LiveDataBadge } from "@/app/ops/_components/ops-data-status";
import { OpsPanel } from "@/app/ops/_components/ops-ui";
import { opsFetch } from "@/app/ops/_components/ops-fetch";
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

  if (source === "manual") {
    return "Manual entry";
  }

  return "Pending";
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
  const [refreshing, setRefreshing] = useState(false);

  const xRows = rows.filter((row) => row.platform === "X");
  const linkedInRows = rows.filter((row) => row.platform === "LinkedIn");

  const refreshRows = useCallback(async () => {
    setRefreshing(true);
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

      const reload = await opsFetch("/ops/api/persistence/packages", {
        cache: "no-store",
      });
      const loaded = (await reload.json()) as {
        contentPackages?: unknown[];
      };

      if (Array.isArray(loaded.contentPackages)) {
        const nextRows = buildSocialPerformanceRows(
          loaded.contentPackages as Parameters<
            typeof buildSocialPerformanceRows
          >[0],
        );
        setRows(nextRows);
        onRowsChange?.(nextRows);
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
      setRefreshing(false);
    }
  }, [onRowsChange]);

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

  return (
    <OpsPanel
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <LiveDataBadge label="Live · Postgres" />
          {showRefresh ? (
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void refreshRows()}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
              {refreshing ? "Refreshing…" : "Refresh X metrics"}
            </button>
          ) : null}
        </div>
      }
      eyebrow="Phase 10 — X readback"
      title={title}
    >
      <p className="text-sm leading-6 text-slate-600">
        Ops-published X posts sync public metrics weekly (Wed ~10am ET cron) or
        on demand here. Reactions combine likes, reposts, and quotes. LinkedIn
        rows show manual package metrics until Phase 10 LinkedIn read-sync ships.
      </p>

      {message ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
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

        {linkedInRows.length > 0 ? (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-500" aria-hidden />
              <h3 className="font-sans text-sm font-semibold text-slate-950">
                LinkedIn manual metrics ({linkedInRows.length})
              </h3>
            </div>
            <PerformanceTable
              emptyLabel="No posted LinkedIn drafts yet."
              platformRows={linkedInRows}
            />
          </section>
        ) : null}
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
  platform: "X" | "LinkedIn";
  reactions: number | null;
  saves: number | null;
  source: SocialPerformanceRow["source"];
}) {
  if (impressions === null && reactions === null) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        {platform === "X"
          ? "X metrics pending — weekly readback or use Refresh X metrics on Metrics."
          : "No performance metrics saved yet."}
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
