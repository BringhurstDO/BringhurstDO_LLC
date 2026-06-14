import { AlertTriangle, CheckCircle2, CircleDollarSign, ListChecks } from "lucide-react";

import { ExportButtons } from "@/app/ops/_components/export-buttons";
import { OpsPageHeader, OpsPanel, opsShellClass, StatusPill } from "@/app/ops/_components/ops-ui";
import {
  jsonExportFile,
  markdownExportFile,
  weeklyReportToMarkdown,
} from "@/lib/ops/export";
import { opsDashboardData } from "@/lib/ops/mock-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function OpsReportsPage() {
  const { projectHealthSnapshots, weeklyReport, weeklyScorecard } =
    opsDashboardData;
  const weeklyReportExportFiles = [
    jsonExportFile("ops-weekly-report", "JSON", weeklyReport),
    markdownExportFile(
      "ops-weekly-report",
      "Markdown",
      weeklyReportToMarkdown(weeklyReport),
    ),
  ];

  return (
    <main>
      <OpsPageHeader
        eyebrow="Weekly operator report"
        title="Reports"
        description="Mock weekly review for project status, wins, risks, cost notes, marketing output, and next actions."
      />

      <div className={`${opsShellClass} grid gap-6 py-6`}>
        <OpsPanel
          title="Weekly Report Export"
          eyebrow={`${weeklyReport.weekStart} to ${weeklyReport.weekEnd}`}
          actions={<ExportButtons files={weeklyReportExportFiles} />}
        >
          <p className="text-sm leading-6 text-slate-700">
            Export the weekly operator report for manual review, archiving, or
            copy/paste into a separate document. Exporting does not send email,
            publish, or mutate any source system.
          </p>
        </OpsPanel>

        <OpsPanel title="Weekly Scorecard" eyebrow="Manual/local metrics">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {weeklyScorecard.map((metric) => (
              <article
                key={metric.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {metric.label}
                </div>
                <div className="mt-2 font-sans text-xl font-semibold text-slate-950">
                  {metric.value}
                </div>
                <div className="mt-1 text-xs text-slate-500">{metric.unit}</div>
              </article>
            ))}
          </div>
        </OpsPanel>

        <section className="grid gap-4 lg:grid-cols-3">
          {projectHealthSnapshots.map((snapshot) => (
            <article
              key={snapshot.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-sans text-base font-semibold text-slate-950">
                    {snapshot.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Captured {snapshot.capturedAt}
                  </p>
                </div>
                <StatusPill tone={snapshot.siteStatusTone}>
                  {snapshot.siteStatus}
                </StatusPill>
              </div>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Deploy</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {snapshot.deployStatus}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Monthly cost</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {snapshot.monthlyCostEstimate}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <OpsPanel title="Weekly Wins" eyebrow={weeklyReport.weekStart}>
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              {weeklyReport.weeklyWins.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </OpsPanel>

          <OpsPanel title="Risks / Blockers" eyebrow={weeklyReport.weekEnd}>
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              {weeklyReport.risksAndBlockers.map((item) => (
                <li key={item} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </OpsPanel>

          <OpsPanel title="Cost Notes">
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              {weeklyReport.costNotes.map((item) => (
                <li key={item} className="flex gap-2">
                  <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </OpsPanel>

          <OpsPanel title="Marketing / Content Output">
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              {weeklyReport.marketingOutput.map((item) => (
                <li key={item} className="flex gap-2">
                  <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </OpsPanel>
        </section>

        <OpsPanel title="Next Actions">
          <div className="grid gap-3 md:grid-cols-3">
            {weeklyReport.nextActions.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-800"
              >
                {item}
              </div>
            ))}
          </div>
        </OpsPanel>
      </div>
    </main>
  );
}
