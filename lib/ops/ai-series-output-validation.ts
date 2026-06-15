import type { OpsAiSeriesSplitContext } from "@/lib/ops/ai-series-context";
import type { OpsAiSeriesSplitProposal } from "@/lib/ops/types";

function visibleLength(value: string) {
  return Array.from(value).length;
}

export function validateSeriesSplitOutput({
  context,
  proposals,
}: {
  context: OpsAiSeriesSplitContext;
  proposals: OpsAiSeriesSplitProposal[];
}) {
  const issues: string[] = [];
  const slotById = new Map(context.slots.map((slot) => [slot.slotId, slot]));
  const seen = new Set<string>();

  for (const proposal of proposals) {
    const slot = slotById.get(proposal.proposalId);
    const path = `aiSeriesProposals.${proposal.proposalId}`;

    if (!slot) {
      issues.push(`${path}: proposal does not match a selected publication target.`);
      continue;
    }

    if (seen.has(proposal.proposalId)) {
      issues.push(`${path}: duplicate proposal for the same selected slot.`);
    }
    seen.add(proposal.proposalId);

    if (proposal.platform !== slot.platform) {
      issues.push(
        `${path}: platform must remain ${slot.platform} for the selected target.`,
      );
    }

    if (proposal.publicationTargetId !== slot.publicationTargetId) {
      issues.push(`${path}: publicationTargetId does not match the selected slot.`);
    }

    const body = proposal.body.trim();
    if (!body) {
      issues.push(`${path}.body: draft body cannot be empty after sanitization.`);
      continue;
    }

    const bodyLength = visibleLength(body);
    if (bodyLength > slot.bodyMaxChars) {
      issues.push(
        `${path}.body: ${slot.platform} draft is ${bodyLength} characters; max is ${slot.bodyMaxChars}.`,
      );
    }

    if (slot.platform === "X" && bodyLength > 280) {
      issues.push(`${path}.body: X draft must fit in one 280-character post.`);
    }
  }

  for (const slot of context.slots) {
    if (!seen.has(slot.slotId)) {
      issues.push(`aiSeriesProposals.${slot.slotId}: missing proposal for selected slot.`);
    }
  }

  return issues;
}
