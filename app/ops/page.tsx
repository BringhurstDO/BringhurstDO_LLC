import {
  Activity,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { opsDashboardData } from "@/lib/ops/mock-data";
import type { OpsTone } from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const toneClasses: Record<OpsTone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  watch: "border-amber-200 bg-amber-50 text-amber-900",
  blocked: "border-red-200 bg-red-50 text-red-800",
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
};

const toneDotClasses: Record<OpsTone, string> = {
  good: "bg-emerald-500",
  watch: "bg-amber-500",
  blocked: "bg-red-500",
  neutral: "bg-slate-400",
};

function StatusPill({ tone, children }: { tone: OpsTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${toneDotClasses[tone]}`} />
      {children}
    </span>
  );
}

export default function OpsPage() {
  const {
    accountRegistry,
    boundaries,
    draftPosts,
    generatedAt,
    projects,
    weeklyReport,
    weeklyScorecard,
  } = opsDashboardData;

  return (
    <main className="min-h-dvh">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <LockKeyhole className="h-4 w-4" aria-hidden />
                Private operator console
              </div>
              <h1 className="mt-3 font-sans text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                BringhurstDO Ops
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Metadata-only operating view for project health, weekly review,
                and content planning.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold text-slate-950">Generated</div>
              <time dateTime={generatedAt}>{generatedAt}</time>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {boundaries.map((boundary) => (
              <span
                key={boundary}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                {boundary}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section aria-labelledby="weekly-scorecard-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="weekly-scorecard-heading"
              className="font-sans text-base font-semibold text-slate-950"
            >
              Weekly Scorecard
            </h2>
            <span className="text-xs font-medium text-slate-500">
              Manual/local metrics
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {weeklyScorecard.map((metric) => (
              <article
                key={metric.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
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
        </section>

        <section aria-labelledby="project-status-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="project-status-heading"
              className="font-sans text-base font-semibold text-slate-950"
            >
              Project Status
            </h2>
            <span className="text-xs font-medium text-slate-500">
              Mock metadata
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-sans text-lg font-semibold text-slate-950">
                      {project.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">{project.role}</p>
                  </div>
                  <StatusPill tone={project.statusTone}>{project.status}</StatusPill>
                </div>

                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Environment</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {project.environment}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Owner</dt>
                    <dd className="font-medium text-slate-900">{project.owner}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Reviewed</dt>
                    <dd className="font-medium text-slate-900">
                      {project.lastReviewedAt}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {project.metadataBoundary}
                </div>

                <div className="mt-5 grid gap-3">
                  {project.metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {metric.label}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-950">
                            {metric.value}
                          </div>
                        </div>
                        <StatusPill tone={metric.tone}>{metric.tone}</StatusPill>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-slate-600">
                        {metric.detail}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Next Actions
                    </div>
                    <ul className="mt-2 space-y-2 text-sm leading-5 text-slate-700">
                      {project.nextActions.map((action) => (
                        <li key={action} className="flex gap-2">
                          <ClipboardCheck
                            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                            aria-hidden
                          />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      TODO Integrations
                    </div>
                    <ul className="mt-2 space-y-2 text-sm leading-5 text-slate-700">
                      {project.integrationTodos.map((todo) => (
                        <li key={todo} className="flex gap-2">
                          <Activity
                            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                            aria-hidden
                          />
                          <span>{todo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="weekly-report-heading"
          className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]"
        >
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <FileText className="mt-1 h-5 w-5 text-slate-500" aria-hidden />
              <div>
                <h2
                  id="weekly-report-heading"
                  className="font-sans text-base font-semibold text-slate-950"
                >
                  Weekly Operator Report
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {weeklyReport.summary}
                </p>
              </div>
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-slate-500">Week Start</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  {weeklyReport.weekStart}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-slate-500">Week End</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  {weeklyReport.weekEnd}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-slate-500">Mode</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  {weeklyReport.mode}
                </dd>
              </div>
            </dl>
          </article>

          <div className="grid gap-4">
            {weeklyReport.sections.map((section) => (
              <article
                key={section.title}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-sans text-base font-semibold text-slate-950">
                    {section.title}
                  </h3>
                  <StatusPill tone={section.tone}>{section.tone}</StatusPill>
                </div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span
                        className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${toneDotClasses[section.tone]}`}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="content-queue-heading"
          className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-slate-500" aria-hidden />
              <h2
                id="content-queue-heading"
                className="font-sans text-base font-semibold text-slate-950"
              >
                Content Calendar / Draft Queue
              </h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Manual approval required
            </span>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {draftPosts.map((draft) => (
              <article
                key={draft.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-sans text-sm font-semibold text-slate-950">
                      {draft.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">{draft.audience}</p>
                  </div>
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                    {draft.status}
                  </span>
                </div>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Project</dt>
                    <dd className="font-medium text-slate-800">{draft.projectId}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Channel</dt>
                    <dd className="text-slate-800">{draft.channel}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Window</dt>
                    <dd className="text-right text-slate-800">
                      {draft.publishWindow}
                    </dd>
                  </div>
                </dl>
                <ul className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm text-slate-600">
                  {draft.safetyNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="hidden max-w-full overflow-x-auto md:block">
            <table className="min-w-[760px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Draft
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Project
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Channel
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Publish Window
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Safety Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {draftPosts.map((draft) => (
                  <tr key={draft.id} className="align-top">
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-950">{draft.title}</div>
                      <div className="mt-1 text-slate-500">{draft.audience}</div>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {draft.projectId}
                    </td>
                    <td className="px-5 py-4 text-slate-700">{draft.channel}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                        {draft.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {draft.publishWindow}
                    </td>
                    <td className="px-5 py-4">
                      <ul className="space-y-1 text-slate-600">
                        {draft.safetyNotes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          aria-labelledby="account-registry-heading"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                id="account-registry-heading"
                className="font-sans text-base font-semibold text-slate-950"
              >
                Account Registry
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {accountRegistry.length} project and founder account rows,
                storing public account context only.
              </p>
            </div>
            <StatusPill tone="watch">manual-only</StatusPill>
          </div>
        </section>
      </div>
    </main>
  );
}
