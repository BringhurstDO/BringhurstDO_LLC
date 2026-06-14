import { Activity, ClipboardCheck, DollarSign } from "lucide-react";

import { ExportButtons } from "@/app/ops/_components/export-buttons";
import { OpsPageHeader, OpsPanel, opsShellClass, StatusPill } from "@/app/ops/_components/ops-ui";
import {
  jsonExportFile,
  markdownExportFile,
  projectHealthSnapshotsToMarkdown,
} from "@/lib/ops/export";
import { opsDashboardData } from "@/lib/ops/mock-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function OpsProjectsPage() {
  const { projectHealthSnapshots, projects } = opsDashboardData;
  const projectHealthExportFiles = [
    jsonExportFile("ops-project-health", "JSON", projectHealthSnapshots),
    markdownExportFile(
      "ops-project-health",
      "Markdown",
      projectHealthSnapshotsToMarkdown(projectHealthSnapshots),
    ),
  ];

  return (
    <main>
      <OpsPageHeader
        eyebrow="Project health"
        title="Projects"
        description="Mock health details for SyncSOAP, SyncSafety, and BringhurstDO. No live project APIs are connected."
      />

      <div className={`${opsShellClass} grid gap-6 py-6`}>
        <OpsPanel
          title="Project Health Snapshot Export"
          eyebrow={`${projectHealthSnapshots.length} mock snapshots`}
          actions={<ExportButtons files={projectHealthExportFiles} />}
        >
          <p className="text-sm leading-6 text-slate-700">
            Export project health summaries for manual weekly review. These are
            metadata-only snapshots and do not include source-system logs,
            credentials, or sensitive payloads.
          </p>
        </OpsPanel>

        <div className="grid gap-6">
          {projectHealthSnapshots.map((snapshot) => {
            const project = projects.find((item) => item.id === snapshot.projectId);

            return (
              <article
                key={snapshot.id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="font-sans text-xl font-semibold text-slate-950">
                      {snapshot.name}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {project?.metadataBoundary}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone={snapshot.siteStatusTone}>
                      {snapshot.siteStatus}
                    </StatusPill>
                    <StatusPill tone={snapshot.deployStatusTone}>
                      {snapshot.deployStatus}
                    </StatusPill>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr_1fr]">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <DollarSign className="h-4 w-4 text-slate-500" />
                      Monthly Cost Estimate
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      {snapshot.monthlyCostEstimate}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <Activity className="h-4 w-4 text-slate-500" />
                      Traction Notes
                    </div>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                      {snapshot.tractionNotes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <ClipboardCheck className="h-4 w-4 text-slate-500" />
                      Next Action
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {snapshot.nextAction}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <OpsPanel title="Integration Boundary">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              SyncSOAP stays the HIPAA-sensitive source app. BringhurstDO may
              only receive aggregate metadata summaries.
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              SyncSafety can later expose read-only operational summaries, but
              no write actions are allowed from this console yet.
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              BringhurstDO remains the aggregator. Any spend, deployment, or
              external mutation requires manual approval.
            </div>
          </div>
        </OpsPanel>
      </div>
    </main>
  );
}
