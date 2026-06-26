import type { OpsAiSeriesSplitContext } from "@/lib/ops/ai-series-context";
import type { ParsedSeriesPost } from "@/lib/ops/ai-series-prompt";
import { prepareSeriesPublishableBody } from "@/lib/ops/publishable-copy";
import type { OpsAiSeriesSplitProposal } from "@/lib/ops/types";

type SeriesSlot = OpsAiSeriesSplitContext["slots"][number];

function truncateBody(value: string, max: number) {
  const normalized = value.trim();

  if (normalized.length <= max) {
    return normalized;
  }

  const clipped = normalized.slice(0, Math.max(1, max - 1));
  const lastSpace = clipped.lastIndexOf(" ");

  return (lastSpace > max * 0.45 ? clipped.slice(0, lastSpace) : clipped).trim();
}

export function heuristicSeriesBody(
  context: OpsAiSeriesSplitContext,
  slot: SeriesSlot,
) {
  const { summary, title } = context.series;
  const firstSentence = summary.split(/(?<=[.!?])\s+/)[0]?.trim() ?? summary.trim();

  let body =
    slot.seriesIndex === 1
      ? slot.platform === "X"
        ? `${title}: ${firstSentence}`
        : `${title}\n\n${summary.trim()}`
      : slot.platform === "X"
        ? `${title} — ${firstSentence}`
        : `${title}\n\n${firstSentence}`;

  if (slot.platform === "Instagram") {
    body = `${body}\n\n#America250 #BuildInPublic`;
  }

  return prepareSeriesPublishableBody(truncateBody(body, slot.bodyMaxChars));
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readOptionalSeriesIndex(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return null;
}

/** Gemini often omits the series prefix or uses publicationTargetId instead of slotId. */
export function resolveSeriesPostSlotId(
  post: ParsedSeriesPost,
  slots: SeriesSlot[],
  taken: Set<string>,
) {
  const slotById = new Map(slots.map((slot) => [slot.slotId, slot]));
  const rawSlotId = readOptionalString(post.slotId);

  if (rawSlotId && slotById.has(rawSlotId) && !taken.has(rawSlotId)) {
    return rawSlotId;
  }

  const publicationTargetId = readOptionalString(
    (post as { publicationTargetId?: unknown }).publicationTargetId,
  );
  const seriesIndex = readOptionalSeriesIndex(
    (post as { seriesIndex?: unknown }).seriesIndex,
  );

  if (publicationTargetId) {
    const matches = slots.filter(
      (slot) =>
        !taken.has(slot.slotId) &&
        slot.publicationTargetId === publicationTargetId &&
        (seriesIndex === null || slot.seriesIndex === seriesIndex),
    );

    if (matches.length === 1) {
      return matches[0]!.slotId;
    }

    if (matches.length > 1 && seriesIndex === null) {
      return matches[0]!.slotId;
    }
  }

  if (rawSlotId) {
    for (const slot of slots) {
      if (taken.has(slot.slotId)) {
        continue;
      }

      const indexedSuffix = `-${slot.seriesIndex}`;

      if (
        rawSlotId === slot.publicationTargetId ||
        rawSlotId.endsWith(`${slot.publicationTargetId}${indexedSuffix}`) ||
        (rawSlotId.endsWith(indexedSuffix) &&
          rawSlotId.includes(slot.publicationTargetId))
      ) {
        return slot.slotId;
      }

      if (slot.slotId.endsWith(rawSlotId) || slot.slotId.includes(rawSlotId)) {
        return slot.slotId;
      }
    }

    const targetOnlyMatches = slots.filter(
      (slot) => !taken.has(slot.slotId) && slot.publicationTargetId === rawSlotId,
    );

    if (targetOnlyMatches.length === 1) {
      return targetOnlyMatches[0]!.slotId;
    }
  }

  return null;
}

function proposalFromSlot(
  context: OpsAiSeriesSplitContext,
  slot: SeriesSlot,
  post: ParsedSeriesPost | null,
  usedHeuristic: boolean,
): OpsAiSeriesSplitProposal {
  const rawBody = readOptionalString(post?.body);
  const preparedBody = rawBody
    ? prepareSeriesPublishableBody(rawBody)
    : heuristicSeriesBody(context, slot);
  const body = preparedBody.trim() ? preparedBody : heuristicSeriesBody(context, slot);

  return {
    accountName: slot.accountName,
    body,
    mediaNote:
      readOptionalString(post?.mediaNote) ||
      (usedHeuristic
        ? "Heuristic draft from weekly summary — review before posting."
        : "Review media metadata before posting."),
    platform: slot.platform,
    proposalId: slot.slotId,
    publicationTargetId: slot.publicationTargetId,
    safetyNotes: Array.isArray(post?.safetyNotes)
      ? post.safetyNotes.filter(
          (note): note is string =>
            typeof note === "string" && note.trim().length > 0,
        )
      : usedHeuristic
        ? ["Heuristic fallback draft — confirm tone and claims before posting."]
        : ["Manual review required before posting."],
    seriesIndex: slot.seriesIndex,
    suggestedScheduledFor: slot.suggestedScheduledFor,
    title:
      readOptionalString(post?.title) ||
      `${context.series.title} — ${slot.seriesIndex}`,
  };
}

export function mapSeriesSplitProposals(
  context: OpsAiSeriesSplitContext,
  posts: ParsedSeriesPost[] | undefined,
) {
  const taken = new Set<string>();
  const postBySlotId = new Map<string, ParsedSeriesPost>();

  for (const post of posts ?? []) {
    const slotId = resolveSeriesPostSlotId(post, context.slots, taken);

    if (!slotId || !readOptionalString(post.body)) {
      continue;
    }

    taken.add(slotId);
    postBySlotId.set(slotId, post);
  }

  return context.slots.map((slot) => {
    const matched = postBySlotId.get(slot.slotId) ?? null;

    return proposalFromSlot(context, slot, matched, matched === null);
  });
}
