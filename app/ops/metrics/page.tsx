import {
  CircleDollarSign,
  Handshake,
  MessageCircle,
  MousePointerClick,
  ReceiptText,
  Send,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

import { ManualMetricEntryPanel } from "@/app/ops/_components/manual-metric-entry-panel";
import {
  MockDataBanner,
  MockDataPanel,
  mockDataInnerClass,
} from "@/app/ops/_components/ops-data-status";
import {
  BoundaryPill,
  OpsPageHeader,
  opsShellClass,
  StatusPill,
} from "@/app/ops/_components/ops-ui";
import { opsDashboardData } from "@/lib/ops/mock-data";
import type { WeeklyScorecardMetricId } from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const metricIcons = {
  conversations: MessageCircle,
  followers: Users,
  leads: Handshake,
  posts: Send,
  revenue: ReceiptText,
  spend: CircleDollarSign,
  websiteClicks: MousePointerClick,
} satisfies Record<WeeklyScorecardMetricId, ComponentType<{ className?: string }>>;

export default function OpsMetricsPage() {
  const {
    manualMetricEntries,
    socialMetricPlaceholders,
    weeklyReport,
    weeklyScorecard,
  } = opsDashboardData;

  return (
    <main>
      <OpsPageHeader
        eyebrow="Manual metrics"
        title="Weekly Scorecard"
        description="Entire page is mock sample data (red) until Phase 10–11 live metrics sync. Manual entry UI is for layout preview only."
      />

      <div className={`${opsShellClass} grid gap-6 py-6`}>
        <MockDataBanner phase="Phase 11" />

        <div className="flex flex-wrap gap-2">
          <BoundaryPill>Manual entry/import first</BoundaryPill>
          <BoundaryPill>Read-only social placeholders</BoundaryPill>
          <BoundaryPill>No posting APIs</BoundaryPill>
          <BoundaryPill>No ad-spend mutation</BoundaryPill>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {weeklyScorecard.map((metric) => {
            const Icon = metricIcons[metric.id];

            return (
              <article
                key={metric.id}
                className={`${mockDataInnerClass} p-5 shadow-sm`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-sans text-sm font-semibold text-slate-950">
                        {metric.label}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {metric.weekStart} to {metric.weekEnd}
                      </p>
                    </div>
                  </div>
                  <StatusPill tone={metric.tone}>{metric.source}</StatusPill>
                </div>
                <div className="mt-5">
                  <div className="font-sans text-2xl font-semibold tracking-tight text-slate-950">
                    {metric.value}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{metric.unit}</div>
                </div>
                <ul className="mt-4 space-y-1 text-sm leading-6 text-slate-600">
                  {metric.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>

        <MockDataPanel
          phase="Phase 11"
          title="Manual Metric Entry"
          eyebrow={`${weeklyReport.weekStart} to ${weeklyReport.weekEnd}`}
        >
          <ManualMetricEntryPanel
            scorecard={weeklyScorecard}
            weekEnd={weeklyReport.weekEnd}
            weekStart={weeklyReport.weekStart}
          />
        </MockDataPanel>

        <MockDataPanel
          phase="Phase 11"
          title="Manual Metric Entry Ledger"
          eyebrow={`${manualMetricEntries.length} sample rows`}
        >
          <div className="overflow-x-auto">
            <table className="min-w-[860px] divide-y divide-slate-200 text-sm">
              <thead className="bg-red-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Metric
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Project
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Value
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Week
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Source
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {manualMetricEntries.map((entry) => (
                  <tr key={entry.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950">
                        {entry.label}
                      </div>
                      <div className="mt-1 text-slate-500">{entry.metricId}</div>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-800">
                      {entry.projectId}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {entry.value} {entry.unit}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {entry.weekStart} to {entry.weekEnd}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{entry.source}</td>
                    <td className="px-4 py-4">
                      <ul className="space-y-1 text-slate-600">
                        {entry.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MockDataPanel>

        <MockDataPanel
          phase="Phase 10"
          title="Read-Only Social Metric Placeholders"
          description="Future read-sync targets — not connected to platform APIs."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {socialMetricPlaceholders.map((placeholder) => (
              <article
                key={placeholder.id}
                className={`${mockDataInnerClass} p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-sans text-base font-semibold text-slate-950">
                      {placeholder.platform}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {placeholder.sourceBoundary}
                    </p>
                  </div>
                  <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">
                    {placeholder.status}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Future metrics</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {placeholder.futureMetrics.join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Forbidden</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {placeholder.forbiddenData.join(", ")}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </MockDataPanel>
      </div>
    </main>
  );
}
