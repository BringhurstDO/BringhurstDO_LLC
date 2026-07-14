import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDollarSign, FileText, ListChecks } from "lucide-react";

import { ExportButtons } from "@/app/ops/_components/export-buttons";
import {
  LiveDataBadge,
  MockDataPanel,
  MockDataShell,
  mockDataInnerClass,
} from "@/app/ops/_components/ops-data-status";
import { OpsPageHeader, OpsPanel, opsShellClass, StatusPill } from "@/app/ops/_components/ops-ui";
import { WeeklySocialScorecardSection } from "@/app/ops/_components/weekly-social-scorecard-section";
import {
  jsonExportFile,
  markdownExportFile,
  weeklyReportToMarkdown,
} from "@/lib/ops/export";
import { loadOpsContentRecords } from "@/lib/ops/load-content-records";
import { buildOpsMarketingContext } from "@/lib/ops/marketing-context";
import { opsDashboardData } from "@/lib/ops/mock-data";
import { buildWeeklySocialScorecard } from "@/lib/ops/social-performance";
import type { WeeklyScorecardMetricId } from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MOCK_SCORECARD_IDS = [
  "followers",
  "websiteClicks",
  "leads",
  "conversations",
  "spend",
  "revenue",
] as const satisfies readonly WeeklyScorecardMetricId[];

export default async function OpsReportsPage() {
  const { projectHealthSnapshots, weeklyReport, weeklyScorecard } =
    opsDashboardData;
  const { records, source } = await loadOpsContentRecords();
  const storageIsDatabase = source === "database";
  const weeklySocialScorecard = storageIsDatabase
    ? buildWeeklySocialScorecard(records)
    : null;
  const remainingMockScorecard = weeklyScorecard.filter((metric) =>
    (MOCK_SCORECARD_IDS as readonly string[]).includes(metric.id),
  );
  const marketingContext = buildOpsMarketingContext(records);
  const weeklyReportExportFiles = [
    jsonExportFile("ops-weekly-report", "JSON", weeklyReport),
    markdownExportFile(
      "ops-weekly-report",
      "Markdown",
      weeklyReportToMarkdown(weeklyReport),
    ),
  ];
  const marketingContextExportFiles = [
    jsonExportFile("ops-marketing-context", "JSON", marketingContext),
    markdownExportFile(
      "ops-marketing-context",
      "Markdown",
      marketingContext.markdown,
    ),
  ];

  return (
    <main>
      <OpsPageHeader
        eyebrow="Operator reports"
        title="Reports"
        description="Export marketing context for AI review from saved packages. Social weekly totals are live when Postgres is on; business scorecard chips and project health stay mock (red)."
      />

      <div className={`${opsShellClass} grid gap-6 py-6`}>
        <OpsPanel
          title="Marketing Context Export"
          eyebrow={
            storageIsDatabase
              ? `${marketingContext.recordCount} saved packages`
              : "Database storage required"
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {storageIsDatabase ? <LiveDataBadge label="Live · Postgres" /> : null}
              <ExportButtons files={marketingContextExportFiles} />
            </div>
          }
        >
          <p className="text-sm leading-6 text-slate-700">
            Bounded metadata-only summary of brand voice, audiences, publication
            targets, recent packages, upcoming calendar drafts, and posted copy.
            Paste into Gemini or attach when planning new series — no PHI or
            credentials.
          </p>
          {storageIsDatabase ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="/ops/api/marketing-context"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" aria-hidden />
                View JSON
              </a>
              <Link
                href="/ops/content/calendar"
                className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Open calendar
              </Link>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Set <code className="font-mono">OPS_STORAGE_MODE=database</code> and{" "}
              <code className="font-mono">DATABASE_URL</code> to build marketing
              context from saved packages. Browser-local packages are not available
              to this server export.
            </p>
          )}
        </OpsPanel>

        <MockDataPanel
          phase="Phase 11"
          title="Weekly Report Export"
          eyebrow={`Sample ${weeklyReport.weekStart} to ${weeklyReport.weekEnd}`}
          actions={<ExportButtons files={weeklyReportExportFiles} />}
          description="Legacy mock weekly report layout. Replace with live data in Phase 11."
        >
          <p className="text-sm leading-6 text-slate-700">
            Export buttons produce sample JSON/Markdown only.
          </p>
        </MockDataPanel>

        {weeklySocialScorecard ? (
          <WeeklySocialScorecardSection scorecard={weeklySocialScorecard} />
        ) : null}

        <MockDataPanel
          phase="Phase 11"
          title="Business scorecard (still mock)"
          eyebrow="Not fed by social APIs"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {remainingMockScorecard.map((metric) => (
              <article
                key={metric.id}
                className={`${mockDataInnerClass} p-4`}
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
        </MockDataPanel>

        <MockDataShell phase="Phase 11" title="Project health snapshots (sample)">
        <section className="grid gap-4 lg:grid-cols-3">
          {projectHealthSnapshots.map((snapshot) => (
            <article
              key={snapshot.id}
              className={`${mockDataInnerClass} p-5 shadow-sm`}
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
        </MockDataShell>

        <MockDataShell phase="Phase 11" title="Weekly report narrative (sample)">
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
        </MockDataShell>
      </div>
    </main>
  );
}
