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
  const {
    businessOutcomes,
    contentPackages,
    performanceSnapshots,
    platformDrafts,
    publicationTargets,
    publishedPosts,
    sourceUpdates,
  } = opsDashboardData;

  const initialRecords = contentPackages.map((contentPackage) => {
    const sourceUpdate = sourceUpdates.find(
      (item) => item.id === contentPackage.sourceUpdateId,
    );
    const packageDrafts = platformDrafts.filter(
      (draft) => draft.contentPackageId === contentPackage.id,
    );
    const packagePublishedPosts = publishedPosts.filter((post) =>
      packageDrafts.some((draft) => draft.id === post.platformDraftId),
    );
    const packagePerformanceSnapshots = performanceSnapshots.filter((snapshot) =>
      packagePublishedPosts.some((post) => post.id === snapshot.publishedPostId),
    );
    const businessOutcome = businessOutcomes.find(
      (outcome) => outcome.contentPackageId === contentPackage.id,
    );

    if (!sourceUpdate || !businessOutcome) {
      throw new Error(`Mock content package ${contentPackage.id} is incomplete.`);
    }

    return {
      businessOutcome,
      contentPackage,
      performanceSnapshots: packagePerformanceSnapshots,
      platformDrafts: packageDrafts,
      publishedPosts: packagePublishedPosts,
      sourceUpdate,
    };
  });

  return (
    <main>
      <OpsPageHeader
        eyebrow="Phase 8B — publish calendar"
        title="Publish Calendar"
        description="See what to post when across saved content packages and series splits. Approve drafts, opt in to scheduled LinkedIn autopublish (8C), or publish manually from the calendar."
      />

      <div className={`${opsShellClass} grid gap-6 py-6`}>
        <div className="flex flex-wrap gap-2">
          <BoundaryPill>
            {storageIsDatabase ? "Durable database save" : "Local browser save"}
          </BoundaryPill>
          <BoundaryPill>Manual publish always available</BoundaryPill>
          <BoundaryPill>8C autopublish: LinkedIn + opt-in + approved</BoundaryPill>
          <BoundaryPill>LinkedIn publish when connected</BoundaryPill>
        </div>

        <PublishCalendarPanel
          initialRecords={initialRecords}
          publicationTargets={publicationTargets}
          storageMode={storageMode}
        />
      </div>
    </main>
  );
}
