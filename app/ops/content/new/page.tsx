import { BoundaryPill, OpsPageHeader } from "@/app/ops/_components/ops-ui";
import { ContentPackageBuilder } from "@/app/ops/_components/content-package-builder";
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
  const pageDescription = storageIsDatabase
    ? "Enter one metadata-only source update, select products/accounts/platforms, create platform draft slots, save to the Ops database, export/import packages, copy post packets, and track manual posting."
    : "Enter one metadata-only source update, select products/accounts/platforms, create platform draft slots, save locally, export/import packages, copy post packets, and track manual posting.";
  const storageBoundaryLabel = storageIsDatabase
    ? "Durable database save"
    : "Local browser save only";
  const workflowDescription = storageIsDatabase
    ? "Enter One Metadata-Only Update, then Select Products, Accounts, And Platforms. Create Platform-Specific Draft Slots, save them to the Ops database, export or import package JSON, copy post packets for manual review, and manage weekly queue state, public URLs, and aggregate performance metrics."
    : "Enter One Metadata-Only Update, then Select Products, Accounts, And Platforms. Create Platform-Specific Draft Slots, save them locally, export or import package JSON, copy post packets for manual review, and manage weekly queue state, public URLs, and aggregate performance metrics.";
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
    <main>
      <OpsPageHeader
        eyebrow="Source update to content package"
        title="New Content Package"
        description={pageDescription}
      />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <BoundaryPill>{storageBoundaryLabel}</BoundaryPill>
          <BoundaryPill>No AI generation</BoundaryPill>
          <BoundaryPill>No posting API</BoundaryPill>
          <BoundaryPill>No PHI or clinical payloads</BoundaryPill>
          <BoundaryPill>Manual approval before posting or spend</BoundaryPill>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700 shadow-sm">
          <h2 className="font-sans text-base font-semibold text-slate-950">
            Content Package Workflow
          </h2>
          <p className="mt-2">
            {workflowDescription}
          </p>
        </section>

        <ContentPackageBuilder
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
