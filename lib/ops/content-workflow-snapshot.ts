import {
  buildPublishCalendarRows,
  localCalendarDate,
} from "@/lib/ops/publish-calendar";
import type { OpsContentPackageRecord } from "@/lib/ops/types";

export type ContentWorkflowSnapshot = {
  approvedPending: number;
  autopublishEnabled: number;
  loadedFrom: "database" | "none";
  overdue: number;
  packageCount: number;
  posted: number;
  recentPackages: Array<{
    draftCount: number;
    id: string;
    status: string;
    title: string;
    updatedAt: string;
  }>;
  today: number;
  totalDrafts: number;
  unscheduled: number;
  upcoming: number;
};

export function buildContentWorkflowSnapshot(
  records: OpsContentPackageRecord[],
  { loadedFrom = "database" }: { loadedFrom?: "database" | "none" } = {},
): ContentWorkflowSnapshot {
  const today = localCalendarDate();
  const rows = buildPublishCalendarRows(records, { today });

  return {
    approvedPending: rows.filter(
      (row) => row.draftStatus === "approved" && row.postStatus !== "posted",
    ).length,
    autopublishEnabled: rows.filter(
      (row) => row.autopublishEnabled && row.postStatus !== "posted",
    ).length,
    loadedFrom,
    overdue: rows.filter((row) => row.timing === "overdue").length,
    packageCount: records.length,
    posted: rows.filter((row) => row.timing === "posted").length,
    recentPackages: [...records]
      .sort((left, right) =>
        right.contentPackage.updatedAt.localeCompare(left.contentPackage.updatedAt),
      )
      .slice(0, 6)
      .map((record) => ({
        draftCount: record.platformDrafts.length,
        id: record.contentPackage.id,
        status: record.contentPackage.status,
        title: record.contentPackage.title,
        updatedAt: record.contentPackage.updatedAt,
      })),
    today: rows.filter((row) => row.timing === "today").length,
    totalDrafts: rows.length,
    unscheduled: rows.filter((row) => row.timing === "unscheduled").length,
    upcoming: rows.filter((row) => row.timing === "upcoming").length,
  };
}
