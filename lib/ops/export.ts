import type {
  DraftPost,
  ProjectHealthSnapshot,
  UtmCampaignLink,
  WeeklyOperatorReport,
} from "@/lib/ops/types";

export type OpsExportFile = {
  content: string;
  filename: string;
  label: string;
  mimeType: string;
};

function stringifyJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function csvCell(value: unknown) {
  const normalized = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${normalized.replace(/"/g, '""')}"`;
}

function csvRow(values: unknown[]) {
  return values.map(csvCell).join(",");
}

function markdownList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function markdownArray(value: string[]) {
  return value.length ? value.join("; ") : "None";
}

function markdownTableCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function jsonExportFile(
  filename: string,
  label: string,
  value: unknown,
): OpsExportFile {
  return {
    content: stringifyJson(value),
    filename: `${filename}.json`,
    label,
    mimeType: "application/json",
  };
}

export function markdownExportFile(
  filename: string,
  label: string,
  content: string,
): OpsExportFile {
  return {
    content: `${content.trim()}\n`,
    filename: `${filename}.md`,
    label,
    mimeType: "text/markdown",
  };
}

export function csvExportFile(
  filename: string,
  label: string,
  content: string,
): OpsExportFile {
  return {
    content: `${content.trim()}\n`,
    filename: `${filename}.csv`,
    label,
    mimeType: "text/csv",
  };
}

export function draftPostsToMarkdown(draftPosts: DraftPost[]) {
  const rows = draftPosts
    .map(
      (draft) => `## ${draft.title}

- ID: ${draft.id}
- Project: ${draft.projectId}
- Platform: ${draft.channel}
- Audience: ${draft.audience}
- Status: ${draft.status}
- Publish window: ${draft.publishWindow}
- Manual posted date: ${draft.postedManuallyAt ?? "Not posted"}
- UTM campaign: ${draft.utmCampaignId ?? "None"}
- Approval required: ${draft.approvalRequired ? "Yes" : "No"}

${draft.bodyPreview}

Safety notes:
${markdownList(draft.safetyNotes)}
`,
    )
    .join("\n");

  return `# Ops Draft Post Queue

Manual export from BringhurstDO Ops. This file is metadata-only planning data
and does not publish, schedule, or mutate any external system.

${rows}`;
}

export function draftPostsToCsv(draftPosts: DraftPost[]) {
  const header = [
    "id",
    "projectId",
    "title",
    "channel",
    "audience",
    "status",
    "publishWindow",
    "postedManuallyAt",
    "utmCampaignId",
    "approvalRequired",
    "bodyPreview",
    "safetyNotes",
  ];

  const rows = draftPosts.map((draft) =>
    csvRow([
      draft.id,
      draft.projectId,
      draft.title,
      draft.channel,
      draft.audience,
      draft.status,
      draft.publishWindow,
      draft.postedManuallyAt ?? "",
      draft.utmCampaignId ?? "",
      draft.approvalRequired ? "true" : "false",
      draft.bodyPreview,
      draft.safetyNotes,
    ]),
  );

  return [csvRow(header), ...rows].join("\n");
}

export function utmCampaignLinksToMarkdown(links: UtmCampaignLink[]) {
  const rows = links
    .map(
      (link) => `## ${link.label}

- ID: ${link.id}
- Project: ${link.projectId}
- Destination: ${link.destinationUrl}
- Source: ${link.source}
- Medium: ${link.medium}
- Campaign: ${link.campaign}
- Content: ${link.content}
- Status: ${link.status}

\`${link.generatedUrl}\`

Notes:
${markdownList(link.notes)}
`,
    )
    .join("\n");

  return `# Ops UTM Campaign Links

Manual export from BringhurstDO Ops. Copy links into manual posts only after
content approval.

${rows}`;
}

export function utmCampaignLinksToCsv(links: UtmCampaignLink[]) {
  const header = [
    "id",
    "projectId",
    "label",
    "destinationUrl",
    "source",
    "medium",
    "campaign",
    "content",
    "generatedUrl",
    "status",
    "notes",
  ];

  const rows = links.map((link) =>
    csvRow([
      link.id,
      link.projectId,
      link.label,
      link.destinationUrl,
      link.source,
      link.medium,
      link.campaign,
      link.content,
      link.generatedUrl,
      link.status,
      link.notes,
    ]),
  );

  return [csvRow(header), ...rows].join("\n");
}

export function weeklyReportToMarkdown(report: WeeklyOperatorReport) {
  const sections = report.sections
    .map(
      (section) => `## ${section.title}

Tone: ${section.tone}

${markdownList(section.items)}
`,
    )
    .join("\n");

  return `# Weekly Operator Report

- ID: ${report.id}
- Week: ${report.weekStart} to ${report.weekEnd}
- Generated: ${report.generatedAt}
- Mode: ${report.mode}

${report.summary}

${sections}

## Weekly Wins

${markdownList(report.weeklyWins)}

## Risks / Blockers

${markdownList(report.risksAndBlockers)}

## Cost Notes

${markdownList(report.costNotes)}

## Marketing / Content Output

${markdownList(report.marketingOutput)}

## Next Actions

${markdownList(report.nextActions)}
`;
}

export function projectHealthSnapshotsToMarkdown(
  snapshots: ProjectHealthSnapshot[],
) {
  const rows = snapshots
    .map(
      (snapshot) => `## ${snapshot.name}

- ID: ${snapshot.id}
- Project: ${snapshot.projectId}
- Captured: ${snapshot.capturedAt}
- Site status: ${snapshot.siteStatus}
- Deploy status: ${snapshot.deployStatus}
- Monthly cost estimate: ${snapshot.monthlyCostEstimate}
- Next action: ${snapshot.nextAction}

Traction notes:
${markdownList(snapshot.tractionNotes)}
`,
    )
    .join("\n");

  return `# Ops Project Health Snapshots

Manual export from BringhurstDO Ops. These rows are metadata-only summaries, not
source-system logs or sensitive payloads.

${rows}`;
}

export function draftPostsSummaryTable(draftPosts: DraftPost[]) {
  return [
    "| Draft | Platform | Audience | Status | Window | Manual posted |",
    "| --- | --- | --- | --- | --- | --- |",
    ...draftPosts.map(
      (draft) =>
        `| ${markdownTableCell(draft.title)} | ${draft.channel} | ${draft.audience} | ${draft.status} | ${markdownTableCell(draft.publishWindow)} | ${draft.postedManuallyAt ?? "No"} |`,
    ),
  ].join("\n");
}

export function utmLinksSummaryTable(links: UtmCampaignLink[]) {
  return [
    "| Label | Source | Medium | Campaign | Content | URL |",
    "| --- | --- | --- | --- | --- | --- |",
    ...links.map(
      (link) =>
        `| ${markdownTableCell(link.label)} | ${link.source} | ${link.medium} | ${link.campaign} | ${link.content} | ${markdownTableCell(link.generatedUrl)} |`,
    ),
  ].join("\n");
}

export function projectHealthSummaryTable(snapshots: ProjectHealthSnapshot[]) {
  return [
    "| Project | Site | Deploy | Cost | Next Action |",
    "| --- | --- | --- | --- | --- |",
    ...snapshots.map(
      (snapshot) =>
        `| ${snapshot.name} | ${markdownTableCell(snapshot.siteStatus)} | ${markdownTableCell(snapshot.deployStatus)} | ${markdownTableCell(snapshot.monthlyCostEstimate)} | ${markdownTableCell(snapshot.nextAction)} |`,
    ),
  ].join("\n");
}

export function weeklyReportSummaryMarkdown(report: WeeklyOperatorReport) {
  return `# Weekly Operator Report Summary

- Week: ${report.weekStart} to ${report.weekEnd}
- Generated: ${report.generatedAt}
- Mode: ${report.mode}

${report.summary}

## Wins

${markdownArray(report.weeklyWins)}

## Risks

${markdownArray(report.risksAndBlockers)}
`;
}
