import type { PublicationPlatform } from "@/lib/ops/types";

export type OpsAutopublishPlatform = Extract<
  PublicationPlatform,
  "Facebook" | "Instagram" | "LinkedIn" | "X"
>;

export const OPS_AUTOPUBLISH_PLATFORMS: OpsAutopublishPlatform[] = [
  "LinkedIn",
  "X",
  "Facebook",
  "Instagram",
];

export function platformSupportsAutopublish(
  platform: PublicationPlatform,
): platform is OpsAutopublishPlatform {
  return OPS_AUTOPUBLISH_PLATFORMS.includes(platform as OpsAutopublishPlatform);
}
