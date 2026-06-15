import "server-only";

import { neon } from "@neondatabase/serverless";

import type { OpsPersistenceAdapter } from "@/lib/ops/persistence";
import { validateOpsContentPackageRecords } from "@/lib/ops/persistence-validation";
import { collectContentPackageRecordIds } from "@/lib/ops/content-package-mutations";
import type {
  BusinessOutcome,
  ContentPackage,
  OpsContentPackageRecord,
  PerformanceSnapshot,
  PlatformDraft,
  PublishedPost,
  SourceUpdate,
} from "@/lib/ops/types";

type JsonRow<T> = {
  data: T;
};

type OpsTableName =
  | "ops_business_outcomes"
  | "ops_content_packages"
  | "ops_media_metadata"
  | "ops_performance_snapshots"
  | "ops_platform_drafts"
  | "ops_published_posts"
  | "ops_source_updates";

const allowedTables: OpsTableName[] = [
  "ops_business_outcomes",
  "ops_content_packages",
  "ops_media_metadata",
  "ops_performance_snapshots",
  "ops_platform_drafts",
  "ops_published_posts",
  "ops_source_updates",
];

function assertAllowedTable(tableName: OpsTableName) {
  if (!allowedTables.includes(tableName)) {
    throw new Error(`Unsupported Ops persistence table: ${tableName}`);
  }
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

function queryClient() {
  return neon(getDatabaseUrl());
}

function sourceBoundaryForRecord(record: unknown) {
  if (record && typeof record === "object" && "sourceBoundary" in record) {
    const sourceBoundary = (record as { sourceBoundary?: unknown }).sourceBoundary;

    if (typeof sourceBoundary === "string" && sourceBoundary.trim()) {
      return sourceBoundary;
    }
  }

  return "BringhurstDO Ops metadata-only database record.";
}

async function upsertJsonRecord<T extends { id: string }>({
  data,
  platformDraftId,
  tableName,
}: {
  data: T;
  platformDraftId?: string;
  tableName: OpsTableName;
}) {
  assertAllowedTable(tableName);

  const now = new Date().toISOString();
  const sourceBoundary = sourceBoundaryForRecord(data);
  const sql = queryClient();

  if (tableName === "ops_media_metadata") {
    await sql.query(
      `insert into ops_media_metadata
        (id, platform_draft_id, created_at, updated_at, schema_version, source_boundary, data)
       values ($1, $2, $3, $3, 1, $4, $5::jsonb)
       on conflict (id) do update set
        platform_draft_id = excluded.platform_draft_id,
        updated_at = excluded.updated_at,
        schema_version = excluded.schema_version,
        source_boundary = excluded.source_boundary,
        data = excluded.data`,
      [
        data.id,
        platformDraftId ?? data.id,
        now,
        sourceBoundary,
        JSON.stringify(data),
      ],
    );
    return;
  }

  await sql.query(
    `insert into ${tableName}
      (id, created_at, updated_at, schema_version, source_boundary, data)
     values ($1, $2, $2, 1, $3, $4::jsonb)
     on conflict (id) do update set
      updated_at = excluded.updated_at,
      schema_version = excluded.schema_version,
      source_boundary = excluded.source_boundary,
      data = excluded.data`,
    [data.id, now, sourceBoundary, JSON.stringify(data)],
  );
}

async function deleteRowsNotInIds(tableName: OpsTableName, keptIds: string[]) {
  assertAllowedTable(tableName);
  const sql = queryClient();

  if (keptIds.length === 0) {
    await sql.query(`delete from ${tableName}`);
    return;
  }

  await sql.query(`delete from ${tableName} where not (id = any($1::text[]))`, [
    keptIds,
  ]);
}

async function pruneContentPackageRecords(records: OpsContentPackageRecord[]) {
  const ids = collectContentPackageRecordIds(records);

  await deleteRowsNotInIds("ops_source_updates", ids.sourceUpdateIds);
  await deleteRowsNotInIds("ops_content_packages", ids.contentPackageIds);
  await deleteRowsNotInIds("ops_platform_drafts", ids.draftIds);
  await deleteRowsNotInIds("ops_media_metadata", ids.mediaMetadataIds);
  await deleteRowsNotInIds("ops_published_posts", ids.publishedPostIds);
  await deleteRowsNotInIds("ops_performance_snapshots", ids.performanceSnapshotIds);
  await deleteRowsNotInIds("ops_business_outcomes", ids.businessOutcomeIds);
}

async function readJsonRows<T>(tableName: OpsTableName) {
  assertAllowedTable(tableName);
  const sql = queryClient();

  return sql.query(
    `select data from ${tableName} order by updated_at desc`,
  ) as unknown as Promise<JsonRow<T>[]>;
}

function recomposeContentPackages({
  businessOutcomes,
  contentPackages,
  performanceSnapshots,
  platformDrafts,
  publishedPosts,
  sourceUpdates,
}: {
  businessOutcomes: BusinessOutcome[];
  contentPackages: ContentPackage[];
  performanceSnapshots: PerformanceSnapshot[];
  platformDrafts: PlatformDraft[];
  publishedPosts: PublishedPost[];
  sourceUpdates: SourceUpdate[];
}) {
  return contentPackages.flatMap((contentPackage): OpsContentPackageRecord[] => {
    const sourceUpdate = sourceUpdates.find(
      (item) => item.id === contentPackage.sourceUpdateId,
    );
    const businessOutcome = businessOutcomes.find(
      (item) => item.contentPackageId === contentPackage.id,
    );

    if (!sourceUpdate || !businessOutcome) {
      return [];
    }

    const packageDrafts = platformDrafts.filter(
      (draft) => draft.contentPackageId === contentPackage.id,
    );
    const draftIds = new Set(packageDrafts.map((draft) => draft.id));
    const packagePosts = publishedPosts.filter((post) =>
      draftIds.has(post.platformDraftId),
    );
    const postIds = new Set(packagePosts.map((post) => post.id));
    const packageSnapshots = performanceSnapshots.filter((snapshot) =>
      postIds.has(snapshot.publishedPostId),
    );

    return [
      {
        businessOutcome,
        contentPackage,
        performanceSnapshots: packageSnapshots,
        platformDrafts: packageDrafts,
        publishedPosts: packagePosts,
        sourceUpdate,
      },
    ];
  });
}

export function databasePersistenceConfigured() {
  return (
    process.env.OPS_STORAGE_MODE === "database" &&
    Boolean(process.env.DATABASE_URL?.trim())
  );
}

export function createDatabaseOpsPersistenceAdapter(): OpsPersistenceAdapter {
  return {
    durabilityWarning:
      "Saved through the protected Ops Postgres adapter. Keep JSON exports until database backups are verified.",
    label: "Storage mode: durable database",
    mode: "database",
    async loadContentPackages() {
      const [
        businessOutcomeRows,
        contentPackageRows,
        performanceSnapshotRows,
        platformDraftRows,
        publishedPostRows,
        sourceUpdateRows,
      ] = await Promise.all([
        readJsonRows<BusinessOutcome>("ops_business_outcomes"),
        readJsonRows<ContentPackage>("ops_content_packages"),
        readJsonRows<PerformanceSnapshot>("ops_performance_snapshots"),
        readJsonRows<PlatformDraft>("ops_platform_drafts"),
        readJsonRows<PublishedPost>("ops_published_posts"),
        readJsonRows<SourceUpdate>("ops_source_updates"),
      ]);
      const contentPackages = recomposeContentPackages({
        businessOutcomes: businessOutcomeRows.map((row) => row.data),
        contentPackages: contentPackageRows.map((row) => row.data),
        performanceSnapshots: performanceSnapshotRows.map((row) => row.data),
        platformDrafts: platformDraftRows.map((row) => row.data),
        publishedPosts: publishedPostRows.map((row) => row.data),
        sourceUpdates: sourceUpdateRows.map((row) => row.data),
      });

      return {
        contentPackages,
        mode: "database",
        source: "postgres",
      };
    },
    async saveContentPackages(records) {
      const validation = validateOpsContentPackageRecords(
        records,
        "databaseContentPackages",
      );

      if (!validation.ok) {
        throw new Error(validation.issues.join("; "));
      }

      for (const record of validation.records) {
        await upsertJsonRecord({
          data: record.sourceUpdate,
          tableName: "ops_source_updates",
        });
        await upsertJsonRecord({
          data: record.contentPackage,
          tableName: "ops_content_packages",
        });

        for (const draft of record.platformDrafts) {
          await upsertJsonRecord({
            data: draft,
            tableName: "ops_platform_drafts",
          });
          await upsertJsonRecord({
            data: {
              id: `media-${draft.id}`,
              ...draft.media,
            },
            platformDraftId: draft.id,
            tableName: "ops_media_metadata",
          });
        }

        for (const post of record.publishedPosts) {
          await upsertJsonRecord({
            data: post,
            tableName: "ops_published_posts",
          });
        }

        for (const snapshot of record.performanceSnapshots) {
          await upsertJsonRecord({
            data: snapshot,
            tableName: "ops_performance_snapshots",
          });
        }

        await upsertJsonRecord({
          data: record.businessOutcome,
          tableName: "ops_business_outcomes",
        });
      }

      await pruneContentPackageRecords(validation.records);

      return {
        mode: "database",
        savedAt: new Date().toISOString(),
        source: "postgres",
      };
    },
  };
}
