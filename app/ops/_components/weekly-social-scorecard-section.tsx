import { LiveDataBadge } from "@/app/ops/_components/ops-data-status";
import { StatusPill } from "@/app/ops/_components/ops-ui";
import {
  formatPerformanceCapturedAt,
  type WeeklySocialScorecard,
} from "@/lib/ops/social-performance";

const numberFormat = new Intl.NumberFormat("en-US");

type LiveMetric = {
  detail: string;
  id: string;
  label: string;
  value: number;
};

export function WeeklySocialScorecardSection({
  compact = false,
  scorecard,
}: {
  compact?: boolean;
  scorecard: WeeklySocialScorecard;
}) {
  const metrics: LiveMetric[] = compact
    ? [
        {
          detail: "posted this week",
          id: "posts",
          label: "Posts",
          value: scorecard.posts,
        },
        {
          detail: "latest snapshot sum",
          id: "impressions",
          label: "Impressions",
          value: scorecard.impressions,
        },
        {
          detail: "latest snapshot sum",
          id: "reactions",
          label: "Reactions",
          value: scorecard.reactions,
        },
      ]
    : [
        {
          detail: "posted this week",
          id: "posts",
          label: "Posts",
          value: scorecard.posts,
        },
        {
          detail: "latest snapshot sum",
          id: "impressions",
          label: "Impressions",
          value: scorecard.impressions,
        },
        {
          detail: "latest snapshot sum",
          id: "reactions",
          label: "Reactions",
          value: scorecard.reactions,
        },
        {
          detail: "latest snapshot sum",
          id: "comments",
          label: "Comments",
          value: scorecard.comments,
        },
        {
          detail: "latest snapshot sum",
          id: "saves",
          label: "Saves",
          value: scorecard.saves,
        },
      ];

  const sourceLabel =
    scorecard.sources.length > 0
      ? scorecard.sources.join(", ")
      : "no snapshots yet";
  const platformNote =
    scorecard.byPlatform.length > 0
      ? scorecard.byPlatform
          .map((item) => `${item.platform}: ${item.posts}`)
          .join(" · ")
      : "No social posts in this week yet.";

  return (
    <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-sans text-base font-semibold text-slate-950">
              Weekly social totals
            </h2>
            <LiveDataBadge label="Live social" />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {scorecard.weekStart} to {scorecard.weekEnd} · America/New_York · Mon–Sun
          </p>
        </div>
        <StatusPill tone="good">
          {scorecard.postsWithMetrics}/{scorecard.posts} with metrics
        </StatusPill>
      </div>

      <div
        className={
          compact
            ? "mt-4 grid gap-3 sm:grid-cols-3"
            : "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
        }
      >
        {metrics.map((metric) => (
          <article
            key={metric.id}
            className="rounded-md border border-emerald-100 bg-emerald-50/40 p-4"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-900/80">
              {metric.label}
            </div>
            <div className="mt-2 font-sans text-2xl font-semibold text-slate-950">
              {numberFormat.format(metric.value)}
            </div>
            <div className="mt-1 text-xs text-slate-500">{metric.detail}</div>
          </article>
        ))}
      </div>

      <ul className="mt-4 space-y-1 text-sm leading-6 text-slate-600">
        <li>Sources: {sourceLabel}</li>
        <li>By platform: {platformNote}</li>
        <li>
          Last capture: {formatPerformanceCapturedAt(scorecard.lastCapturedAt)}
        </li>
      </ul>
    </section>
  );
}
