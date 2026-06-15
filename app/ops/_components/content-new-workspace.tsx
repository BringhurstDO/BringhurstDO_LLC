"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, FilePlus2, Sparkles } from "lucide-react";

import { ContentPackageBuilder } from "@/app/ops/_components/content-package-builder";
import { ContentSeriesBuilder } from "@/app/ops/_components/content-series-builder";
import type { OpsStorageMode } from "@/lib/ops/persistence";
import type {
  OpsAiPublicStatus,
  OpsAudienceProfile,
  OpsBrandProfile,
  OpsContentPackageRecord,
  OpsProjectSummary,
  PublicationTarget,
} from "@/lib/ops/types";

type ContentNewWorkspaceProps = {
  aiStatus: OpsAiPublicStatus;
  audienceProfiles: OpsAudienceProfile[];
  brandProfiles: OpsBrandProfile[];
  draftReviewChecklist: string[];
  initialRecords: OpsContentPackageRecord[];
  projects: OpsProjectSummary[];
  publicationTargets: PublicationTarget[];
  storageMode: Extract<OpsStorageMode, "database" | "local-browser">;
};

type CreateMode = "series" | "single";

export function ContentNewWorkspace(props: ContentNewWorkspaceProps) {
  const [mode, setMode] = useState<CreateMode>("series");

  return (
    <div className="grid min-w-0 gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-sans text-base font-semibold text-slate-950">
          What are you creating?
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Paste or upload a weekly summary to split into scheduled posts, or
          build one source update into platform draft slots manually.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("series")}
            className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
              mode === "series"
                ? "bg-violet-700 text-white"
                : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Split weekly summary
          </button>
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
              mode === "single"
                ? "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            <FilePlus2 className="h-4 w-4" aria-hidden />
            Single source update
          </button>
          <Link
            href="/ops/content/calendar"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <CalendarDays className="h-4 w-4" aria-hidden />
            Publish calendar
          </Link>
        </div>
      </section>

      {mode === "series" ? (
        <ContentSeriesBuilder
          aiStatus={props.aiStatus}
          initialRecords={props.initialRecords}
          projects={props.projects}
          publicationTargets={props.publicationTargets}
          storageMode={props.storageMode}
        />
      ) : (
        <ContentPackageBuilder {...props} />
      )}
    </div>
  );
}
