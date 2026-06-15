import type { OpsContentPackageRecord } from "@/lib/ops/types";

import { buildSeriesSchedule } from "@/lib/ops/series-schedule";
import { localCalendarDate } from "@/lib/ops/publish-calendar";

export type RebalanceScheduleOptions = {
  maxWeeks?: number;
  postsPerWeek?: number;
  recentSourceDays?: number;
  today?: string;
};

type PendingDraftRef = {
  contentPackageId: string;
  draftId: string;
  isRecentPackage: boolean;
  packageCreatedAt: string;
  publicationTargetId: string;
  seriesIndex: number;
  sourceDate: string;
};

function subtractCalendarDays(dateStr: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());

  if (!match) {
    return dateStr;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - days);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function buildEnoughScheduleDates(
  seriesStartDate: string,
  postsPerWeek: number,
  minSlots: number,
  maxWeeks: number,
) {
  let weekCount = Math.max(1, maxWeeks);
  let dates = buildSeriesSchedule({
    postsPerWeek,
    seriesStartDate,
    weekCount,
  });

  while (dates.length < minSlots && weekCount < 52) {
    weekCount += 1;
    dates = buildSeriesSchedule({
      postsPerWeek,
      seriesStartDate,
      weekCount,
    });
  }

  return dates.slice(0, minSlots);
}

function draftIsPending(record: OpsContentPackageRecord, draftId: string) {
  const draft = record.platformDrafts.find((item) => item.id === draftId);

  if (!draft || draft.status === "posted" || draft.status === "archived") {
    return false;
  }

  const post = record.publishedPosts.find(
    (item) => item.platformDraftId === draftId,
  );

  return post?.status !== "posted";
}

function assignDraftsToSchedule(input: {
  packageOrder: string[];
  packageQueues: Map<string, PendingDraftRef[]>;
  postsPerWeek: number;
  recentSourceDays: number;
  seriesStartDate: string;
  today: string;
}) {
  const totalPending = Array.from(input.packageQueues.values()).reduce(
    (sum, queue) => sum + queue.length,
    0,
  );

  if (totalPending === 0) {
    return new Map<string, string>();
  }

  const maxWeeks = Math.min(
    52,
    Math.max(8, Math.ceil(totalPending / input.postsPerWeek) + 2),
  );
  const allDates = buildEnoughScheduleDates(
    input.seriesStartDate,
    input.postsPerWeek,
    totalPending,
    maxWeeks,
  );
  const result = new Map<string, string>();
  const queues = new Map(
    Array.from(input.packageQueues.entries()).map(([key, value]) => [
      key,
      [...value],
    ]),
  );

  const recentPackages = input.packageOrder.filter((packageId) => {
    const queue = queues.get(packageId) ?? [];
    return queue.some((draft) => draft.isRecentPackage);
  });

  const hasRemaining = () =>
    Array.from(queues.values()).some((queue) => queue.length > 0);

  let dateIndex = 0;

  while (dateIndex < allDates.length && hasRemaining()) {
    const weekSlots = allDates.slice(
      dateIndex,
      dateIndex + input.postsPerWeek,
    );
    let slotInWeek = 0;

    for (const packageId of recentPackages) {
      if (slotInWeek >= weekSlots.length) {
        break;
      }

      const queue = queues.get(packageId) ?? [];

      if (queue.length === 0) {
        continue;
      }

      const draft = queue.shift()!;
      result.set(draft.draftId, weekSlots[slotInWeek]!);
      slotInWeek += 1;
    }

    while (slotInWeek < weekSlots.length && hasRemaining()) {
      let assigned = false;

      for (const packageId of input.packageOrder) {
        const queue = queues.get(packageId) ?? [];

        if (queue.length === 0) {
          continue;
        }

        const draft = queue.shift()!;
        result.set(draft.draftId, weekSlots[slotInWeek]!);
        slotInWeek += 1;
        assigned = true;
        break;
      }

      if (!assigned) {
        break;
      }
    }

    dateIndex += input.postsPerWeek;
  }

  return result;
}

/** Reassign suggestedScheduledFor on all pending drafts per publication target. */
export function rebalanceContentPackageSchedules(
  records: OpsContentPackageRecord[],
  options: RebalanceScheduleOptions = {},
): OpsContentPackageRecord[] {
  const today = options.today ?? localCalendarDate();
  const postsPerWeek = Math.min(7, Math.max(1, options.postsPerWeek ?? 3));
  const recentSourceDays = options.recentSourceDays ?? 14;
  const recentCutoff = subtractCalendarDays(today, recentSourceDays);
  const scheduleUpdates = new Map<string, string>();
  const targetIds = new Set<string>();

  for (const record of records) {
    for (const draft of record.platformDrafts) {
      if (draftIsPending(record, draft.id)) {
        targetIds.add(draft.publicationTargetId);
      }
    }
  }

  for (const targetId of targetIds) {
    const pending: PendingDraftRef[] = [];

    for (const record of records) {
      const sourceDate = record.sourceUpdate.sourceDate;
      const createdAt = record.contentPackage.createdAt;
      const isRecentPackage = sourceDate >= recentCutoff;

      for (const draft of record.platformDrafts) {
        if (draft.publicationTargetId !== targetId) {
          continue;
        }

        if (!draftIsPending(record, draft.id)) {
          continue;
        }

        pending.push({
          contentPackageId: record.contentPackage.id,
          draftId: draft.id,
          isRecentPackage,
          packageCreatedAt: createdAt,
          publicationTargetId: targetId,
          seriesIndex: draft.seriesIndex ?? 999,
          sourceDate,
        });
      }
    }

    if (pending.length === 0) {
      continue;
    }

    const packageOrder = Array.from(
      new Set(pending.map((item) => item.contentPackageId)),
    ).sort((leftId, rightId) => {
      const left = pending.find((item) => item.contentPackageId === leftId)!;
      const right = pending.find((item) => item.contentPackageId === rightId)!;

      if (left.sourceDate !== right.sourceDate) {
        return left.sourceDate.localeCompare(right.sourceDate);
      }

      return left.packageCreatedAt.localeCompare(right.packageCreatedAt);
    });

    const packageQueues = new Map<string, PendingDraftRef[]>();

    for (const packageId of packageOrder) {
      packageQueues.set(
        packageId,
        pending
          .filter((item) => item.contentPackageId === packageId)
          .sort((left, right) => left.seriesIndex - right.seriesIndex),
      );
    }

    const assigned = assignDraftsToSchedule({
      packageOrder,
      packageQueues,
      postsPerWeek,
      recentSourceDays,
      seriesStartDate: today,
      today,
    });

    for (const [draftId, date] of assigned) {
      scheduleUpdates.set(draftId, date);
    }
  }

  if (scheduleUpdates.size === 0) {
    return records;
  }

  const updatedAt = new Date().toISOString();

  return records.map((record) => ({
    ...record,
    platformDrafts: record.platformDrafts.map((draft) => {
      const nextDate = scheduleUpdates.get(draft.id);

      if (!nextDate) {
        return draft;
      }

      return {
        ...draft,
        suggestedScheduledFor: nextDate,
        updatedAt,
      };
    }),
  }));
}

export function countRebalancedDrafts(
  before: OpsContentPackageRecord[],
  after: OpsContentPackageRecord[],
) {
  const beforeDates = new Map<string, string | undefined>();

  for (const record of before) {
    for (const draft of record.platformDrafts) {
      beforeDates.set(draft.id, draft.suggestedScheduledFor);
    }
  }

  let changed = 0;

  for (const record of after) {
    for (const draft of record.platformDrafts) {
      if (beforeDates.get(draft.id) !== draft.suggestedScheduledFor) {
        changed += 1;
      }
    }
  }

  return changed;
}
