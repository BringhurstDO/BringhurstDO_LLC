import "server-only";

import { resolvePublishImageUrl } from "@/lib/ops/ops-publish-media";
import type { OpsProjectId } from "@/lib/ops/types";

export function resolveMetaPublishImageUrl(input: {
  accountId?: string;
  assetLocation?: string;
  imageUrl?: string;
  platform?: "Facebook" | "Instagram";
  publishingProjectId?: OpsProjectId;
}) {
  return resolvePublishImageUrl(input);
}

export function resolveInstagramPublishImageUrl(input: {
  accountId?: string;
  assetLocation?: string;
  imageUrl?: string;
  publishingProjectId?: OpsProjectId;
}) {
  return resolvePublishImageUrl({ ...input, platform: "Instagram" });
}
