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
  contentPackageId: string;
  draftId: string;
  draftStatus: PlatformDraftStatus;
  generatedUrl: string;
  packageTitle: string;
  platform: PublicationPlatform;
  postStatus: PublishedPostStatus;
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

export function localCalendarDate(reference = new Date()) {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
      const bodyPreview =
        draft.body.length > 160 ? `${draft.body.slice(0, 160).trim()}…` : draft.body;

      return {
        accountName: draft.accountName,
        autopublishEnabled: Boolean(draft.autopublishEnabled),
        body: draft.body,
        bodyPreview,
        contentPackageId: record.contentPackage.id,
        draftId: draft.id,
        draftStatus: draft.status,
        generatedUrl: draft.generatedUrl,
        packageTitle: record.contentPackage.title,
        platform: draft.platform,
        postStatus,
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
        ? row.suggestedScheduledFor ?? "posted"
        : row.timing === "unscheduled"
          ? "unscheduled"
          : (row.suggestedScheduledFor ?? "unscheduled");

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
    timing = "all",
  }: {
    includePosted?: boolean;
    platform?: PublicationPlatform | "all";
    timing?: PublishCalendarTiming | "all";
  },
) {
  return rows.filter((row) => {
    if (!includePosted && row.timing === "posted") {
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
    scheduleBucketId,
    runTimeLabel,
  }: {
    autopublishEnabled?: boolean;
    platform?: PublicationPlatform;
    scheduleBucketId?: OpsScheduleBucketId;
    runTimeLabel?: string;
  } = {},
) {
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
