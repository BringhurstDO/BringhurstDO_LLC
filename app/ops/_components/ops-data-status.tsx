import { AlertCircle, CheckCircle2, Settings2 } from "lucide-react";

import { OpsPanel } from "@/app/ops/_components/ops-ui";

/** Red shell for sample data that is not wired to live sources — safe to ignore. */
export const mockDataShellClass =
  "rounded-lg border-2 border-red-300 bg-red-50/70 shadow-sm ring-1 ring-red-200/80";

export const mockDataInnerClass =
  "rounded-md border border-red-200/90 bg-white/90";

/** Amber shell for repo/static operator config that applies to workflows. */
export const staticConfigShellClass =
  "rounded-lg border-2 border-amber-300 bg-amber-50/50 shadow-sm ring-1 ring-amber-200/80";

export function OpsDataLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-red-300 bg-red-50 px-2 py-1 text-red-900">
        <AlertCircle className="h-3.5 w-3.5" aria-hidden />
        Red = mock / not connected
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-amber-300 bg-amber-50 px-2 py-1 text-amber-950">
        <Settings2 className="h-3.5 w-3.5" aria-hidden />
        Amber = static repo config
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-900">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        White/green = live or applicable
      </span>
    </div>
  );
}

export function MockDataBadge({
  phase,
}: {
  phase?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-red-400 bg-red-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-red-900">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Mock — not connected{phase ? ` · ${phase}` : ""}
    </span>
  );
}

export function StaticConfigBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-amber-400 bg-amber-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-amber-950">
      <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Static config — applicable
    </span>
  );
}

export function LiveDataBadge({ label = "Live data" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-bold uppercase tracking-wide text-emerald-900">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

export function MockDataBanner({
  phase,
  title = "Sample data only",
  description = "Nothing here is connected to live APIs or Postgres metrics. Ignore numbers and narrative until Phase 10–11 wiring.",
}: {
  description?: string;
  phase?: string;
  title?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border-2 border-red-300 bg-red-100/80 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-red-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-red-900/90">{description}</p>
      </div>
      <MockDataBadge phase={phase} />
    </div>
  );
}

export function MockDataShell({
  children,
  className = "",
  phase,
  title,
  description,
}: {
  children: React.ReactNode;
  className?: string;
  description?: string;
  phase?: string;
  title?: string;
}) {
  return (
    <section className={`${mockDataShellClass} p-5 ${className}`}>
      <MockDataBanner phase={phase} title={title} description={description} />
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StaticConfigShell({
  children,
  className = "",
  description = "Operator reference data from lib/ops/mock-data.ts. Used for drafts, targets, and AI context — not live platform metrics.",
  title = "Static operator config",
}: {
  children: React.ReactNode;
  className?: string;
  description?: string;
  title?: string;
}) {
  return (
    <section className={`${staticConfigShellClass} p-5 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-amber-900/90">{description}</p>
        </div>
        <StaticConfigBadge />
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function MockDataPanel({
  actions,
  children,
  description,
  eyebrow,
  phase,
  title,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
  eyebrow?: string;
  phase?: string;
  title: string;
}) {
  return (
    <div className={mockDataShellClass}>
      <OpsPanel
        actions={
          actions ?? (
            <MockDataBadge phase={phase} />
          )
        }
        eyebrow={eyebrow ?? "Sample data"}
        title={title}
      >
        {description ? (
          <div className="mb-4">
            <MockDataBanner description={description} phase={phase} />
          </div>
        ) : null}
        {children}
      </OpsPanel>
    </div>
  );
}
