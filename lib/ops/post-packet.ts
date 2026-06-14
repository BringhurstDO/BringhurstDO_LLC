import { sanitizePublishableBody } from "@/lib/ops/publishable-copy";
import type { OpsContentPackageRecord, PlatformDraft } from "@/lib/ops/types";

function formatPublishableDraftSection(draft: PlatformDraft) {
  const body = sanitizePublishableBody(draft.body);

  return `## Paste to ${draft.platform}

Title: ${draft.title}

${body}`;
}

function formatInternalDraftSection(
  draft: PlatformDraft,
  record: OpsContentPackageRecord,
) {
  const post = record.publishedPosts.find(
    (item) => item.platformDraftId === draft.id,
  );
  const operatorNotes = [
    ...(draft.operatorNotes ?? []),
    ...(draft.aiReviewNotes ?? []),
    ...draft.safetyNotes,
  ];

  return `## Internal - do not post (${draft.accountName} / ${draft.platform})

Draft ID: ${draft.id}
Status: ${draft.status}
Posted tracking: ${post?.status ?? "not posted"}
Source project: ${draft.sourceProjectId}
Publishing project: ${draft.publishingProjectId}
UTM campaign ID: ${draft.utmCampaignId}
UTM URL: ${draft.generatedUrl}
Published URL: ${post?.postedUrl ?? post?.postUrl ?? "Not posted"}
Posted at: ${post?.postedAt ?? post?.postedManuallyAt ?? "Not posted"}
Media type: ${draft.media.mediaType}
Media summary: ${draft.media.mediaSummary}
Visual hook: ${draft.media.visualHook}
Creative angle: ${draft.media.creativeAngle}
Production effort: ${draft.media.productionEffort}
Asset reference: ${draft.media.assetLocation ?? "None"}
Reuse status: ${draft.media.reuseStatus}
${draft.lastAiRunId ? `Last AI run: ${draft.lastAiRunId}` : ""}

Operator / safety notes:
${operatorNotes.length > 0 ? operatorNotes.map((note) => `- ${note}`).join("\n") : "- None"}`;
}

export function buildPublishableCopy(record: OpsContentPackageRecord) {
  return record.platformDrafts
    .map((draft) => formatPublishableDraftSection(draft))
    .join("\n\n");
}

export function buildPostPacket(record: OpsContentPackageRecord) {
  const publishableSections = record.platformDrafts
    .map((draft) => formatPublishableDraftSection(draft))
    .join("\n\n");
  const internalSections = record.platformDrafts
    .map((draft) => formatInternalDraftSection(draft, record))
    .join("\n\n");

  return `# Post Packet: ${record.contentPackage.title}

Source update: ${record.sourceUpdate.title}
Source project: ${record.sourceUpdate.sourceProjectId}
Source date: ${record.sourceUpdate.sourceDate}
Publishing projects: ${record.contentPackage.publishingProjectIds.join(", ")}
Approval required: ${record.contentPackage.approvalRequired ? "Yes" : "No"}

# Publishable copy

${publishableSections}

# Internal - do not post

Package notes:
${record.contentPackage.notes.map((note) => `- ${note}`).join("\n")}

Boundary: metadata-only operator context. No PHI, credentials, private messages, or raw logs in public copy.

${record.sourceUpdate.summary}

${internalSections}
`;
}
