import type { OpsContentPackageRecord } from "@/lib/ops/types";

export function removeDraftFromRecords(
  records: OpsContentPackageRecord[],
  draftId: string,
): OpsContentPackageRecord[] {
  return records
    .map((record) => {
      if (!record.platformDrafts.some((draft) => draft.id === draftId)) {
        return record;
      }

      const platformDrafts = record.platformDrafts.filter(
        (draft) => draft.id !== draftId,
      );
      const publishedPosts = record.publishedPosts.filter(
        (post) => post.platformDraftId !== draftId,
      );
      const publishedPostIds = new Set(publishedPosts.map((post) => post.id));
      const performanceSnapshots = record.performanceSnapshots.filter((snapshot) =>
        publishedPostIds.has(snapshot.publishedPostId),
      );

      if (platformDrafts.length === 0) {
        return null;
      }

      return {
        ...record,
        contentPackage: {
          ...record.contentPackage,
          updatedAt: new Date().toISOString(),
        },
        performanceSnapshots,
        platformDrafts,
        publishedPosts,
      };
    })
    .filter((record): record is OpsContentPackageRecord => record !== null);
}

export function removePackageFromRecords(
  records: OpsContentPackageRecord[],
  contentPackageId: string,
): OpsContentPackageRecord[] {
  return records.filter(
    (record) => record.contentPackage.id !== contentPackageId,
  );
}

export function collectContentPackageRecordIds(
  records: OpsContentPackageRecord[],
) {
  return {
    businessOutcomeIds: records.map((record) => record.businessOutcome.id),
    contentPackageIds: records.map((record) => record.contentPackage.id),
    draftIds: records.flatMap((record) =>
      record.platformDrafts.map((draft) => draft.id),
    ),
    mediaMetadataIds: records.flatMap((record) =>
      record.platformDrafts.map((draft) => `media-${draft.id}`),
    ),
    performanceSnapshotIds: records.flatMap((record) =>
      record.performanceSnapshots.map((snapshot) => snapshot.id),
    ),
    publishedPostIds: records.flatMap((record) =>
      record.publishedPosts.map((post) => post.id),
    ),
    sourceUpdateIds: records.map((record) => record.sourceUpdate.id),
  };
}
