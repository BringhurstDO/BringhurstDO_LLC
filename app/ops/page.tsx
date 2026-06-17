import Link from "next/link";
import {
  CalendarDays,
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
import { loadOpsContentRecords } from "@/lib/ops/load-content-records";
import { opsDashboardData } from "@/lib/ops/mock-data";
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

export default async function OpsPage() {
  const { accountRegistry, boundaries } = opsDashboardData;
  const { records, source } = await loadOpsContentRecords();
  const snapshot = buildContentWorkflowSnapshot(records, {
    loadedFrom: source === "database" ? "database" : "none",
  });
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
              metadata-only operator work. Project metrics and weekly reports stay
              placeholder until Phase 11 live data.
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

        <MockDataShell
          phase="Phase 11"
          title="Project metrics & weekly scorecard"
          description="Placeholder layout only. No live AWS, project health, or marketing read-sync is connected."
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
