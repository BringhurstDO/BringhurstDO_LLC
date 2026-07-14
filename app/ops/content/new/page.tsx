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
    draftReviewChecklist,
    projects,
    publicationTargets,
  } = opsDashboardData;

  return (
    <main className="min-w-0">
      <OpsPageHeader
        eyebrow="Content creation"
        title="New Content"
        description="Draft one post, enhance it with AI, choose destinations, and schedule it without leaving this page. Weekly summaries can still be split into a multi-post series."
      />

      <div className={`${opsShellClass} grid min-w-0 gap-6 py-6`}>
        <div className="flex flex-wrap gap-2">
          <BoundaryPill>
            {storageIsDatabase ? "Durable database save" : "Local browser save"}
          </BoundaryPill>
          <BoundaryPill>
            {aiStatus.enabled ? "AI enhance + series split enabled" : "AI disabled"}
          </BoundaryPill>
          <BoundaryPill>Manual approval before posting</BoundaryPill>
          <BoundaryPill>No PHI or clinical payloads</BoundaryPill>
        </div>

        <ContentNewWorkspace
          aiStatus={aiStatus}
          audienceProfiles={audienceProfiles}
          brandProfiles={brandProfiles}
          draftReviewChecklist={draftReviewChecklist}
          initialRecords={[]}
          projects={projects}
          publicationTargets={publicationTargets}
          storageMode={storageMode}
        />
      </div>
    </main>
  );
}
