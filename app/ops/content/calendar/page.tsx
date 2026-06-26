import { BoundaryPill, OpsPageHeader, opsShellClass } from "@/app/ops/_components/ops-ui";
import { PublishCalendarPanel } from "@/app/ops/_components/publish-calendar-panel";
import { opsDashboardData } from "@/lib/ops/mock-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function OpsPublishCalendarPage() {
  const storageMode =
    process.env.OPS_STORAGE_MODE === "database" && process.env.DATABASE_URL
      ? "database"
      : "local-browser";
  const storageIsDatabase = storageMode === "database";
  const { publicationTargets } = opsDashboardData;

  return (
    <main>
      <OpsPageHeader
        eyebrow="Phase 8B — publish calendar"
        title="Publish Calendar"
        description="See what to post when across saved content packages and series splits. Approve drafts, opt in to scheduled autopublish for connected platforms, or publish manually from the calendar."
      />

      <div className={`${opsShellClass} grid gap-6 py-6`}>
        <div className="flex flex-wrap gap-2">
          <BoundaryPill>
            {storageIsDatabase ? "Durable database save" : "Local browser save"}
          </BoundaryPill>
          <BoundaryPill>Manual publish always available</BoundaryPill>
          <BoundaryPill>8C autopublish: approved + opt-in per draft</BoundaryPill>
          <BoundaryPill>LinkedIn, X, Facebook, Instagram when connected</BoundaryPill>
        </div>

        <PublishCalendarPanel
          initialRecords={[]}
          publicationTargets={publicationTargets}
          storageMode={storageMode}
        />
      </div>
    </main>
  );
}
