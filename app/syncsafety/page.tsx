import type { Metadata } from "next";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Clipboard,
  FileText,
  Footprints,
  FolderUp,
  LayoutList,
  Sparkles,
} from "lucide-react";

import { PristineMockup } from "@/components/pristine-mockup";
import { ProductStoryLayout } from "@/components/product-story-layout";

export const metadata: Metadata = {
  title: "SyncSafety",
  description:
    "Precision safety documentation without the administrative tax—guided recordability, fast OSHA exports, less tedious paperwork.",
};

const CTA_SECTION_ID = "request-early-access";

/** Exact SyncSafety logo paths, inlined to avoid client image-load event issues. */
function SyncSafetyBrandLogoImg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="#FFC107"
      className={className}
      aria-hidden="true"
    >
      <polygon
        points="50,15 90,85 10,85"
        fill="none"
        stroke="#FFC107"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <polyline
        points="37,48 50,25 63,48"
        fill="none"
        stroke="#FFC107"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 23 81 v -4 h 10 c 0 -20 34 -20 34 0 h 10 v 4 Z" fill="#FFC107" />
      <path d="M 46 63 v -6 a 4 4 0 0 1 8 0 v 6 Z" fill="#FFC107" />
    </svg>
  );
}

/** From SyncSafety `components/SafetySparkIcon.tsx` — Report tab + cards only. */
function SafetySparkMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M 50 8 L 56 50 L 50 50 L 44 50 Z" />
      <path d="M 92 50 L 50 56 L 50 50 L 50 44 Z" />
      <path d="M 50 92 L 44 50 L 50 50 L 56 50 Z" />
      <path d="M 8 50 L 50 44 L 50 50 L 50 56 Z" />
      <circle cx="50" cy="50" r="10" />
    </svg>
  );
}

type ChromeActive = "dashboard" | "incidents" | "programs" | "report";

function SyncSafetyAppShell({
  active,
  children,
}: {
  active: ChromeActive;
  children: React.ReactNode;
}) {
  const navItem =
    "rounded-sm px-2 py-1 text-[10px] font-medium transition-colors sm:text-[11px]";
  const navInactive = `${navItem} text-[#f9fafb]/85 hover:bg-white/10`;
  const navActive = `${navItem} bg-[#FFC107] text-[#1a1a1a]`;

  return (
    <div className="flex h-full min-h-[220px] flex-col bg-[#f3f4f6] text-[#111827]">
      <header className="shrink-0 border-b border-[#4d4d4d] bg-[#1a1a1a] text-[#f9fafb]">
        <div className="flex items-center justify-between gap-2 px-2 py-2 sm:px-3">
          <div className="flex min-w-0 items-center gap-2">
            <SyncSafetyBrandLogoImg className="h-8 w-8 shrink-0 object-contain" />
            <span className="truncate text-sm font-bold tracking-tight text-[#f9fafb]">
              SyncSAFETY<sup className="text-[0.55em]">™</sup>
            </span>
          </div>
          <div className="hidden h-6 w-16 shrink-0 rounded-sm border border-white/15 sm:block" />
        </div>
        <div className="flex flex-wrap items-center gap-1 px-2 pb-2 sm:gap-1.5 sm:px-3">
          <span className={active === "dashboard" ? navActive : navInactive}>
            Dashboard
          </span>
          <span className={active === "incidents" ? navActive : navInactive}>
            Incidents
          </span>
          <span className={active === "programs" ? navActive : navInactive}>
            Programs
          </span>
          <span
            className={`inline-flex items-center gap-1 ${active === "report" ? `${navActive} font-semibold` : `${navInactive} border border-transparent`}`}
          >
            <SafetySparkMark
              className={`size-3 shrink-0 ${active === "report" ? "text-[#1a1a1a]" : "text-[#FFC107]"}`}
            />
            Report
          </span>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

function DashboardView() {
  return (
    <SyncSafetyAppShell active="dashboard">
      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        <div className="rounded-sm border border-[#9ca3af] bg-white px-3 py-2 sm:px-4">
          <div className="flex gap-2 border-l-4 border-[#FFC107] pl-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#111827] sm:text-sm">
                Compliance Alert: OSHA 300 posting window opens Apr 1
              </p>
              <p className="text-[10px] text-[#6b7280] sm:text-xs">
                Verify establishment totals and lock March incidents before export.
              </p>
            </div>
            <span className="inline-flex h-8 shrink-0 items-center rounded-sm bg-[#FFC107]/25 px-2 text-[10px] font-semibold text-[#111827] sm:text-xs">
              Review
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-[#111827] sm:text-xl">
            Dashboard
          </h1>
          <div className="flex gap-1.5">
            <span className="rounded-sm border border-[#9ca3af] bg-white px-2 py-1 text-[10px] font-semibold text-[#111827] sm:text-xs">
              OSHA export
            </span>
            <span className="rounded-sm border border-[#9ca3af] bg-white px-2 py-1 text-[10px] font-semibold text-[#111827] sm:text-xs">
              Layout
            </span>
          </div>
        </div>

        <section className="space-y-2">
          <div>
            <h2 className="text-sm font-semibold text-[#111827]">
              Safety Snapshot
            </h2>
            <p className="text-[10px] text-[#6b7280] sm:text-xs">
              30-day proactive and incident status at a glance.
            </p>
          </div>
          <div className="flex flex-col overflow-hidden rounded-xl border border-[#9ca3af] bg-white shadow-sm lg:flex-row">
            <div className="grid flex-1 grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-6 md:grid-cols-4 lg:items-stretch">
              {[
                { n: "12", label: "Walkarounds", icon: Footprints },
                { n: "08", label: "JHAs", icon: Clipboard },
                { n: "24", label: "Hazards Identified", icon: AlertTriangle },
                { n: "86", label: "Proactive Score", icon: Activity },
              ].map(({ n, label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-start px-1 pt-0.5 text-center"
                >
                  <p className="text-2xl font-normal tabular-nums leading-none text-slate-700 md:text-3xl">
                    {n}
                  </p>
                  <div className="mt-2 inline-flex max-w-full items-start gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#6b7280] md:text-[10px]">
                    <Icon
                      className="mt-0.5 size-3 shrink-0 stroke-slate-500"
                      strokeWidth={1.75}
                    />
                    <span className="text-balance leading-snug">{label}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid shrink-0 grid-cols-1 gap-3 border-t border-gray-100 bg-slate-50 p-4 sm:grid-cols-3 sm:gap-6 sm:p-6 lg:w-2/5 lg:border-l lg:border-t-0">
              {[
                { n: "06", label: "Total Incidents", tone: "text-slate-800" },
                { n: "02", label: "Open Incidents", tone: "text-amber-600" },
                { n: "01", label: "Needs Review", tone: "text-red-600" },
              ].map(({ n, label, tone }) => (
                <div
                  key={label}
                  className="flex flex-col items-center px-1 pt-0.5 text-center"
                >
                  <p
                    className={`text-2xl font-normal tabular-nums leading-none md:text-3xl ${tone}`}
                  >
                    {n}
                  </p>
                  <div className="mt-2 inline-flex items-start gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#6b7280] md:text-[10px]">
                    {label === "Total Incidents" ? (
                      <LayoutList className="mt-0.5 size-3 text-slate-500" />
                    ) : label === "Open Incidents" ? (
                      <AlertCircle className="mt-0.5 size-3 text-slate-500" />
                    ) : (
                      <Bell className="mt-0.5 size-3 text-slate-500" />
                    )}
                    <span className="text-balance leading-snug">{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            "SIF exposure index",
            "Incident by category",
            "YTD recordable rate",
          ].map((title) => (
            <div
              key={title}
              className="rounded-sm border border-[#9ca3af] bg-white p-3 shadow-sm"
            >
              <p className="text-[10px] font-semibold text-[#111827] sm:text-xs">
                {title}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[#111827]">
                {title.includes("rate") ? "0.42" : "—"}
              </p>
              <div className="mt-3 flex h-14 items-end gap-0.5">
                {[40, 55, 35, 70, 50, 65, 45].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-slate-200"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </SyncSafetyAppShell>
  );
}

function IncidentsView() {
  const mockRows = [
    {
      date: "Mar 12, 2026",
      type: "Near Miss",
      severity: "2",
      bodyPart: "—",
      status: "Needs Review",
    },
    {
      date: "Mar 10, 2026",
      type: "Injury",
      severity: "4",
      bodyPart: "Hand",
      status: "Active",
    },
    {
      date: "Mar 8, 2026",
      type: "Observation",
      severity: "1",
      bodyPart: "—",
      status: "Closed",
    },
    {
      date: "Mar 4, 2026",
      type: "Property Damage",
      severity: "3",
      bodyPart: "—",
      status: "Active",
    },
    {
      date: "Feb 28, 2026",
      type: "Unclassified",
      severity: "—",
      bodyPart: "Back",
      status: "Pending AI",
    },
  ];

  return (
    <SyncSafetyAppShell active="incidents">
      <div className="mx-auto w-full max-w-6xl space-y-4 rounded-2xl bg-[#f3f4f6] p-3 sm:space-y-5 sm:p-4">
        <header className="space-y-2">
          <h1 className="text-xl font-bold text-[#111827] sm:text-2xl md:text-3xl">
            Global Incident Ledger
          </h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-md border border-[#9ca3af] bg-white px-2 text-[10px] font-medium text-[#111827] sm:text-xs">
                Review Queue
              </span>
              <span className="inline-flex h-7 items-center rounded-md border border-[#9ca3af] bg-white px-2 text-[10px] font-medium text-[#111827] sm:text-xs">
                Filters
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#FFC107] bg-[#FFC107]/20 px-2.5 py-1 text-[10px] font-medium text-[#111827] sm:px-3 sm:py-1.5 sm:text-sm">
              Needs Review
            </span>
            <span className="rounded-md border border-[#9ca3af] bg-white px-2.5 py-1 text-[10px] font-medium text-[#111827] sm:px-3 sm:py-1.5 sm:text-sm">
              Active
            </span>
            <span className="rounded-md border border-[#9ca3af] bg-white px-2.5 py-1 text-[10px] font-medium text-[#111827] sm:px-3 sm:py-1.5 sm:text-sm">
              All
            </span>
          </div>
          <p className="text-[10px] text-[#6b7280] sm:text-sm">
            All incidents in your scope. Use dashboard chart drill-downs or
            status chips to focus this list.
          </p>
        </header>

        <section aria-labelledby="ledger-preview-title">
          <h2 id="ledger-preview-title" className="sr-only">
            Incident list
          </h2>
          <div className="overflow-x-auto rounded-lg border border-[#9ca3af] bg-white shadow-sm">
            <table className="w-full min-w-[520px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#9ca3af] text-[10px] font-medium uppercase tracking-wider text-[#6b7280] sm:text-xs">
                  <th className="px-3 py-2 sm:px-4 sm:py-3">Date</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3">Type</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3">Severity</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3">Body Part</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3">Status</th>
                  <th className="w-8 px-3 py-2 sm:px-4 sm:py-3" aria-hidden />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {mockRows.map((row, i) => (
                  <tr
                    key={`${row.date}-${i}`}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-[#111827] sm:px-4 sm:py-3">
                      {row.date}
                    </td>
                    <td className="px-3 py-2 text-[#111827] sm:px-4 sm:py-3">
                      {row.type}
                    </td>
                    <td className="px-3 py-2 text-[#111827] sm:px-4 sm:py-3">
                      {row.severity}
                    </td>
                    <td className="px-3 py-2 text-[#111827] sm:px-4 sm:py-3">
                      {row.bodyPart}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-[#111827] sm:text-xs">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <span className="text-[10px] font-medium text-[#FFC107] sm:text-sm">
                        View
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </SyncSafetyAppShell>
  );
}

function ProgramsView() {
  const templates = [
    { title: "Lockout/Tagout (LOTO)", description: "Control hazardous energy during maintenance activities." },
    { title: "Hazard Communication", description: "Chemical labeling, SDS handling, and worker notification protocols." },
    { title: "Machine Guarding", description: "Guarding requirements, inspections, and corrective action workflow." },
  ];

  const libraryRows = [
    { type: "Generated", title: "LOTO Program - Plant 2", source: "Template: Lockout/Tagout", date: "Mar 09, 2026" },
    { type: "Uploaded", title: "HazCom Master Policy", source: "hazcom-policy-v4.pdf", date: "Mar 01, 2026" },
    { type: "Generated", title: "Machine Guarding Standard", source: "Template: Machine Guarding", date: "Feb 22, 2026" },
  ];

  return (
    <SyncSafetyAppShell active="programs">
      <div className="mx-auto min-w-0 max-w-full space-y-6 rounded-sm bg-[#f3f4f6] px-3 py-3 sm:space-y-7 sm:p-4">
        <nav className="text-[10px] text-[#6b7280] sm:text-xs">
          <span className="hover:text-[#FFC107]">Dashboard</span>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span className="text-[#111827]">Safety Programs</span>
        </nav>

        <header className="flex flex-col gap-2 border-b border-[#9ca3af] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#9ca3af] bg-white text-[#FFC107]"
              aria-hidden
            >
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#111827] sm:text-2xl">
                Safety Programs
              </h1>
              <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-[#6b7280] sm:text-xs">
                Create written programs from built-in templates and keep uploaded PDFs/Word files in one library.
              </p>
            </div>
          </div>
          <span className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-[#FFC107] px-3 py-2 text-[10px] font-semibold text-[#0f0f0f] sm:text-xs">
            Open generator
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </header>

        <section className="space-y-3" aria-label="Create from a template">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#FFC107]" aria-hidden />
            <h2 className="text-sm font-semibold text-[#111827]">
              Create from a template
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((t) => (
              <article
                key={t.title}
                className="flex h-full flex-col rounded-lg border border-[#9ca3af] bg-white p-3 shadow-sm"
              >
                <div className="mb-2 flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#6b7280]" aria-hidden />
                  <h3 className="text-xs font-semibold leading-snug text-[#111827]">
                    {t.title}
                  </h3>
                </div>
                <p className="mb-3 flex-1 text-[10px] leading-relaxed text-[#6b7280] sm:text-xs">
                  {t.description}
                </p>
                <span className="inline-flex min-h-8 w-full items-center justify-center gap-1 rounded-md bg-[#FFC107] px-3 py-1.5 text-[10px] font-semibold text-[#0f0f0f] sm:text-xs">
                  Start wizard
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3" aria-label="Program library">
          <div className="flex items-center gap-2">
            <FolderUp className="h-4 w-4 text-[#FFC107]" aria-hidden />
            <h2 className="text-sm font-semibold text-[#111827]">
              Your program library
            </h2>
          </div>
          <div className="rounded-lg border border-[#9ca3af] bg-white p-3 shadow-sm">
            <p className="mb-1 text-xs font-medium text-[#111827]">
              Upload an existing file
            </p>
            <p className="mb-2 text-[10px] text-[#6b7280] sm:text-xs">
              Add PDF, Word, Markdown, or text copies of programs your team already uses.
            </p>
            <span className="inline-flex rounded-md border border-[#9ca3af] bg-[#f3f4f6] px-2.5 py-1 text-[10px] font-medium text-[#111827] sm:text-xs">
              Select file...
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#9ca3af] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-[10px] sm:text-xs">
                <thead>
                  <tr className="border-b border-[#9ca3af] bg-[#f3f4f6]">
                    <th className="px-3 py-2 font-semibold text-[#111827]">Type</th>
                    <th className="px-3 py-2 font-semibold text-[#111827]">Title</th>
                    <th className="px-3 py-2 font-semibold text-[#111827]">Source / file</th>
                    <th className="px-3 py-2 font-semibold text-[#111827]">Date</th>
                    <th className="px-3 py-2 text-right font-semibold text-[#111827]">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {libraryRows.map((row) => (
                    <tr key={row.title} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6]/60">
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                            row.type === "Generated"
                              ? "bg-[#FFC107]/15 text-[#b45309]"
                              : "bg-slate-500/15 text-slate-600"
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-[#111827]">{row.title}</td>
                      <td className="px-3 py-2 text-[#6b7280]">{row.source}</td>
                      <td className="px-3 py-2 text-[#6b7280] tabular-nums">{row.date}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="inline-flex items-center gap-1 font-medium text-[#FFC107]">
                          View
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </SyncSafetyAppShell>
  );
}

const REPORT_TYPES = [
  {
    type: "walkaround",
    title: "Safety Checks & Walkarounds",
    desc: "Perform routine field checks and document findings.",
  },
  {
    type: "audit",
    title: "Formal Audits",
    desc: "Run structured compliance audits across operations.",
  },
  {
    type: "jha",
    title: "Job Hazard Analysis (JHA)",
    desc: "Identify and control hazards before work begins.",
  },
  {
    type: "incident",
    title: "Incident Investigations",
    desc: "Capture incident details, evidence, and corrective actions.",
  },
] as const;

function ReportView() {
  return (
    <SyncSafetyAppShell active="report">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 bg-[#f3f4f6] p-3 sm:gap-5 sm:p-4">
        <div className="rounded-sm border border-dashed border-[#9ca3af] bg-white/90 p-3">
          <p className="text-xs font-semibold text-[#111827] sm:text-sm">
            Draft Capture Session
          </p>
          <p className="mt-1 text-[10px] text-[#6b7280] sm:text-xs">
            Source: field supervisor voice memo + attached photo evidence
          </p>
        </div>

        <header className="space-y-1">
          <h1 className="text-base font-bold text-[#111827] sm:text-lg">
            Incident Report
          </h1>
          <p className="text-[10px] text-[#111827]/90 sm:text-xs">
            Capture incidents fast from the field. Voice transcript and photo
            evidence.
          </p>
        </header>

        <section className="rounded-sm border border-[#9ca3af] bg-white p-3 shadow-sm">
          <div className="space-y-2.5">
            <div>
              <p className="mb-1 text-[10px] font-medium text-[#6b7280] sm:text-xs">
                Location / org unit
              </p>
              <div className="flex h-8 items-center rounded-sm border border-[#d1d5db] bg-[#f9fafb] px-2 text-[10px] text-[#111827] sm:text-xs">
                Plant 2 - Assembly Line 4
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium text-[#6b7280] sm:text-xs">
                Date & time
              </p>
              <div className="flex h-8 items-center rounded-sm border border-[#d1d5db] bg-[#f9fafb] px-2 text-[10px] text-[#111827] sm:text-xs">
                2026-03-14 07:42
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium text-[#6b7280] sm:text-xs">
                Narrative summary
              </p>
              <div className="flex h-8 items-center rounded-sm border border-[#d1d5db] bg-[#f9fafb] px-2 text-[10px] text-[#111827] sm:text-xs">
                Slip hazard at coolant station; no lost-time injury reported.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-[10px] font-medium text-[#6b7280] sm:text-xs">
                  Severity
                </p>
                <div className="flex h-8 items-center rounded-sm border border-[#d1d5db] bg-[#f9fafb] px-2 text-[10px] text-[#111827] sm:text-xs">
                  2 - Medical treatment
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-medium text-[#6b7280] sm:text-xs">
                  Case status
                </p>
                <div className="flex h-8 items-center rounded-sm border border-[#d1d5db] bg-[#f9fafb] px-2 text-[10px] text-[#111827] sm:text-xs">
                  Active investigation
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-[#9ca3af] pt-4">
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-[#111827]/90 sm:text-xs">
            Switch Report Type
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {REPORT_TYPES.map((item) => (
              <div
                key={item.type}
                className={`rounded-sm border bg-white p-3 text-left shadow-sm sm:p-4 ${
                  item.type === "incident"
                    ? "border-2 border-[#FFC107]"
                    : "border border-[#9ca3af]"
                }`}
              >
                <div className="mb-2 inline-flex rounded-sm bg-[#FFC107]/15 p-2 text-[#FFC107]">
                  <SafetySparkMark className="size-5" />
                </div>
                <h4 className="text-xs font-semibold text-[#111827] sm:text-sm">
                  {item.title}
                </h4>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#111827]/90 sm:text-xs">
                  {item.desc}
                </p>
              </div>
            ))}
            <div className="rounded-sm border border-[#9ca3af] bg-white p-3 shadow-sm sm:p-4">
              <div className="mb-2 inline-flex rounded-sm bg-[#FFC107]/15 p-2 text-[#FFC107]">
                <span className="text-xs font-bold">◎</span>
              </div>
              <h4 className="text-xs font-semibold text-[#111827] sm:text-sm">
                Spot Check
              </h4>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[#111827]/90 sm:text-xs">
                Upload a worksite photo for an AI compliance scan and hazard
                findings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SyncSafetyAppShell>
  );
}

export default function SyncSafetyPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border/60 bg-topography-texture px-4 py-12 sm:px-6 sm:py-16">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card/15 via-background/65 to-background"
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl rounded-2xl border border-white/60 bg-white/60 p-6 backdrop-blur-sm sm:p-8">
          <PristineMockup mockUrl="SyncSafety.app">
            <DashboardView />
            <IncidentsView />
            <ProgramsView />
            <ReportView />
          </PristineMockup>
        </div>
      </section>
      <ProductStoryLayout
        heroHeadline="Safety is an Investment. Documentation shouldn't be the Cost."
        heroSubheadline="Precision Compliance. Zero Friction."
        problem="Safety teams lose hours to redundant forms, re-keyed incident details, and spreadsheet patchwork—tedious paperwork that steals time from the floor, not from risk."
        solution="SyncSafety is an engineered workflow built on OSHA 1904 structure so recordability, logs, and exports stay precise without the clerical drag."
        features={[
          "Guided recordability that replaces spreadsheet archaeology after every incident",
          "OSHA 300 CSV exports without rebuilding workbooks each reporting cycle",
          "Structured data paths so you stop duplicating the same narrative across forms",
        ]}
        outcome="Spend fewer nights on administrative clean-up and more cycles on prevention—the paperwork pipeline runs quietly in the background."
        ctaLabel="Request Early Access"
        ctaHref={`/syncsafety#${CTA_SECTION_ID}`}
        ctaSectionId={CTA_SECTION_ID}
      />
    </>
  );
}
