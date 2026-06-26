import type { PublicationPlatform, SourceUpdateType } from "@/lib/ops/types";

const UPDATE_TYPES_PREFER_MEDIA = new Set<SourceUpdateType>([
  "customer-learning",
  "launch-note",
  "product-update",
]);

export function platformSupportsSocialImage(platform: PublicationPlatform) {
  return (
    platform === "Facebook" ||
    platform === "Instagram" ||
    platform === "LinkedIn" ||
    platform === "X"
  );
}

export function shouldAutoAttachCatalogImage(
  updateType: SourceUpdateType | undefined,
  catalogMatch: boolean,
) {
  if (catalogMatch) {
    return true;
  }

  return updateType ? UPDATE_TYPES_PREFER_MEDIA.has(updateType) : false;
}
