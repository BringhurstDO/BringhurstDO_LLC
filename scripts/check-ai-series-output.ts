import { validateSeriesSplitOutput } from "../lib/ops/ai-series-output-validation";
import type { OpsAiSeriesSplitContext } from "../lib/ops/ai-series-context";
import type { OpsAiSeriesSplitProposal } from "../lib/ops/types";

const context: OpsAiSeriesSplitContext = {
  audienceRules: [],
  brandRules: [],
  excludedData:
    "No PHI, patient identifiers, encounter text, transcripts, clinical payloads, credentials, cookies, tokens, OAuth data, audience exports, secret values, or sensitive internal security findings.",
  manualReviewRequired: true,
  reviewChecklist: ["Review before posting."],
  series: {
    id: "series-test",
    postsPerWeek: 1,
    sourceProjectId: "bringhurstdo",
    startDate: "2026-06-15",
    summary: "Metadata-only summary.",
    title: "Series test",
    updateType: "weekly-review",
    weekCount: 1,
  },
  slots: [
    {
      accountName: "BringhurstDO LinkedIn",
      bodyMaxChars: 1300,
      platform: "LinkedIn",
      publicationTargetId: "target-linkedin",
      seriesIndex: 1,
      slotId: "slot-linkedin",
      suggestedScheduledFor: "2026-06-15",
    },
    {
      accountName: "BringhurstDO X",
      bodyMaxChars: 280,
      platform: "X",
      publicationTargetId: "target-x",
      seriesIndex: 1,
      slotId: "slot-x",
      suggestedScheduledFor: "2026-06-15",
    },
  ],
};

function proposal(
  input: Partial<OpsAiSeriesSplitProposal> & Pick<OpsAiSeriesSplitProposal, "proposalId">,
): OpsAiSeriesSplitProposal {
  const slot = context.slots.find((item) => item.slotId === input.proposalId);
  const { proposalId, ...overrides } = input;

  return {
    accountName: slot?.accountName ?? "Unknown",
    body: "Metadata-only product update for manual review.",
    mediaNote: "No media.",
    platform: slot?.platform ?? "LinkedIn",
    proposalId,
    publicationTargetId: slot?.publicationTargetId ?? "unknown",
    safetyNotes: ["Review before posting."],
    seriesIndex: slot?.seriesIndex ?? 1,
    suggestedScheduledFor: slot?.suggestedScheduledFor ?? "2026-06-15",
    title: "Test proposal",
    ...overrides,
  };
}

function assertPass(label: string, proposals: OpsAiSeriesSplitProposal[]) {
  const issues = validateSeriesSplitOutput({ context, proposals });

  if (issues.length > 0) {
    throw new Error(`${label} should have passed:\n${issues.join("\n")}`);
  }
}

function assertFail(
  label: string,
  proposals: OpsAiSeriesSplitProposal[],
  expectedText: string,
) {
  const issues = validateSeriesSplitOutput({ context, proposals });

  if (!issues.some((issue) => issue.includes(expectedText))) {
    throw new Error(
      `${label} should have failed with "${expectedText}". Issues:\n${issues.join("\n")}`,
    );
  }
}

assertPass("valid selected-slot proposals", [
  proposal({ proposalId: "slot-linkedin" }),
  proposal({ body: "Short X post.", proposalId: "slot-x" }),
]);

assertFail(
  "X over 280 characters",
  [
    proposal({ proposalId: "slot-linkedin" }),
    proposal({ body: "x".repeat(281), proposalId: "slot-x" }),
  ],
  "max is 280",
);

assertFail(
  "wrong platform",
  [
    proposal({ proposalId: "slot-linkedin" }),
    proposal({ platform: "LinkedIn", proposalId: "slot-x" }),
  ],
  "platform must remain X",
);

assertFail(
  "wrong target",
  [
    proposal({ proposalId: "slot-linkedin" }),
    proposal({ proposalId: "slot-x", publicationTargetId: "target-linkedin" }),
  ],
  "publicationTargetId does not match",
);

assertFail(
  "empty sanitized body",
  [
    proposal({ proposalId: "slot-linkedin" }),
    proposal({ body: "   ", proposalId: "slot-x" }),
  ],
  "draft body cannot be empty",
);

assertFail(
  "missing selected slot",
  [proposal({ proposalId: "slot-linkedin" })],
  "missing proposal for selected slot",
);

console.log("AI series output validation checks passed.");
