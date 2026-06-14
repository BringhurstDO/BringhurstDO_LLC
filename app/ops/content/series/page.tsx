import { BoundaryPill, OpsPageHeader, opsShellClass } from "@/app/ops/_components/ops-ui";
import { ContentSeriesBuilder } from "@/app/ops/_components/content-series-builder";
import { getOpsAiPublicStatus } from "@/lib/ops/ai-config";
import { opsDashboardData } from "@/lib/ops/mock-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function OpsContentSeriesPage() {
  const aiStatus = getOpsAiPublicStatus();
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
    projects,
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
        eyebrow="Phase 8A — content series"
        title="Weekly Summary To Series"
        description="Paste one metadata-only weekly summary, split it into platform-specific posts with suggested publish dates, review every draft, and save as a standard content package. No autopost scheduling."
      />

      <div className={`${opsShellClass} grid gap-6 py-6`}>
        <div className="flex flex-wrap gap-2">
          <BoundaryPill>
            {storageIsDatabase ? "Durable database save" : "Local browser save"}
          </BoundaryPill>
          <BoundaryPill>AI split — manual review required</BoundaryPill>
          <BoundaryPill>Suggested dates only — no autopost</BoundaryPill>
          <BoundaryPill>No PHI or clinical payloads</BoundaryPill>
        </div>

        <ContentSeriesBuilder
          aiStatus={aiStatus}
          initialRecords={initialRecords}
          projects={projects}
          publicationTargets={publicationTargets}
          storageMode={storageMode}
        />
      </div>
    </main>
  );
}
