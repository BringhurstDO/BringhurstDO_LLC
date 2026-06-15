import type { PublicationPlatform } from "@/lib/ops/types";

export type OpsScheduleBucketId =
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "late-evening";

export type OpsScheduleBucket = {
  id: OpsScheduleBucketId;
  label: string;
  localTime: string;
};

export type PlatformScheduleDefault = {
  bucketId: OpsScheduleBucketId;
  label: string;
  note: string;
  platform: PublicationPlatform;
};

export const DEFAULT_OPS_SCHEDULE_TIMEZONE = "America/New_York";

export const OPS_SCHEDULE_BUCKETS: OpsScheduleBucket[] = [
  { id: "morning", label: "Morning", localTime: "09:00" },
  { id: "midday", label: "Midday", localTime: "12:00" },
  { id: "afternoon", label: "Afternoon", localTime: "15:00" },
  { id: "evening", label: "Evening", localTime: "18:00" },
  { id: "late-evening", label: "Late evening", localTime: "21:00" },
];

export const PLATFORM_SCHEDULE_DEFAULTS: PlatformScheduleDefault[] = [
  {
    bucketId: "morning",
    label: "Morning",
    note: "Default planning window for professional/founder updates.",
    platform: "LinkedIn",
  },
  {
    bucketId: "morning",
    label: "Morning",
    note: "Default planning window for concise text updates.",
    platform: "X",
  },
  {
    bucketId: "evening",
    label: "Evening",
    note: "Default planning window for visual/social browsing behavior.",
    platform: "Instagram",
  },
  {
    bucketId: "evening",
    label: "Evening",
    note: "Default planning window for manual page posts.",
    platform: "Facebook",
  },
  {
    bucketId: "morning",
    label: "Morning",
    note: "Default planning window for long-form publication.",
    platform: "Blog",
  },
  {
    bucketId: "morning",
    label: "Morning",
    note: "Default planning window for operator email drafts.",
    platform: "Email",
  },
];

export function scheduleBucketById(bucketId: OpsScheduleBucketId) {
  return OPS_SCHEDULE_BUCKETS.find((bucket) => bucket.id === bucketId);
}

export function platformScheduleDefault(platform: PublicationPlatform) {
  return (
    PLATFORM_SCHEDULE_DEFAULTS.find((item) => item.platform === platform) ??
    PLATFORM_SCHEDULE_DEFAULTS[0]
  );
}

export function formatPlatformScheduleDefault(platform: PublicationPlatform) {
  const defaultWindow = platformScheduleDefault(platform);
  const bucket = scheduleBucketById(defaultWindow.bucketId);
  const localTime = bucket?.localTime ?? "09:00";

  return `${platform}: ${defaultWindow.label} (${localTime} ${DEFAULT_OPS_SCHEDULE_TIMEZONE})`;
}
