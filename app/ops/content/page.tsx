import Link from "next/link";
import { CalendarDays, FilePlus2, Megaphone } from "lucide-react";

import {
  BoundaryPill,
  OpsPageHeader,
  opsShellClass,
} from "@/app/ops/_components/ops-ui";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function OpsContentPage() {
  return (
    <main>
      <OpsPageHeader
        eyebrow="Content workspace"
        title="Content Planning"
        description="Split weekly summaries, build packages, and manage the publish calendar. Legacy idea bank and draft queue were removed — saved packages are the source of truth."
      />

      <div className={`${opsShellClass} grid gap-6 py-6`}>
        <div className="flex flex-wrap gap-2">
          <BoundaryPill>Manual approval before posting</BoundaryPill>
          <BoundaryPill>LinkedIn publish + optional autopublish</BoundaryPill>
          <BoundaryPill>No PHI or clinical payloads</BoundaryPill>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-sans text-base font-semibold text-slate-950">
                Publish Calendar
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Review today&apos;s drafts, overdue items, and upcoming schedule.
                Approve, reschedule, remove, or publish from one place.
              </p>
            </div>
            <Link
              href="/ops/content/calendar"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              Open Calendar
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-sans text-base font-semibold text-slate-950">
                Weekly Summary To Content Series
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Paste a metadata-only weekly summary and let AI split it into
                platform posts with suggested publish dates.
              </p>
            </div>
            <Link
              href="/ops/content/series"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-violet-300 bg-violet-50 px-4 text-sm font-semibold text-violet-900 hover:bg-violet-100"
            >
              <Megaphone className="h-4 w-4" aria-hidden />
              Split Series
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-sans text-base font-semibold text-slate-950">
                Single Source Update
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Turn one metadata-only update into platform draft slots manually,
                without AI series split.
              </p>
            </div>
            <Link
              href="/ops/content/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden />
              New Content
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
