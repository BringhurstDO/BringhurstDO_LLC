import Link from "next/link";
import {
  BarChart3,
  FileText,
  FolderKanban,
  Home,
  FileInput,
  LockKeyhole,
  Megaphone,
  NotebookTabs,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import type { OpsTone } from "@/lib/ops/types";

const navItems = [
  { href: "/ops", label: "Overview", icon: Home },
  { href: "/ops/content", label: "Content", icon: Megaphone },
  { href: "/ops/metrics", label: "Metrics", icon: TrendingUp },
  { href: "/ops/accounts", label: "Accounts", icon: NotebookTabs },
  { href: "/ops/reports", label: "Reports", icon: FileText },
  { href: "/ops/projects", label: "Projects", icon: FolderKanban },
  { href: "/ops/import", label: "Import", icon: FileInput },
] as const;

export const toneClasses: Record<OpsTone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  watch: "border-amber-200 bg-amber-50 text-amber-900",
  blocked: "border-red-200 bg-red-50 text-red-800",
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
};

export const toneDotClasses: Record<OpsTone, string> = {
  good: "bg-emerald-500",
  watch: "bg-amber-500",
  blocked: "bg-red-500",
  neutral: "bg-slate-400",
};

export function OpsTopNav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <LockKeyhole className="h-4 w-4" aria-hidden />
            Private operator console
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Mock/local only. Manual approval before posting, spend, or mutation.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Ops navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-950"
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: OpsTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${toneDotClasses[tone]}`} />
      {children}
    </span>
  );
}

export function BoundaryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
      <ShieldCheck className="h-3.5 w-3.5 text-slate-500" aria-hidden />
      {children}
    </span>
  );
}

export function OpsPageHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <BarChart3 className="h-4 w-4" aria-hidden />
          {eyebrow}
        </div>
        <h1 className="mt-3 font-sans text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>
    </section>
  );
}

export function OpsPanel({
  actions,
  children,
  eyebrow,
  title,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-sans text-base font-semibold text-slate-950">
            {title}
          </h2>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
