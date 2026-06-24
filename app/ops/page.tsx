import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  History,
  ListChecks,
  FilePlus2,
  FileText,
  LockKeyhole,
  Megaphone,
  ShieldCheck,
} from "lucide-react";

import {
  LiveDataBadge,
  MockDataShell,
  StaticConfigShell,
} from "@/app/ops/_components/ops-data-status";
import { opsShellClass } from "@/app/ops/_components/ops-ui";
import { buildContentWorkflowSnapshot } from "@/lib/ops/content-workflow-snapshot";
import { buildOpsDoctorSummary } from "@/lib/ops/doctor";
import { loadOpsContentRecords } from "@/lib/ops/load-content-records";
import { loadOpsRunHistory } from "@/lib/ops/run-history";
import { opsDashboardData } from "@/lib/ops/mock-data";
import {
  buildXPerformanceSummary,
  formatPerformanceCapturedAt,
} from "@/lib/ops/social-performance";
import type { OpsAccountStatus, OpsTone } from "@/lib/ops/types";

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

const accountStatusTones: Record<OpsAccountStatus, OpsTone> = {
  active: "good",
  blocked_pending_meta_trust: "blocked",
  missing: "blocked",
  planned: "neutral",
};

const accountStatuses: OpsAccountStatus[] = [
  "active",
  "planned",
  "blocked_pending_meta_trust",
  "missing",
];

const doctorToneCopy: Record<OpsTone, string> = {
  blocked: "Needs attention",
  good: "Ready",
  neutral: "Info",
  watch: "Watch",
};

const presetWorkflows = [
  {
    description:
      "Check due, overdue, approved, and opted-in drafts before any scheduled window runs.",
    href: "/ops/content/calendar",
    label: "Morning Publish Check",
    status: "Daily",
  },
  {
    description:
      "Inspect recent autopublish, AI helper, and social publish audit rows before trusting output.",
    href: "/ops",
    label: "Review Run History",
    status: "Audit",
  },
  {
    description:
      "Find overdue, approved-but-unposted, or stale packages that need operator cleanup.",
    href: "/ops/content/calendar",
    label: "Draft Cleanup",
    status: "Review",
  },
  {
    description:
      "Export public-safe marketing context for planning without credentials, PHI, or internal notes.",
    href: "/ops/reports",
    label: "Generate Weekly Context",
    status: "Context",
  },
  {
    description:
      "Review LinkedIn, X, and Meta readiness without initiating OAuth or posting actions.",
    href: "/ops/accounts",
    label: "Account Readiness Audit",
    status: "Readiness",
  },
  {
    description:
      "Check X readback status, manual metrics placeholders, and weekly scorecard boundaries.",
    href: "/ops/metrics",
    label: "Metrics Readback Check",
    status: "Metrics",
  },
] as const;

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

function formatRunTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function OpsPage() {
  const { accountRegistry, boundaries } = opsDashboardData;
  const { records, source } = await loadOpsContentRecords();
  const snapshot = buildContentWorkflowSnapshot(records, {
    loadedFrom: source === "database" ? "database" : "none",
  });
  const doctor = await buildOpsDoctorSummary(snapshot);
  const runHistory = await loadOpsRunHistory(8);
  const xPerformance = buildXPerformanceSummary(records);
  const accountStatusCounts = Object.fromEntries(
    accountStatuses.map((status) => [
      status,
      accountRegistry.filter((account) => account.status === status).length,
    ]),
  ) as Record<OpsAccountStatus, number>;
  const storageIsDatabase = source === "database";

  return (
    <main className="min-h-dvh">
      <section className="border-b border-slate-200 bg-white">
        <div className={`${opsShellClass} flex flex-col gap-6 py-6`}>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <LockKeyhole className="h-4 w-4" aria-hidden />
              Private operator console
            </div>
            <h1 className="mt-3 font-sans text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              BringhurstDO Ops
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Content workflow, publish calendar, and marketing context for
              metadata-only operator work. X post metrics are live when Postgres
              persistence is enabled; project scorecard stays placeholder until
              Phase 11.
            </p>
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

      <div className={`${opsShellClass} grid gap-6 py-6`}>
        <section
          className="rounded-lg border border-slate-200 bg-white shadow-sm"
          data-testid="ops-doctor-panel"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Activity className="h-4 w-4" aria-hidden />
                Ops Doctor
              </div>
              <h2 className="mt-2 font-sans text-base font-semibold text-slate-950">
                System readiness
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Read-only health check for storage, content workflow, scheduled
                publishing, AI assistance, and social account readiness.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone={doctor.headlineTone}>{doctor.headline}</StatusPill>
              <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                {doctor.counts.good} ready / {doctor.counts.watch} watch /{" "}
                {doctor.counts.blocked} blocked
              </span>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {doctor.items.map((item) => (
              <article
                key={item.id}
                className="flex min-h-full flex-col rounded-lg border border-slate-200 bg-slate-50 p-4"
                data-testid={`ops-doctor-card-${item.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-sans text-sm font-semibold text-slate-950">
                      {item.label}
                    </h3>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.status}
                    </p>
                  </div>
                  <StatusPill tone={item.tone}>{doctorToneCopy[item.tone]}</StatusPill>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700">
                  {item.summary}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  <span className="font-semibold text-slate-950">Next:</span>{" "}
                  {item.nextAction}
                </p>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-900 underline-offset-4 hover:underline"
                  >
                    Open related area
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section
          className="rounded-lg border border-slate-200 bg-white shadow-sm"
          data-testid="ops-runs-panel"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <History className="h-4 w-4" aria-hidden />
                Ops Runs
              </div>
              <h2 className="mt-2 font-sans text-base font-semibold text-slate-950">
                Recent run history
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Read-only audit trail for autopublish runs, AI draft helper
                runs, and social publish attempts stored in the Ops database.
              </p>
            </div>
            {runHistory.source === "database" ? (
              <div className="flex flex-wrap gap-2">
                <LiveDataBadge label="Live - Run history" />
                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                  {runHistory.counts.good} success / {runHistory.counts.watch} watch /{" "}
                  {runHistory.counts.blocked} error
                </span>
              </div>
            ) : (
              <StatusPill
                tone={runHistory.source === "database-error" ? "blocked" : "watch"}
              >
                {runHistory.source === "database-error"
                  ? "Run history unavailable"
                  : "Database required"}
              </StatusPill>
            )}
          </div>

          {runHistory.source === "database" && runHistory.items.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {runHistory.items.map((item) => (
                <article
                  key={`${item.type}-${item.id}`}
                  className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"
                  data-testid={`ops-run-${item.type}`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-sans text-sm font-semibold text-slate-950">
                        {item.label}
                      </h3>
                      <StatusPill tone={item.tone}>{item.status}</StatusPill>
                      <span className="text-xs text-slate-500">
                        {formatRunTimestamp(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {item.summary}
                    </p>
                  </div>
                  <dl className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
                    {item.details.map((detail) => (
                      <div
                        key={detail}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600"
                      >
                        {detail}
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          ) : runHistory.source === "database" ? (
            <p className="p-5 text-sm leading-6 text-slate-600">
              No saved Ops runs yet. Run history will appear after AI generation,
              scheduled publishing, or manual social publish attempts are saved
              to Postgres.
            </p>
          ) : (
            <div className="p-5">
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                {runHistory.source === "database-error"
                  ? `Could not load recent runs: ${runHistory.error}`
                  : "Set OPS_STORAGE_MODE=database and DATABASE_URL to read recent Ops runs. Browser-local packages do not include server run history."}
              </p>
            </div>
          )}
        </section>

        <section
          className="rounded-lg border border-slate-200 bg-white shadow-sm"
          data-testid="ops-presets-panel"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <ListChecks className="h-4 w-4" aria-hidden />
                Preset Workflows
              </div>
              <h2 className="mt-2 font-sans text-base font-semibold text-slate-950">
                Guided operator workflows
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Fast paths into common operator checks. These links do not write
                records, call social APIs, start OAuth, or publish content.
              </p>
            </div>
            <StatusPill tone="neutral">Navigation only</StatusPill>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {presetWorkflows.map((workflow) => (
              <article
                key={workflow.label}
                className="flex min-h-full flex-col rounded-lg border border-slate-200 bg-slate-50 p-4"
                data-testid="ops-preset-workflow"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-sans text-sm font-semibold text-slate-950">
                    {workflow.label}
                  </h3>
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                    {workflow.status}
                  </span>
                </div>
                <p className="mt-3 grow text-sm leading-6 text-slate-700">
                  {workflow.description}
                </p>
                <Link
                  href={workflow.href}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-900 underline-offset-4 hover:underline"
                >
                  Open workflow
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-sans text-base font-semibold text-slate-950">
                Content workflow
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {storageIsDatabase
                  ? "Live snapshot from saved content packages in Postgres."
                  : "Enable OPS_STORAGE_MODE=database for overview stats here. Open the calendar for browser-local packages."}
              </p>
            </div>
            {storageIsDatabase ? (
              <LiveDataBadge label="Live · Postgres" />
            ) : (
              <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-950">
                Browser-local packages not shown here
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Packages", snapshot.packageCount],
                ["Draft slots", snapshot.totalDrafts],
                ["Due today", snapshot.today],
                ["Overdue", snapshot.overdue],
                ["Upcoming", snapshot.upcoming],
                ["Approved pending", snapshot.approvedPending],
                ["Autopublish on", snapshot.autopublishEnabled],
                ["Posted tracked", snapshot.posted],
              ] as const
            ).map(([label, value]) => (
              <article
                key={label}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </div>
                <div className="mt-2 font-sans text-2xl font-semibold text-slate-950">
                  {value}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/ops/content/calendar"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              Publish calendar
            </Link>
            <Link
              href="/ops/content/new"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden />
              New content
            </Link>
            <Link
              href="/ops/content/series"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-violet-300 bg-violet-50 px-4 text-sm font-semibold text-violet-900 hover:bg-violet-100"
            >
              <Megaphone className="h-4 w-4" aria-hidden />
              Split series
            </Link>
            <Link
              href="/ops/reports"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" aria-hidden />
              Marketing context
            </Link>
          </div>

          {snapshot.recentPackages.length > 0 ? (
            <ul className="mt-5 space-y-2 border-t border-slate-200 pt-5 text-sm text-slate-700">
              {snapshot.recentPackages.map((pkg) => (
                <li key={pkg.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-950">{pkg.title}</span>
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                    {pkg.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    {pkg.draftCount} draft{pkg.draftCount === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 border-t border-slate-200 pt-5 text-sm text-slate-600">
              No saved packages yet. Start with{" "}
              <Link href="/ops/content/series" className="font-semibold underline">
                Split series
              </Link>{" "}
              or{" "}
              <Link href="/ops/content/new" className="font-semibold underline">
                New content
              </Link>
              .
            </p>
          )}
        </section>

        {storageIsDatabase && xPerformance.postedCount > 0 ? (
          <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-sans text-base font-semibold text-slate-950">
                  X post performance
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Aggregated from Ops-published X drafts. Weekly cron on Wed
                  ~10am ET; refresh anytime from{" "}
                  <Link href="/ops/metrics" className="font-semibold underline">
                    Metrics
                  </Link>{" "}
                  or the publish calendar.
                </p>
              </div>
              <LiveDataBadge label="Live · X readback" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["Posted X drafts", xPerformance.postedCount],
                  ["With metrics", xPerformance.withMetricsCount],
                  ["Total impressions", xPerformance.totalImpressions],
                  ["Total reactions", xPerformance.totalReactions],
                ] as const
              ).map(([label, value]) => (
                <article
                  key={label}
                  className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">
                    {label}
                  </div>
                  <div className="mt-2 font-sans text-2xl font-semibold text-slate-950">
                    {value.toLocaleString("en-US")}
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Last capture:{" "}
              {formatPerformanceCapturedAt(xPerformance.lastCapturedAt)}
            </p>
          </section>
        ) : null}

        <MockDataShell
          phase="Phase 11"
          title="Project metrics & weekly scorecard"
          description="Placeholder layout only. No live AWS, project health, or weekly scorecard read-sync is connected."
        >
          <p className="text-sm leading-6 text-red-900/90">
            Use{" "}
            <Link href="/ops/projects" className="font-semibold underline">
              Projects
            </Link>{" "}
            and{" "}
            <Link href="/ops/metrics" className="font-semibold underline">
              Metrics
            </Link>{" "}
            to preview the mock layouts (highlighted in red) until Phase 10–11
            wiring.
          </p>
        </MockDataShell>

        <StaticConfigShell
          title="Account registry"
          description="Publication account metadata from repo config. LinkedIn connection state is live on Accounts; counts here are static labels only."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                id="account-registry-heading"
                className="font-sans text-base font-semibold text-slate-950"
              >
                Account registry
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {accountRegistry.length} publication accounts — configure on{" "}
                <Link href="/ops/accounts" className="font-semibold underline">
                  Accounts
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {accountStatuses.map((status) => (
                <StatusPill key={status} tone={accountStatusTones[status]}>
                  {status}: {accountStatusCounts[status]}
                </StatusPill>
              ))}
            </div>
          </div>
        </StaticConfigShell>
      </div>
    </main>
  );
}
