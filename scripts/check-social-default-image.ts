import { describeDefaultAssetResolution } from "../lib/ops/social-default-image";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const catalogEntries = [
  {
    assetLocation: "/ops-ig/syncsoap-product-cover-square.png",
    id: "syncsoap-product-screenshot-ig-square",
    label: "SyncSOAP product — IG square",
    projectId: "syncsoap" as const,
    tags: ["product", "instagram"],
  },
  {
    assetLocation: "/ops-ig/syncsoap-progress-ig-01-cover.png",
    id: "syncsoap-progress-ig-01-cover",
    label: "SyncSOAP progress carousel — cover",
    projectId: "syncsoap" as const,
    tags: ["progress", "instagram"],
  },
  {
    assetLocation: "/bringhurstdo-social-header.png",
    id: "bringhurstdo-social-header",
    label: "BringhurstDO social header",
    projectId: "bringhurstdo" as const,
    tags: ["brand"],
  },
];

const founderSyncSoapPost = describeDefaultAssetResolution({
  body: "SyncSOAP development progress: study workflow, vision policy, and demo deployment verified.",
  catalogEntries,
  platform: "LinkedIn",
  publishingProjectId: "bringhurstdo",
  sourceProjectId: "syncsoap",
  title: "SyncSOAP development progress summary",
});

assert(
  founderSyncSoapPost.resolvedAssetLocation?.includes("syncsoap"),
  `Expected SyncSOAP art for founder LinkedIn + SyncSOAP source, got ${founderSyncSoapPost.resolvedAssetLocation}`,
);

const inferredOnly = describeDefaultAssetResolution({
  body: "We expanded the SyncSOAP scribe workflow and improved SOAP generation.",
  catalogEntries,
  platform: "LinkedIn",
  publishingProjectId: "bringhurstdo",
  title: "Weekly product update",
});

assert(
  inferredOnly.inferredProjectId === "syncsoap",
  "Expected SyncSOAP to be inferred from body copy.",
);

assert(
  inferredOnly.resolvedAssetLocation?.includes("syncsoap"),
  `Expected inferred SyncSOAP default, got ${inferredOnly.resolvedAssetLocation}`,
);

const explicitBringhurst = describeDefaultAssetResolution({
  assetLocation: "/bringhurstdo-social-header.png",
  body: "SyncSOAP study workflow update",
  catalogEntries,
  platform: "LinkedIn",
  publishingProjectId: "bringhurstdo",
  sourceProjectId: "syncsoap",
  title: "SyncSOAP update",
});

assert(
  explicitBringhurst.resolvedAssetLocation === "/bringhurstdo-social-header.png",
  "Explicit draft image should win over content defaults.",
);

console.log("social-default-image checks passed");
