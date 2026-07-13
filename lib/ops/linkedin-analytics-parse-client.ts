/**
 * Browser-side LinkedIn Aggregate Analytics (.xlsx) parser.
 * Extracts compact metrics only — never uploads the workbook itself.
 */

import * as XLSX from "xlsx";

export type LinkedInAnalyticsClientPayload = {
  discovery: {
    impressions: number;
    membersReached: number;
    periodLabel: string;
  };
  followers: {
    newFollowers: number;
    totalFollowers: number;
  };
  topPosts: Array<{
    engagements: number;
    impressions: number;
    postUrl: string;
  }>;
  totalEngagements: number;
};

function cellText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function cellNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const parsed = Number(cellText(value).replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}

function sheetRows(workbook: XLSX.WorkBook, name: string) {
  const sheet = workbook.Sheets[name];

  if (!sheet) {
    return [] as unknown[][];
  }

  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];
}

function findSheetName(workbook: XLSX.WorkBook, expected: string) {
  return (
    workbook.SheetNames.find(
      (name) => name.trim().toUpperCase() === expected.toUpperCase(),
    ) ?? expected
  );
}

export async function parseLinkedInAggregateAnalyticsFile(
  file: File,
): Promise<LinkedInAnalyticsClientPayload> {
  const lower = file.name.toLowerCase();

  if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    throw new Error("Upload a LinkedIn Aggregate Analytics Excel file (.xlsx).");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Excel file must be 5 MB or smaller.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const discoveryRows = sheetRows(
    workbook,
    findSheetName(workbook, "DISCOVERY"),
  );
  const engagementRows = sheetRows(
    workbook,
    findSheetName(workbook, "ENGAGEMENT"),
  );
  const topPostsRows = sheetRows(
    workbook,
    findSheetName(workbook, "TOP POSTS"),
  );
  const followersRows = sheetRows(
    workbook,
    findSheetName(workbook, "FOLLOWERS"),
  );

  let periodLabel = "";
  let impressions = 0;
  let membersReached = 0;

  for (const row of discoveryRows) {
    const label = cellText(row[0]).toLowerCase();
    const value = row[1];

    if (label.includes("overall performance")) {
      periodLabel = cellText(value);
    }

    if (label === "impressions") {
      impressions = cellNumber(value);
    }

    if (label.includes("members reached") || label.includes("member reached")) {
      membersReached = cellNumber(value);
    }
  }

  let totalEngagements = 0;

  for (let index = 1; index < engagementRows.length; index += 1) {
    const row = engagementRows[index] ?? [];
    totalEngagements += cellNumber(row[2]);
  }

  let totalFollowers = 0;
  let newFollowers = 0;

  for (let index = 0; index < followersRows.length; index += 1) {
    const row = followersRows[index] ?? [];
    const label = cellText(row[0]).toLowerCase();

    if (label.includes("total followers")) {
      totalFollowers = cellNumber(row[1]);
      continue;
    }

    if (label === "date" || !label) {
      continue;
    }

    // Daily new-follower rows after the header.
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(label) || !Number.isNaN(Date.parse(label))) {
      newFollowers += cellNumber(row[1]);
    }
  }

  // Fallback: if rows were date serials, sum column 1 after header looking like Date.
  if (newFollowers === 0) {
    let pastHeader = false;

    for (const row of followersRows) {
      const first = cellText(row[0]).toLowerCase();

      if (first === "date") {
        pastHeader = true;
        continue;
      }

      if (!pastHeader) {
        continue;
      }

      newFollowers += cellNumber(row[1]);
    }
  }

  const topPosts: LinkedInAnalyticsClientPayload["topPosts"] = [];
  let headerIndex = -1;

  for (let index = 0; index < topPostsRows.length; index += 1) {
    const row = topPostsRows[index] ?? [];
    const cells = row.map((cell) => cellText(cell).toLowerCase());

    if (cells.includes("post url") && cells.includes("post publish date")) {
      headerIndex = index;
      break;
    }
  }

  if (headerIndex >= 0) {
    for (let index = headerIndex + 1; index < topPostsRows.length; index += 1) {
      const row = topPostsRows[index] ?? [];
      const leftUrl = cellText(row[0]);
      const leftEngagements = cellNumber(row[2]);
      const rightUrl = cellText(row[4]);
      const rightImpressions = cellNumber(row[6]);

      if (leftUrl.startsWith("https://www.linkedin.com/")) {
        topPosts.push({
          engagements: leftEngagements,
          impressions: 0,
          postUrl: leftUrl,
        });
      }

      if (rightUrl.startsWith("https://www.linkedin.com/")) {
        topPosts.push({
          engagements: 0,
          impressions: rightImpressions,
          postUrl: rightUrl,
        });
      }
    }
  }

  // Merge left (engagements) and right (impressions) lists by URL.
  const merged = new Map<
    string,
    { engagements: number; impressions: number; postUrl: string }
  >();

  for (const post of topPosts) {
    const key = post.postUrl.toLowerCase().replace(/[?#].*$/, "");
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...post });
      continue;
    }

    merged.set(key, {
      engagements: Math.max(existing.engagements, post.engagements),
      impressions: Math.max(existing.impressions, post.impressions),
      postUrl: existing.postUrl,
    });
  }

  if (!periodLabel && impressions === 0 && merged.size === 0) {
    throw new Error(
      "Could not read LinkedIn Aggregate Analytics sheets (DISCOVERY / TOP POSTS).",
    );
  }

  return {
    discovery: {
      impressions,
      membersReached,
      periodLabel,
    },
    followers: {
      newFollowers,
      totalFollowers,
    },
    topPosts: Array.from(merged.values()).slice(0, 50),
    totalEngagements,
  };
}
