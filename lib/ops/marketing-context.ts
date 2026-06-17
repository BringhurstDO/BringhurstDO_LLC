import { opsDashboardData } from "@/lib/ops/mock-data";
import { buildPublishCalendarRows, localCalendarDate } from "@/lib/ops/publish-calendar";
import type { OpsContentPackageRecord } from "@/lib/ops/types";

const summaryMaxChars = 400;
const bodyPreviewMaxChars = 220;

function trimText(value: string, maxChars: number) {
  const trimmed = value.trim();

  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxChars).trim()}…`;
}

export type OpsMarketingContextDocument = {
  generatedAt: string;
  markdown: string;
  recordCount: number;
  sections: {
    audienceRules: unknown[];
    brandRules: unknown[];
    publicationTargets: unknown[];
    recentPackages: unknown[];
    recentPosted: unknown[];
    upcomingDrafts: unknown[];
  };
};

export function buildOpsMarketingContext(
  records: OpsContentPackageRecord[],
): OpsMarketingContextDocument {
  const {
    audienceProfiles,
    brandProfiles,
    publicationTargets,
  } = opsDashboardData;
  const today = localCalendarDate();
  const rows = buildPublishCalendarRows(records, { today });
  const recentPosted = rows
    .filter((row) => row.timing === "posted")
    .slice(0, 20)
    .map((row) => ({
      accountName: row.accountName,
      bodyPreview: trimText(row.bodyPreview, bodyPreviewMaxChars),
      packageTitle: row.packageTitle,
      platform: row.platform,
      postedUrl: row.postedUrl || undefined,
      suggestedScheduledFor: row.suggestedScheduledFor,
      title: row.title,
    }));
  const upcomingDrafts = rows
    .filter((row) => row.timing === "today" || row.timing === "upcoming")
    .slice(0, 30)
    .map((row) => ({
      accountName: row.accountName,
      bodyPreview: trimText(row.bodyPreview, bodyPreviewMaxChars),
      draftStatus: row.draftStatus,
      packageTitle: row.packageTitle,
      platform: row.platform,
      suggestedScheduledFor: row.suggestedScheduledFor,
      title: row.title,
    }));
  const recentPackages = [...records]
    .sort((left, right) =>
      right.contentPackage.updatedAt.localeCompare(left.contentPackage.updatedAt),
    )
    .slice(0, 12)
    .map((record) => ({
      draftCount: record.platformDrafts.length,
      postedCount: record.publishedPosts.filter((post) => post.status === "posted")
        .length,
      sourceDate: record.sourceUpdate.sourceDate,
      sourceSummary: trimText(record.sourceUpdate.summary, summaryMaxChars),
      status: record.contentPackage.status,
      title: record.contentPackage.title,
      updateType: record.sourceUpdate.updateType,
      updatedAt: record.contentPackage.updatedAt,
    }));

  const brandRules = brandProfiles.map((profile) => ({
    allowedTopics: profile.allowedTopics,
    brand: profile.displayName,
    prohibitedClaims: profile.prohibitedClaims,
    sourceBoundary: profile.sourceBoundary,
    voiceTone: profile.voiceTone,
  }));
  const audienceRules = audienceProfiles.map((profile) => ({
    audience: profile.label,
    contentUse: profile.contentUse,
    safetyNotes: profile.safetyNotes,
  }));
  const targets = publicationTargets.map((target) => ({
    accountName: target.accountName,
    audience: target.audience,
    platform: target.platform,
    projectId: target.projectId,
    status: target.accountStatus ?? "active",
  }));

  const markdown = [
    "# BringhurstDO Ops — Marketing Context",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Metadata-only operator context for AI review. No PHI, credentials, or private identifiers.",
    "",
    "## Brand voice and boundaries",
    "",
    ...brandRules.flatMap((profile) => [
      `### ${profile.brand}`,
      `- Voice: ${profile.voiceTone.join("; ")}`,
      `- Allowed topics: ${profile.allowedTopics.join("; ")}`,
      `- Prohibited claims: ${profile.prohibitedClaims.join("; ")}`,
      `- Boundary: ${profile.sourceBoundary}`,
      "",
    ]),
    "## Audience rules",
    "",
    ...audienceRules.flatMap((profile) => [
      `### ${profile.audience}`,
      `- Content use: ${profile.contentUse.join("; ")}`,
      `- Safety: ${profile.safetyNotes.join("; ")}`,
      "",
    ]),
    "## Publication targets",
    "",
    ...targets.map(
      (target) =>
        `- ${target.accountName} / ${target.platform} / ${target.audience} (${target.status})`,
    ),
    "",
    "## Recent content packages",
    "",
    recentPackages.length === 0
      ? "_No saved packages yet._"
      : recentPackages
          .map(
            (pkg) =>
              `### ${pkg.title}\n- Status: ${pkg.status}\n- Source date: ${pkg.sourceDate}\n- Update type: ${pkg.updateType}\n- Drafts: ${pkg.draftCount}, posted: ${pkg.postedCount}\n- Summary: ${pkg.sourceSummary}`,
          )
          .join("\n\n"),
    "",
    "## Upcoming and today (calendar)",
    "",
    upcomingDrafts.length === 0
      ? "_No scheduled drafts._"
      : upcomingDrafts
          .map(
            (draft) =>
              `- ${draft.suggestedScheduledFor ?? "unscheduled"} · ${draft.platform} · ${draft.accountName} · ${draft.title} (${draft.draftStatus})\n  ${draft.bodyPreview}`,
          )
          .join("\n"),
    "",
    "## Recently posted (tracked in Ops)",
    "",
    recentPosted.length === 0
      ? "_No posted drafts tracked yet._"
      : recentPosted
          .map(
            (row) =>
              `- ${row.platform} · ${row.accountName} · ${row.title}\n  ${row.bodyPreview}`,
          )
          .join("\n"),
    "",
  ].join("\n");

  return {
    generatedAt: new Date().toISOString(),
    markdown,
    recordCount: records.length,
    sections: {
      audienceRules,
      brandRules,
      publicationTargets: targets,
      recentPackages,
      recentPosted,
      upcomingDrafts,
    },
  };
}
