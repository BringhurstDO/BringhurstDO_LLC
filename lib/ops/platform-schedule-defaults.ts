import type { OpsScheduleBucketId, PublicationPlatform } from "@/lib/ops/types";

export type OpsScheduleBucket = {
  endLocalTime: string;
  id: OpsScheduleBucketId;
  label: string;
  localTime: string;
  toleranceMinutes: number;
};

export type PlatformScheduleDefault = {
  bucketId: OpsScheduleBucketId;
  label: string;
  note: string;
  platform: PublicationPlatform;
};

export const DEFAULT_OPS_SCHEDULE_TIMEZONE = "America/New_York";

export const OPS_SCHEDULE_BUCKETS: OpsScheduleBucket[] = [
  {
    endLocalTime: "10:30",
    id: "morning",
    label: "Morning",
    localTime: "09:00",
    toleranceMinutes: 45,
  },
  {
    endLocalTime: "13:30",
    id: "midday",
    label: "Midday",
    localTime: "12:00",
    toleranceMinutes: 45,
  },
  {
    endLocalTime: "16:30",
    id: "afternoon",
    label: "Afternoon",
    localTime: "15:00",
    toleranceMinutes: 45,
  },
  {
    endLocalTime: "19:30",
    id: "evening",
    label: "Evening",
    localTime: "18:00",
    toleranceMinutes: 45,
  },
  {
    endLocalTime: "22:00",
    id: "late-evening",
    label: "Late evening",
    localTime: "21:00",
    toleranceMinutes: 45,
  },
];

export const PLATFORM_SCHEDULE_DEFAULTS: PlatformScheduleDefault[] = [
  {
    bucketId: "morning",
    label: "Morning",
    note: "Default planning window for professional/founder updates.",
    platform: "LinkedIn",
  },
  {
    bucketId: "midday",
    label: "Midday flexible",
    note: "Default flexible window for concise text updates; publish manually within the window and avoid bursts.",
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
  const endLocalTime = bucket?.endLocalTime ?? localTime;

  return `${platform}: ${defaultWindow.label} (${localTime}-${endLocalTime} ${DEFAULT_OPS_SCHEDULE_TIMEZONE})`;
}

export function platformScheduleBucketId(platform: PublicationPlatform) {
  return platformScheduleDefault(platform).bucketId;
}

export function formatPlatformScheduleWindow(
  platform: PublicationPlatform,
  bucketId?: OpsScheduleBucketId,
) {
  const defaultWindow = platformScheduleDefault(platform);
  const bucket = scheduleBucketById(bucketId ?? defaultWindow.bucketId);

  if (!bucket) {
    return `${platform} flexible window: manual post any time on the scheduled day.`;
  }

  return `${platform} suggested window: ${bucket.localTime}-${bucket.endLocalTime} ${DEFAULT_OPS_SCHEDULE_TIMEZONE} (${defaultWindow.note})`;
}

export function scheduleBucketIsDueNow({
  bucketId,
  reference = new Date(),
  timeZone = DEFAULT_OPS_SCHEDULE_TIMEZONE,
}: {
  bucketId: OpsScheduleBucketId;
  reference?: Date;
  timeZone?: string;
}) {
  const bucket = scheduleBucketById(bucketId);

  if (!bucket) {
    return false;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone,
    weekday: "short",
  }).formatToParts(reference);
  const partValue = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const localHour = Number(partValue("hour"));
  const targetHour = Number(bucket.localTime.slice(0, 2));
  const weekday = partValue("weekday");

  return weekday !== "Sun" && localHour === targetHour;
}
