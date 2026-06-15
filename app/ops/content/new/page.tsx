import { BoundaryPill, OpsPageHeader, opsShellClass } from "@/app/ops/_components/ops-ui";
import { ContentNewWorkspace } from "@/app/ops/_components/content-new-workspace";
import { getOpsAiPublicStatus } from "@/lib/ops/ai-config";
import { opsDashboardData } from "@/lib/ops/mock-data";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function OpsNewContentPackagePage() {
  const aiStatus = getOpsAiPublicStatus();
  const storageMode =
    process.env.OPS_STORAGE_MODE === "database" && process.env.DATABASE_URL
      ? "database"
      : "local-browser";
  const storageIsDatabase = storageMode === "database";
  const {
    audienceProfiles,
    brandProfiles,
    businessOutcomes,
    contentPackages,
    draftReviewChecklist,
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
    <main className="min-w-0">
      <OpsPageHeader
        eyebrow="Content creation"
        title="New Content"
        description="Split a weekly summary into platform posts with AI, or build a single source update into draft slots. Manage saved packages, posting, and metrics below."
      />

      <div className={`${opsShellClass} grid min-w-0 gap-6 py-6`}>
        <div className="flex flex-wrap gap-2">
          <BoundaryPill>
            {storageIsDatabase ? "Durable database save" : "Local browser save"}
          </BoundaryPill>
          <BoundaryPill>
            {aiStatus.enabled ? "AI split + improve enabled" : "AI disabled"}
          </BoundaryPill>
          <BoundaryPill>Manual approval before posting</BoundaryPill>
          <BoundaryPill>No PHI or clinical payloads</BoundaryPill>
        </div>

        <ContentNewWorkspace
          aiStatus={aiStatus}
          audienceProfiles={audienceProfiles}
          brandProfiles={brandProfiles}
          draftReviewChecklist={draftReviewChecklist}
          initialRecords={initialRecords}
          projects={projects}
          publicationTargets={publicationTargets}
          storageMode={storageMode}
        />
      </div>
    </main>
  );
}
