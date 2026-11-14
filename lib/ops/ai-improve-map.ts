import type { OpsAiVisibleContext } from "@/lib/ops/ai-visible-context";
import type { ParsedAiPayload } from "@/lib/ops/ai-prompt";
import { sanitizePublishableBody } from "@/lib/ops/publishable-copy";
import { preserveSourceHashtags } from "@/lib/ops/social-hashtags";
import type { OpsAiImprovedDraftProposal } from "@/lib/ops/types";

export function mapImprovedDraftProposals(
  context: OpsAiVisibleContext,
  parsed: ParsedAiPayload,
) {
  const allowedDraftIds = new Set(context.platformDrafts.map((draft) => draft.id));

  return (parsed.drafts ?? [])
    .filter(
      (draft): draft is typeof draft & { platformDraftId: string; body: string } =>
        Boolean(
          draft.platformDraftId &&
            allowedDraftIds.has(draft.platformDraftId) &&
            typeof draft.body === "string" &&
            draft.body.trim(),
        ),
    )
    .map((draft) => {
      const sourceDraft = context.platformDrafts.find(
        (item) => item.id === draft.platformDraftId,
      );
      const platform =
        (draft.platform as OpsAiImprovedDraftProposal["platform"]) ??
        (sourceDraft?.platform as OpsAiImprovedDraftProposal["platform"]);
      const sourceText = `${context.sourceUpdate.title}\n${context.sourceUpdate.summary}\n${sourceDraft?.body ?? ""}`;
      const body = preserveSourceHashtags({
        body: sanitizePublishableBody(draft.body.trim()),
        platform,
        sourceText,
      });

      return {
        accountName: draft.accountName ?? sourceDraft?.accountName ?? "Unknown",
        body,
        mediaNote:
          typeof draft.mediaNote === "string" && draft.mediaNote.trim()
            ? draft.mediaNote.trim()
            : "Review media metadata before posting.",
        platform,
        platformDraftId: draft.platformDraftId,
        imageOverlayHeadline:
          typeof draft.imageOverlayHeadline === "string" &&
          draft.imageOverlayHeadline.trim()
            ? draft.imageOverlayHeadline
                .replace(/[#@]|https?:\/\/|www\./gi, "")
                .trim()
                .slice(0, 90)
            : undefined,
        safetyNotes: Array.isArray(draft.safetyNotes)
          ? draft.safetyNotes.filter(
              (note): note is string =>
                typeof note === "string" && note.trim().length > 0,
            )
          : ["Manual review required before posting."],
        title:
          typeof draft.title === "string" && draft.title.trim()
            ? draft.title.trim()
            : sourceDraft?.title ?? "Untitled draft",
      } satisfies OpsAiImprovedDraftProposal;
    });
}
