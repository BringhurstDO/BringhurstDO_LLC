import { collectAiSafetyIssues } from "../lib/ops/ai-safety";
import { resolveGeminiModel } from "../lib/ops/ai-gemini-model";

if (resolveGeminiModel("gemini-2.0-flash") !== "gemini-3.5-flash") {
  throw new Error("Retired gemini-2.0-flash must remap to gemini-3.5-flash.");
}

if (resolveGeminiModel() !== "gemini-3.5-flash") {
  throw new Error("Default Gemini model must be gemini-3.5-flash.");
}

if (resolveGeminiModel("gemini-3.1-flash-lite") !== "gemini-3.1-flash-lite") {
  throw new Error("Configured Gemini models other than 2.0 flash must pass through.");
}

const productionReviewChecklist = [
  "Confirm the source update is metadata-only and contains no PHI, credentials, private messages, raw logs, transcripts, or clinical payloads.",
  "Confirm every SyncSOAP draft stays at product, workflow, or aggregate evidence level.",
  "Confirm claims are supportable and do not promise clinical, legal, safety, financial, or compliance outcomes.",
  "Confirm the selected brand voice and audience framing match the publication target.",
  "Confirm every post has the exact generated UTM link and a public destination URL.",
  "Confirm a human manually approves the post before publishing.",
  "Confirm no ad spend, posting, database write, OAuth flow, or external API mutation is triggered.",
];

function assertNoClaimIssues(label: string, value: unknown, rootPath: string) {
  const claimIssues = collectAiSafetyIssues(value, rootPath).filter((issue) =>
    issue.message.startsWith("AI content matches"),
  );

  if (claimIssues.length > 0) {
    throw new Error(
      `${label} unexpectedly blocked:\n${claimIssues
        .map((issue) => `- ${issue.path}: ${issue.message}`)
        .join("\n")}`,
    );
  }
}

function assertClaimIssue(label: string, value: unknown, rootPath: string) {
  const claimIssues = collectAiSafetyIssues(value, rootPath).filter((issue) =>
    issue.message.startsWith("AI content matches"),
  );

  if (claimIssues.length === 0) {
    throw new Error(`${label} expected a marketing-claim block but passed.`);
  }
}

function assertMetadataIssue(label: string, value: unknown, rootPath: string) {
  const metadataIssues = collectAiSafetyIssues(value, rootPath).filter(
    (issue) => !issue.message.startsWith("AI content matches"),
  );

  if (metadataIssues.length === 0) {
    throw new Error(`${label} expected a metadata-only block but passed.`);
  }
}

assertNoClaimIssues(
  "production reviewChecklist guardrails",
  { reviewChecklist: productionReviewChecklist },
  "aiVisibleContext",
);

assertNoClaimIssues(
  "brand prohibitedClaims guardrails",
  {
    brandRules: [
      {
        prohibitedClaims: [
          "Do not imply automatic regulatory filing or legal compliance guarantees",
          "No diagnostic, treatment, or billing guarantees",
        ],
      },
    ],
  },
  "aiVisibleContext",
);

assertNoClaimIssues(
  "audience safetyNotes guardrails",
  {
    audienceRules: [
      {
        safetyNotes: ["No legal, safety, or compliance outcome guarantees"],
      },
    ],
  },
  "aiVisibleContext",
);

assertClaimIssue(
  "marketing draft with guaranteed compliance claim",
  {
    platformDrafts: [
      {
        body: "SyncSOAP guarantees HIPAA compliance for every clinic.",
        title: "Compliance update",
      },
    ],
  },
  "aiVisibleContext",
);

assertClaimIssue(
  "AI proposal with guaranteed compliance claim",
  {
    body: "Our platform guarantees compliance with HIPAA and SOC 2.",
    title: "Product update",
  },
  "aiProposals",
);

assertMetadataIssue(
  "PHI-like value still blocked in reviewChecklist",
  {
    reviewChecklist: ["patientName: Example Patient"],
  },
  "aiVisibleContext",
);

console.log("AI safety checks passed.");
