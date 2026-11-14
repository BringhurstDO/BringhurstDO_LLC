import assert from "node:assert/strict";
import sharp from "sharp";

import { mapImprovedDraftProposals } from "../lib/ops/ai-improve-map";
import type { OpsAiSeriesSplitContext } from "../lib/ops/ai-series-context";
import { mapSeriesSplitProposals } from "../lib/ops/ai-series-map-proposals";
import type { OpsAiVisibleContext } from "../lib/ops/ai-visible-context";
import { parseAiPayload } from "../lib/ops/ai-prompt";
import { draftTemplateBody } from "../lib/ops/draft-template";
import { sanitizePublishableBody } from "../lib/ops/publishable-copy";
import {
  buildFacebookTextPayload,
  buildInstagramCaptionPayload,
  buildLinkedInCommentaryPayload,
  buildXTextPayload,
} from "../lib/ops/social-publish-payload";
import { preserveSourceHashtags } from "../lib/ops/social-hashtags";
import {
  appendRequiredSocialMetadata,
  instagramPublishingTags,
} from "../lib/ops/social-metadata";
import { renderSocialImageOverlay } from "../lib/ops/social-image-overlay";
import type {
  OpsOverlayFormat,
  OpsOverlayPreset,
  OpsSocialMention,
  PublicationTarget,
} from "../lib/ops/types";

const platforms = ["LinkedIn", "X", "Instagram", "Facebook"] as const;
const sourceSummary =
  "We presented SyncSOAP research at AMIA. #AMIA2026 #SyncSOAP #HealthcareAI";
const mentions: OpsSocialMention[] = [
  {
    approved: true,
    entityType: "organization",
    id: "mention-amia-linkedin",
    label: "AMIA",
    platform: "LinkedIn",
    platformId: "urn:li:organization:12345",
  },
  {
    approved: true,
    entityType: "organization",
    handle: "AMIAInformatics",
    id: "mention-amia-instagram",
    label: "AMIA",
    platform: "Instagram",
    instagramPlacement: "media-tag",
  },
  {
    approved: true,
    entityType: "organization",
    handle: "SyncSOAP",
    id: "mention-syncsoap-collaborator",
    instagramPlacement: "collaborator",
    label: "SyncSOAP",
    platform: "Instagram",
  },
  {
    approved: true,
    entityType: "organization",
    handle: "AMIAInformatics",
    id: "mention-amia-x",
    label: "AMIA",
    platform: "X",
  },
  {
    approved: true,
    entityType: "organization",
    handle: "AMIAInformatics",
    id: "mention-amia-facebook",
    label: "AMIA",
    platform: "Facebook",
  },
];
const rejectedLinkedInInjection: OpsSocialMention = {
  approved: true,
  entityType: "organization",
  id: "mention-invalid-linkedin",
  label: "AMIA](urn:li:organization:attacker)",
  platform: "LinkedIn",
  platformId: "not-a-linkedin-urn",
};

for (const platform of platforms) {
  const target: PublicationTarget = {
    accountId: `account-test-${platform.toLowerCase()}`,
    accountName: `Test ${platform}`,
    accountStatus: "active",
    approvalRequired: true,
    audience: "general",
    defaultDestinationUrl: "https://www.bringhurstdo.com/syncsoap",
    id: `target-${platform.toLowerCase()}`,
    platform,
    postingMode: "manual-only",
    projectId: "syncsoap",
    publicHandle: "SyncSOAP",
    sourceBoundary: "Public-safe test target.",
    spendMode: "manual-approval-required",
  };
  const deterministicBody = draftTemplateBody({
    destinationUrl: target.defaultDestinationUrl,
    sourceSummary,
    sourceTitle: "AMIA research update",
    target,
  });

  assert.match(deterministicBody, /#AMIA2026/);
  assert.match(deterministicBody, /#SyncSOAP/);
  if (platform === "X") assert.ok(deterministicBody.length <= 280);
}

const context: OpsAiVisibleContext = {
  audienceRules: [],
  brandRules: [],
  contentPackageId: "content-package-hashtag-test",
  excludedData: "No private data.",
  manualReviewRequired: true,
  platformDrafts: platforms.map((platform) => ({
    accountName: `Test ${platform}`,
    body: sourceSummary,
    generatedUrl: "https://www.bringhurstdo.com/syncsoap",
    id: `draft-${platform.toLowerCase()}`,
    media: {
      creativeAngle: "research-update",
      mediaSummary: "Conference photo.",
      mediaType: "screenshot",
      productionEffort: "low",
      reuseStatus: "new",
      visualHook: "Research poster.",
    },
    platform,
    title: "AMIA research update",
  })),
  publicationTargets: [],
  reviewChecklist: ["Review before publishing."],
  sourceUpdate: {
    sourceBoundary: "Public-safe research update.",
    sourceDate: "2026-11-13",
    sourceProjectId: "syncsoap",
    summary: sourceSummary,
    title: "AMIA research update",
    updateType: "product-update",
  },
};

// Simulate the raw structured Gemini response that triggered the defect:
// platform bodies are valid but Gemini omitted every source hashtag.
const rawGeminiResponse = JSON.stringify({
  drafts: platforms.map((platform) => ({
    accountName: `Test ${platform}`,
    body: "We shared new SyncSOAP research on AI-assisted clinical documentation at AMIA.",
    mediaNote: "Use the conference photo.",
    platform,
    platformDraftId: `draft-${platform.toLowerCase()}`,
    safetyNotes: ["Avoid unsupported clinical claims."],
    title: "AMIA research update",
  })),
});

const parsed = parseAiPayload(rawGeminiResponse);
const proposals = mapImprovedDraftProposals(context, parsed);
assert.equal(proposals.length, 4);

const byPlatform = new Map(proposals.map((proposal) => [proposal.platform, proposal]));

for (const platform of platforms) {
  const proposal = byPlatform.get(platform);
  assert.ok(proposal, `Missing ${platform} proposal`);
  const preview = sanitizePublishableBody(proposal.body);

  assert.match(preview, /#AMIA2026/);
  assert.match(preview, /#SyncSOAP/);
  assert.equal((preview.match(/#AMIA2026/g) ?? []).length, 1);
  assert.equal((preview.match(/#SyncSOAP/g) ?? []).length, 1);

  if (platform === "X") {
    assert.ok(Array.from(preview).length <= 280);
    assert.doesNotMatch(preview, /#HealthcareAI/);
  } else {
    assert.match(preview, /#HealthcareAI/);
  }
}

const linkedInPayload = buildLinkedInCommentaryPayload(
  byPlatform.get("LinkedIn")!.body,
  mentions,
);
const xPayload = buildXTextPayload(byPlatform.get("X")!.body, undefined, mentions);
const instagramPayload = buildInstagramCaptionPayload(
  byPlatform.get("Instagram")!.body,
  mentions,
);
const facebookPayload = buildFacebookTextPayload(
  byPlatform.get("Facebook")!.body,
  "feed",
);
const facebookPhotoPayload = buildFacebookTextPayload(
  byPlatform.get("Facebook")!.body,
  "photo",
);
const facebookVideoPayload = buildFacebookTextPayload(
  byPlatform.get("Facebook")!.body,
  "video",
);

assert.match(linkedInPayload.commentary, /#AMIA2026/);
assert.match(linkedInPayload.commentary, /#SyncSOAP/);
assert.match(linkedInPayload.commentary, /@\[AMIA\]\(urn:li:organization:12345\)/);
assert.equal(
  buildLinkedInCommentaryPayload("Research | documentation #SyncSOAP").commentary,
  "Research \\| documentation #SyncSOAP",
);
assert.doesNotMatch(
  buildLinkedInCommentaryPayload("Research update.", [rejectedLinkedInInjection]).commentary,
  /attacker/,
);
assert.match(xPayload.text, /#AMIA2026/);
assert.match(xPayload.text, /#SyncSOAP/);
assert.match(xPayload.text, /@AMIAInformatics/);
assert.match(instagramPayload.caption, /#AMIA2026/);
assert.match(instagramPayload.caption, /#SyncSOAP/);
assert.match(instagramPayload.caption, /#HealthcareAI/);
assert.match(instagramPayload.caption, /@AMIAInformatics/);
const instagramTags = instagramPublishingTags(mentions);
assert.deepEqual(instagramTags.collaborators, ["SyncSOAP"]);
assert.equal(instagramTags.userTags[0]?.username, "AMIAInformatics");
assert.match(facebookPayload.message, /#AMIA2026/);
assert.match(facebookPayload.message, /#SyncSOAP/);
assert.match(facebookPayload.message, /#HealthcareAI/);
assert.match(facebookPhotoPayload.caption, /#AMIA2026/);
assert.match(facebookPhotoPayload.caption, /#SyncSOAP/);
assert.match(facebookVideoPayload.description, /#AMIA2026/);
assert.match(facebookVideoPayload.description, /#SyncSOAP/);

const cleanedDuplicateTags = preserveSourceHashtags({
  body: "Conference update. #AMIA2026 #AMIA2026 #UnrelatedTag",
  platform: "LinkedIn",
  sourceText: sourceSummary,
});
assert.equal((cleanedDuplicateTags.match(/#AMIA2026/g) ?? []).length, 1);
assert.doesNotMatch(cleanedDuplicateTags, /#UnrelatedTag/);

const seriesContext: OpsAiSeriesSplitContext = {
  audienceRules: [],
  brandRules: [],
  excludedData: "No private data.",
  manualReviewRequired: true,
  reviewChecklist: ["Review before publishing."],
  series: {
    id: "series-hashtag-test",
    postsPerWeek: 1,
    requiredHashtags: ["#AMIA2026", "#SyncSOAP", "#HealthcareAI"],
    socialMentions: mentions,
    sourceProjectId: "syncsoap",
    startDate: "2026-11-13",
    summary: sourceSummary,
    title: "AMIA research update",
    updateType: "product-update",
    weekCount: 1,
  },
  slots: platforms.map((platform) => ({
    accountName: `Test ${platform}`,
    bodyMaxChars:
      platform === "X"
        ? 280
        : platform === "Instagram"
          ? 2200
          : platform === "Facebook"
            ? 63206
            : 1300,
    platform,
    publicationTargetId: `target-${platform.toLowerCase()}`,
    seriesIndex: 1,
    slotId: `slot-${platform.toLowerCase()}`,
    suggestedScheduledFor: "2026-11-13",
  })),
};
const seriesProposals = mapSeriesSplitProposals(
  seriesContext,
  seriesContext.slots.map((slot) => ({
    body: "A platform-specific AMIA research update without model-supplied tags.",
    slotId: slot.slotId,
    title: "AMIA research update",
  })),
);

for (const proposal of seriesProposals) {
  assert.match(proposal.body, /#AMIA2026/);
  assert.match(proposal.body, /#SyncSOAP/);
  assert.match(proposal.body, /#HealthcareAI/);
  if (proposal.platform === "LinkedIn") {
    assert.match(proposal.body, /@\[AMIA\]\(urn:li:organization:12345\)/);
  } else {
    assert.match(proposal.body, /@AMIAInformatics/);
  }
  assert.ok(proposal.body.length <= seriesContext.slots.find(
    (slot) => slot.slotId === proposal.proposalId,
  )!.bodyMaxChars);
}

for (const platform of platforms) {
  const finalPayload = appendRequiredSocialMetadata({
    body: "Conference research update.",
    hashtags: ["#AMIA2026", "#SyncSOAP", "#HealthcareAI"],
    mentions,
    platform,
  });
  assert.match(finalPayload, /#AMIA2026/);
  assert.match(finalPayload, /#SyncSOAP/);
  assert.match(finalPayload, /#HealthcareAI/);
  if (platform === "X") assert.ok(finalPayload.length <= 280);
}

async function checkOverlayRendering() {
  const overlaySource = await sharp({
    create: {
      background: "#dbeafe",
      channels: 3,
      height: 600,
      width: 900,
    },
  }).jpeg().toBuffer();
  const cases: Array<{
    format: OpsOverlayFormat;
    height: number;
    preset: OpsOverlayPreset;
    width: number;
  }> = [
    { format: "square", height: 1080, preset: "editorial", width: 1080 },
    { format: "portrait", height: 1350, preset: "minimal", width: 1080 },
    { format: "landscape", height: 630, preset: "centered", width: 1200 },
    { format: "square", height: 1080, preset: "quote", width: 1080 },
    { format: "portrait", height: 1350, preset: "event", width: 1080 },
  ];

  for (const testCase of cases) {
    const overlay = await renderSocialImageOverlay({
      bytes: new Uint8Array(overlaySource),
      crop: "top",
      format: testCase.format,
      headline: "Research That Moves Clinical Documentation Forward",
      preset: testCase.preset,
      projectId: "syncsoap",
      textScale: "large",
    });
    const overlayMetadata = await sharp(overlay).metadata();
    assert.equal(overlayMetadata.width, testCase.width);
    assert.equal(overlayMetadata.height, testCase.height);
  }
}

checkOverlayRendering()
  .then(() => {
    console.log("Social metadata and overlay checks passed for all four platforms.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
