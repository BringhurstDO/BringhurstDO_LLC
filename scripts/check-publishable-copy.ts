import {
  draftTemplateBody,
} from "../lib/ops/draft-template";
import {
  buildPostPacket,
  buildPublishableCopy,
} from "../lib/ops/post-packet";
import {
  containsPublishableArtifact,
  sanitizePublishableBody,
} from "../lib/ops/publishable-copy";
import { containsLinkedInPublishUrl } from "../lib/ops/linkedin-publish-rules";
import type {
  OpsContentPackageRecord,
  PublicationTarget,
} from "../lib/ops/types";

const sampleTargets: PublicationTarget[] = [
  {
    accountId: "account-bringhurstdo-linkedin",
    accountName: "BringhurstDO LinkedIn",
    accountStatus: "active",
    audience: "investors",
    defaultDestinationUrl: "https://www.bringhurstdo.com/",
    id: "target-bringhurstdo-linkedin-investors",
    platform: "LinkedIn",
    approvalRequired: true,
    postingMode: "manual-only",
    projectId: "bringhurstdo",
    publicHandle: "BringhurstDO",
    sourceBoundary: "Metadata-only manual target.",
    spendMode: "manual-approval-required",
  },
  {
    accountId: "account-bringhurstdo-instagram",
    accountName: "BringhurstDO Instagram",
    accountStatus: "active",
    audience: "general",
    defaultDestinationUrl: "https://www.bringhurstdo.com/",
    id: "target-bringhurstdo-instagram-general",
    platform: "Instagram",
    approvalRequired: true,
    postingMode: "manual-only",
    projectId: "bringhurstdo",
    publicHandle: "BringhurstDO",
    sourceBoundary: "Metadata-only manual target.",
    spendMode: "manual-approval-required",
  },
  {
    accountId: "account-bringhurstdo-facebook",
    accountName: "BringhurstDO Facebook",
    accountStatus: "active",
    audience: "general",
    defaultDestinationUrl: "https://www.bringhurstdo.com/",
    id: "target-bringhurstdo-facebook-general",
    platform: "Facebook",
    approvalRequired: true,
    postingMode: "manual-only",
    projectId: "bringhurstdo",
    publicHandle: "BringhurstDO",
    sourceBoundary: "Metadata-only manual target.",
    spendMode: "manual-approval-required",
  },
  {
    accountId: "account-bringhurstdo-x",
    accountName: "BringhurstDO X",
    accountStatus: "active",
    audience: "general",
    defaultDestinationUrl: "https://www.bringhurstdo.com/",
    id: "target-bringhurstdo-x-general",
    platform: "X",
    approvalRequired: true,
    postingMode: "manual-only",
    projectId: "bringhurstdo",
    publicHandle: "BringhurstDO",
    sourceBoundary: "Metadata-only manual target.",
    spendMode: "manual-approval-required",
  },
];

function buildSampleRecord(): OpsContentPackageRecord {
  const sourceUpdate = {
    approvalRequired: true,
    createdAt: "2026-06-14T00:00:00.000Z",
    id: "source-update-sample",
    notes: [],
    projectId: "bringhurstdo" as const,
    sourceBoundary: "Metadata-only business/product update.",
    sourceDate: "2026-06-14",
    sourceProjectId: "bringhurstdo" as const,
    summary: "BringhurstDO Ops now supports allowlisted AI draft improvement with manual review.",
    title: "Ops AI Draft Improvement",
    updateType: "product-update" as const,
  };
  const contentPackage = {
    approvalRequired: true,
    createdAt: "2026-06-14T00:00:00.000Z",
    id: "content-package-sample",
    notes: ["Internal: ops content package record."],
    projectIds: ["bringhurstdo" as const],
    publicationTargetIds: sampleTargets.map((target) => target.id),
    publishingProjectIds: ["bringhurstdo" as const],
    sourceProjectIds: ["bringhurstdo" as const],
    sourceUpdateId: sourceUpdate.id,
    status: "needs review" as const,
    title: sourceUpdate.title,
    updatedAt: "2026-06-14T00:00:00.000Z",
  };
  const platformDrafts = sampleTargets.map((target, index) => {
    const generatedUrl = `https://www.bringhurstdo.com/?utm_source=${target.platform.toLowerCase()}&utm_medium=organic&utm_campaign=sample_${index + 1}`;

    return {
      accountName: target.accountName,
      aiReviewNotes: ["Internal: confirm no unsupported claims before posting."],
      approvalRequired: true,
      body: draftTemplateBody({
        destinationUrl: generatedUrl,
        sourceSummary: sourceUpdate.summary,
        sourceTitle: sourceUpdate.title,
        target,
      }),
      contentPackageId: contentPackage.id,
      generatedUrl,
      id: `platform-draft-sample-${index + 1}`,
      media: {
        creativeAngle: "build-in-public" as const,
        mediaSummary: "No media planned.",
        mediaType: "none" as const,
        productionEffort: "low" as const,
        reuseStatus: "new" as const,
        visualHook: "Text-only post.",
      },
      operatorNotes: ["Internal: confirm metadata-only boundary before posting."],
      platform: target.platform,
      projectId: "bringhurstdo" as const,
      publicationTargetId: target.id,
      publishingProjectId: "bringhurstdo" as const,
      safetyNotes: ["No PHI, private identifiers, credentials, or raw logs in public copy."],
      sourceProjectId: "bringhurstdo" as const,
      sourceUpdateId: sourceUpdate.id,
      status: "needs review" as const,
      title: sourceUpdate.title,
      updatedAt: "2026-06-14T00:00:00.000Z",
      utmCampaignId: `utm-sample-${index + 1}`,
    };
  });

  return {
    businessOutcome: {
      capturedAt: "2026-06-14",
      contentPackageId: contentPackage.id,
      conversations: "0",
      id: "outcome-sample",
      leads: "0",
      notes: ["Aggregate outcomes only"],
      numericOutcomes: { conversations: 0, leads: 0, revenue: 0 },
      revenue: "$0",
      source: "manual",
    },
    contentPackage,
    performanceSnapshots: [],
    platformDrafts,
    publishedPosts: [],
    sourceUpdate,
  };
}

function assertNoPublishableArtifacts(label: string, body: string) {
  if (containsPublishableArtifact(body)) {
    throw new Error(`${label} still contains internal publishable artifacts:\n${body}`);
  }

  if (/\b(?:https?:\/\/|www\.)\S+/i.test(body)) {
    throw new Error(`${label} still contains a public URL:\n${body}`);
  }
}

const record = buildSampleRecord();

for (const draft of record.platformDrafts) {
  assertNoPublishableArtifacts(`${draft.platform} deterministic body`, draft.body);
  assertNoPublishableArtifacts(
    `${draft.platform} sanitized body`,
    sanitizePublishableBody(draft.body),
  );
}

const publishable = buildPublishableCopy(record);
for (const draft of record.platformDrafts) {
  const section = publishable.includes(draft.body);
  if (!section) {
    throw new Error(`Publishable copy missing ${draft.platform} body.`);
  }
}

const packet = buildPostPacket(record);
if (!packet.includes("Internal - do not post")) {
  throw new Error("Operator packet missing internal section.");
}
if (!packet.includes("Operator / safety notes:")) {
  throw new Error("Operator packet missing internal operator notes.");
}
if (packet.includes("Manual approval required before posting")) {
  throw new Error("Operator packet leaked manual approval phrase into publishable section.");
}

if (!containsLinkedInPublishUrl("Read more at https://www.bringhurstdo.com")) {
  throw new Error("LinkedIn publish URL detector missed an https URL.");
}

if (!containsLinkedInPublishUrl("Read more at www.bringhurstdo.com")) {
  throw new Error("LinkedIn publish URL detector missed a www URL.");
}

if (containsLinkedInPublishUrl("Clean text-only LinkedIn post.")) {
  throw new Error("LinkedIn publish URL detector blocked clean text.");
}

console.log("Publishable copy checks passed.");
