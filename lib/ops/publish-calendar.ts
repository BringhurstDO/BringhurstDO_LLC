import type {
  OpsContentPackageRecord,
  OpsProjectId,
  OpsScheduleBucketId,
  PlatformDraftStatus,
  PublicationPlatform,
  PublishedPostStatus,
} from "@/lib/ops/types";
import { formatPlatformScheduleWindow } from "@/lib/ops/platform-schedule-defaults";
import {
  draftScheduleWarnings,
  formatCalendarDateWithWeekday,
} from "@/lib/ops/schedule-date-utils";

export type PublishCalendarTiming =
  | "overdue"
  | "posted"
  | "today"
  | "unscheduled"
  | "upcoming";

export type PublishCalendarRow = {
  accountName: string;
  autopublishEnabled: boolean;
  /** Full draft body for review on the calendar. */
  body: string;
  bodyPreview: string;
  /**
   * Effective calendar date for grouping: suggestedScheduledFor, or
   * YYYY-MM-DD from postedAt when already posted.
   */
  calendarDate?: string;
  contentPackageId: string;
  draftId: string;
  draftStatus: PlatformDraftStatus;
  generatedUrl: string;
  packageTitle: string;
  platform: PublicationPlatform;
  postStatus: PublishedPostStatus;
  postedAt?: string;
  postedUrl: string;
  projectId: OpsProjectId;
  publicationTargetId: string;
  seriesIndex?: number;
  suggestedScheduleBucketId?: OpsScheduleBucketId;
  suggestedScheduledFor?: string;
  scheduleWarnings: string[];
  timing: PublishCalendarTiming;
  title: string;
};

/** Posted items older than this are hidden when Show posted is on. */
export const POSTED_CALENDAR_LOOKBACK_DAYS = 90;

export function localCalendarDate(reference = new Date()) {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function calendarDateFromPostedAt(postedAt: string | undefined) {
  if (!postedAt?.trim()) {
    return undefined;
  }

  const trimmed = postedAt.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addCalendarDays(ymd: string, days: number) {
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return ymd;
  }

  const next = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days, 12),
  );
  return next.toISOString().slice(0, 10);
}

export function postedLookbackStartDate(
  today = localCalendarDate(),
  lookbackDays = POSTED_CALENDAR_LOOKBACK_DAYS,
) {
  return addCalendarDays(today, -lookbackDays);
}

function calendarTiming(
  suggestedScheduledFor: string | undefined,
  postStatus: PublishedPostStatus,
  today: string,
): PublishCalendarTiming {
  if (postStatus === "posted") {
    return "posted";
  }

  if (!suggestedScheduledFor) {
    return "unscheduled";
  }

  if (suggestedScheduledFor === today) {
    return "today";
  }

  if (suggestedScheduledFor < today) {
    return "overdue";
  }

  return "upcoming";
}

export function buildPublishCalendarRows(
  records: OpsContentPackageRecord[],
  { today = localCalendarDate() }: { today?: string } = {},
) {
  return records.flatMap((record): PublishCalendarRow[] =>
    record.platformDrafts.map((draft) => {
      const post = record.publishedPosts.find(
        (item) => item.platformDraftId === draft.id,
      );
      const postStatus = post?.status ?? "not posted";
      const postedAt = post?.postedAt ?? post?.postedManuallyAt;
      const calendarDate =
        draft.suggestedScheduledFor ||
        (postStatus === "posted"
          ? calendarDateFromPostedAt(postedAt)
          : undefined);
      const bodyPreview =
        draft.body.length > 160 ? `${draft.body.slice(0, 160).trim()}…` : draft.body;

      return {
        accountName: draft.accountName,
        autopublishEnabled: Boolean(draft.autopublishEnabled),
        body: draft.body,
        bodyPreview,
        calendarDate,
        contentPackageId: record.contentPackage.id,
        draftId: draft.id,
        draftStatus: draft.status,
        generatedUrl: draft.generatedUrl,
        packageTitle: record.contentPackage.title,
        platform: draft.platform,
        postStatus,
        postedAt,
        postedUrl: post?.postedUrl ?? post?.postUrl ?? "",
        projectId: draft.publishingProjectId,
        publicationTargetId: draft.publicationTargetId,
        seriesIndex: draft.seriesIndex,
        suggestedScheduleBucketId: draft.suggestedScheduleBucketId,
        suggestedScheduledFor: draft.suggestedScheduledFor,
        scheduleWarnings: draftScheduleWarnings({
          autopublishEnabled: Boolean(draft.autopublishEnabled),
          postStatus,
          suggestedScheduledFor: draft.suggestedScheduledFor,
        }),
        timing: calendarTiming(draft.suggestedScheduledFor, postStatus, today),
        title: draft.title,
      };
    }),
  );
}

export type PublishCalendarDateGroup = {
  date: string;
  label: string;
  rows: PublishCalendarRow[];
};

const timingSortOrder: Record<PublishCalendarTiming, number> = {
  overdue: 0,
  today: 1,
  upcoming: 2,
  unscheduled: 3,
  posted: 4,
};

export function groupPublishCalendarRows(rows: PublishCalendarRow[]) {
  const today = localCalendarDate();
  const byDate = new Map<string, PublishCalendarRow[]>();

  for (const row of rows) {
    const key =
      row.timing === "posted"
        ? row.calendarDate ?? "posted"
        : row.timing === "unscheduled"
          ? "unscheduled"
          : (row.calendarDate ?? row.suggestedScheduledFor ?? "unscheduled");

    const bucket = byDate.get(key) ?? [];
    bucket.push(row);
    byDate.set(key, bucket);
  }

  const groups: PublishCalendarDateGroup[] = Array.from(byDate.entries()).map(
    ([date, dateRows]) => ({
      date,
      label:
        date === "unscheduled"
          ? "No suggested date"
          : date === "posted"
            ? "Posted (no schedule date)"
            : date === today
              ? `Today — ${formatCalendarDateWithWeekday(today)}`
              : formatCalendarDateWithWeekday(date),
      rows: dateRows.sort((a, b) => {
        const timingDiff = timingSortOrder[a.timing] - timingSortOrder[b.timing];

        if (timingDiff !== 0) {
          return timingDiff;
        }

        return (a.seriesIndex ?? 0) - (b.seriesIndex ?? 0);
      }),
    }),
  );

  return groups.sort((a, b) => {
    if (a.date === "unscheduled") {
      return 1;
    }

    if (b.date === "unscheduled") {
      return -1;
    }

    if (a.date === "posted") {
      return 1;
    }

    if (b.date === "posted") {
      return -1;
    }

    return a.date.localeCompare(b.date);
  });
}

export function filterPublishCalendarRows(
  rows: PublishCalendarRow[],
  {
    includePosted = false,
    platform = "all",
    postedLookbackDays = POSTED_CALENDAR_LOOKBACK_DAYS,
    timing = "all",
    today = localCalendarDate(),
  }: {
    includePosted?: boolean;
    platform?: PublicationPlatform | "all";
    postedLookbackDays?: number;
    timing?: PublishCalendarTiming | "all";
    today?: string;
  } = {},
) {
  const postedCutoff = postedLookbackStartDate(today, postedLookbackDays);

  return rows.filter((row) => {
    if (!includePosted && row.timing === "posted") {
      return false;
    }

    if (
      includePosted &&
      row.timing === "posted" &&
      row.calendarDate &&
      row.calendarDate < postedCutoff
    ) {
      return false;
    }

    if (platform !== "all" && row.platform !== platform) {
      return false;
    }

    if (timing !== "all" && row.timing !== timing) {
      return false;
    }

    return true;
  });
}

export function formatScheduledPublishLabel(
  suggestedScheduledFor: string | undefined,
  {
    autopublishEnabled = false,
    platform,
    posted = false,
    scheduleBucketId,
    runTimeLabel,
  }: {
    autopublishEnabled?: boolean;
    platform?: PublicationPlatform;
    posted?: boolean;
    scheduleBucketId?: OpsScheduleBucketId;
    runTimeLabel?: string;
  } = {},
) {
  if (posted) {
    return suggestedScheduledFor
      ? `Posted · ${suggestedScheduledFor}`
      : "Posted (no publish date)";
  }

  if (!suggestedScheduledFor) {
    return "No suggested date";
  }

  if (autopublishEnabled && runTimeLabel) {
    return `${suggestedScheduledFor} - autopublish enabled`;
  }

  if (platform) {
    return `${suggestedScheduledFor} - ${formatPlatformScheduleWindow(platform, scheduleBucketId)}`;
  }

  return `${suggestedScheduledFor} - manual post in the platform window`;
}
