"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ClipboardCheck,
  Download,
  FilePlus2,
  Link2,
  Plus,
  Save,
  Upload,
} from "lucide-react";

import { collectMetadataOnlyIssues } from "@/lib/ops/safety";
import type {
  BusinessOutcome,
  ContentPackage,
  ContentPackageStatus,
  OpsProjectId,
  OpsProjectSummary,
  PerformanceSnapshot,
  PlatformDraft,
  PlatformDraftStatus,
  PublicationTarget,
  PublishedPost,
  PublishedPostStatus,
  SourceUpdate,
  SourceUpdateType,
} from "@/lib/ops/types";
import { buildUtmUrl } from "@/lib/ops/utm";

type DraftSlotInput = {
  body: string;
  id: string;
  status: PlatformDraftStatus;
  targetId: string;
  title: string;
};

type LocalContentPackageRecord = {
  businessOutcome: BusinessOutcome;
  contentPackage: ContentPackage;
  performanceSnapshots: PerformanceSnapshot[];
  platformDrafts: PlatformDraft[];
  publishedPosts: PublishedPost[];
  sourceUpdate: SourceUpdate;
};

type WeeklyQueueState = "ready" | "not posted" | "posted" | "missing metrics";

type WeeklyContentQueueRow = {
  accountName: string;
  draftId: string;
  packageTitle: string;
  platform: string;
  postStatus: PublishedPostStatus;
  state: WeeklyQueueState;
  title: string;
  url: string;
};

type ContentPackageBuilderProps = {
  initialRecords: LocalContentPackageRecord[];
  projects: OpsProjectSummary[];
  publicationTargets: PublicationTarget[];
};

const storageKey = "bringhurstdo.ops.contentPackages.v1";
const maxPackageImportBytes = 200_000;

const sourceUpdateTypes: SourceUpdateType[] = [
  "product-update",
  "launch-note",
  "customer-learning",
  "operator-note",
  "weekly-review",
];

const packageStatuses: ContentPackageStatus[] = [
  "drafting",
  "needs review",
  "approved",
  "partially posted",
  "posted",
  "archived",
];

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || "content-package";
}

function nowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function targetToSource(target: PublicationTarget) {
  return target.platform.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function campaignName(sourceTitle: string, target: PublicationTarget) {
  return `${slugify(sourceTitle)}_${targetToSource(target)}`;
}

function platformMedium(target: PublicationTarget) {
  return target.platform === "Email" ? "manual" : "organic";
}

function cleanTemplateInput(value: string, fallback: string) {
  return value.trim().replace(/\s+/g, " ") || fallback;
}

function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const clipped = value.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(" ");

  return `${clipped.slice(0, lastSpace > 40 ? lastSpace : clipped.length).trim()}.`;
}

function hashtagValue(value: string) {
  const tag = value.replace(/^@/, "").replace(/[^a-zA-Z0-9]+/g, "");

  return tag ? `#${tag}` : "";
}

function productHashtag(target: PublicationTarget) {
  if (target.projectId === "syncsoap") {
    return "#SyncSOAP";
  }

  if (target.projectId === "syncsafety") {
    return "#SyncSafety";
  }

  return "#BringhurstDO";
}

function buildUtmForTarget(
  target: PublicationTarget,
  campaign: string,
  content = target.id,
) {
  return buildUtmUrl({
    campaign,
    content,
    destinationUrl: target.defaultDestinationUrl,
    medium: platformMedium(target),
    source: targetToSource(target),
  });
}

function targetIsBlocked(target: PublicationTarget) {
  return (
    target.accountStatus !== undefined &&
    target.accountStatus !== "active"
  );
}

function draftTemplateBody({
  campaign,
  destinationUrl,
  sourceSummary,
  sourceTitle,
  target,
}: {
  campaign: string;
  destinationUrl: string;
  sourceSummary: string;
  sourceTitle: string;
  target: PublicationTarget;
}) {
  const title = cleanTemplateInput(sourceTitle, "Product update");
  const summary = cleanTemplateInput(
    sourceSummary,
    "A metadata-only operator update is ready for manual review.",
  );
  const account = target.accountName;
  const audience = target.audience;
  const productTag = productHashtag(target);
  const accountTag = hashtagValue(target.publicHandle);

  if (target.platform === "Facebook" && targetIsBlocked(target)) {
    return [
      `Blocked Facebook draft for ${account}.`,
      "This account is pending Meta trust/Page creation and should not be used for live posting.",
      "Keep this slot disabled until the account status becomes active.",
      "Manual approval is still required before any future publishing.",
    ].join("\n\n");
  }

  if (target.platform === "LinkedIn") {
    return [
      `${title}`,
      "",
      `${summary}`,
      "",
      `For ${audience}, the useful signal is simple: ${account} is keeping this update practical, reviewable, and tied to a manual operator workflow.`,
      "",
      `Campaign: ${campaign}`,
      `Learn more: ${destinationUrl}`,
      "",
      "Manual approval required before posting. No autoposting is connected.",
    ].join("\n");
  }

  if (target.platform === "Instagram") {
    return [
      `${title}`,
      "",
      `${truncateAtWord(summary, 180)}`,
      "",
      `Built for ${audience}.`,
      "Manual review before anything goes live.",
      "",
      `${destinationUrl}`,
      "",
      [productTag, accountTag, "#OperatorNotes", "#BuildInPublic"]
        .filter(Boolean)
        .join(" "),
    ].join("\n");
  }

  if (target.platform === "X") {
    const body = `${title}: ${truncateAtWord(
      summary,
      150,
    )} For ${audience}. ${destinationUrl}`;

    return truncateAtWord(body, 260);
  }

  if (target.platform === "Facebook") {
    return [
      `${title}`,
      "",
      `${summary}`,
      "",
      `For ${audience}.`,
      `Learn more: ${destinationUrl}`,
      "",
      "Manual approval required before posting. No Meta API is connected.",
    ].join("\n");
  }

  return [
    `${title}`,
    "",
    `${summary}`,
    "",
    `Target: ${account} / ${target.platform} / ${audience}`,
    `Campaign: ${campaign}`,
    `Destination: ${destinationUrl}`,
    "",
    "Manual approval required before publishing.",
  ].join("\n");
}

function issueText(value: unknown, path: string) {
  return collectMetadataOnlyIssues(value, path).map(
    (issue) => `${issue.path}: ${issue.message}`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isLocalContentPackageRecord(
  value: unknown,
): value is LocalContentPackageRecord {
  if (!isRecord(value)) {
    return false;
  }

  const {
    businessOutcome,
    contentPackage,
    performanceSnapshots,
    platformDrafts,
    publishedPosts,
    sourceUpdate,
  } = value;

  return (
    isRecord(businessOutcome) &&
    isRecord(contentPackage) &&
    isRecord(sourceUpdate) &&
    Array.isArray(performanceSnapshots) &&
    Array.isArray(platformDrafts) &&
    Array.isArray(publishedPosts) &&
    isString(contentPackage.id) &&
    isString(contentPackage.title) &&
    isString(sourceUpdate.id) &&
    isString(sourceUpdate.title) &&
    isStringArray(contentPackage.publicationTargetIds)
  );
}

function packageExportFilename(record: LocalContentPackageRecord) {
  return `ops-content-package-${slugify(record.contentPackage.title)}.json`;
}

function downloadTextFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function metricHasValue(value: string) {
  const normalized = value.trim();

  return Boolean(normalized) && normalized !== "0" && normalized !== "0.0";
}

function snapshotHasMetrics(snapshot: PerformanceSnapshot | undefined) {
  if (!snapshot) {
    return false;
  }

  return [
    snapshot.impressions,
    snapshot.clicks,
    snapshot.reactions,
    snapshot.comments,
    snapshot.saves,
  ].some(metricHasValue);
}

function buildWeeklyQueueRows(records: LocalContentPackageRecord[]) {
  return records.flatMap((record): WeeklyContentQueueRow[] =>
    record.platformDrafts.map((draft) => {
      const post = record.publishedPosts.find(
        (item) => item.platformDraftId === draft.id,
      );
      const snapshot = post
        ? record.performanceSnapshots.find(
            (item) => item.publishedPostId === post.id,
          )
        : undefined;
      const postStatus = post?.status ?? "not posted";
      let state: WeeklyQueueState = "not posted";

      if (postStatus === "posted" && !snapshotHasMetrics(snapshot)) {
        state = "missing metrics";
      } else if (postStatus === "posted") {
        state = "posted";
      } else if (draft.status === "approved") {
        state = "ready";
      }

      return {
        accountName: draft.accountName,
        draftId: draft.id,
        packageTitle: record.contentPackage.title,
        platform: draft.platform,
        postStatus,
        state,
        title: draft.title,
        url: draft.generatedUrl,
      };
    }),
  );
}

function buildPostPacket(record: LocalContentPackageRecord) {
  const draftSections = record.platformDrafts
    .map((draft) => {
      const post = record.publishedPosts.find(
        (item) => item.platformDraftId === draft.id,
      );

      return `## ${draft.accountName} / ${draft.platform}

Status: ${draft.status}
Posted: ${post?.status ?? "not posted"}
Title: ${draft.title}
UTM URL: ${draft.generatedUrl}
Published URL: ${post?.postUrl ?? "Not posted"}

${draft.body}

Safety notes:
${draft.safetyNotes.map((note) => `- ${note}`).join("\n")}`;
    })
    .join("\n\n");

  return `# Post Packet: ${record.contentPackage.title}

Source update: ${record.sourceUpdate.title}
Source date: ${record.sourceUpdate.sourceDate}
Approval required: ${record.contentPackage.approvalRequired ? "Yes" : "No"}
Boundary: metadata-only, no PHI, no credentials, no private messages, no raw logs.
Manual rule: post manually only after approval. No autoposting or spend mutation is connected.

${record.sourceUpdate.summary}

${draftSections}
`;
}

function validPostUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function createImportedPackageCopy(record: LocalContentPackageRecord) {
  const importedAt = new Date().toISOString();
  const importSuffix = `imported-${nowId()}`;
  const sourceUpdateId = `${record.sourceUpdate.id}-${importSuffix}`;
  const contentPackageId = `${record.contentPackage.id}-${importSuffix}`;
  const draftIdMap = new Map<string, string>();
  const postIdMap = new Map<string, string>();

  const platformDrafts = record.platformDrafts.map((draft, index) => {
    const draftId = `${draft.id}-${importSuffix}-${index + 1}`;
    draftIdMap.set(draft.id, draftId);

    return {
      ...draft,
      contentPackageId,
      id: draftId,
      sourceUpdateId,
      updatedAt: importedAt,
    };
  });
  const publishedPosts = record.publishedPosts.map((post, index) => {
    const postId = `${post.id}-${importSuffix}-${index + 1}`;
    postIdMap.set(post.id, postId);

    return {
      ...post,
      id: postId,
      manualNotes: [
        ...post.manualNotes,
        "Imported copy created because the original package ID already existed.",
      ],
      platformDraftId:
        draftIdMap.get(post.platformDraftId) ??
        `${post.platformDraftId}-${importSuffix}`,
    };
  });

  return {
    businessOutcome: {
      ...record.businessOutcome,
      contentPackageId,
      id: `${record.businessOutcome.id}-${importSuffix}`,
      notes: [
        ...record.businessOutcome.notes,
        "Imported copy created because the original package ID already existed.",
      ],
    },
    contentPackage: {
      ...record.contentPackage,
      createdAt: importedAt,
      id: contentPackageId,
      notes: [
        ...record.contentPackage.notes,
        "Imported copy created because the original package ID already existed.",
      ],
      sourceUpdateId,
      title: `${record.contentPackage.title} (Imported copy)`,
      updatedAt: importedAt,
    },
    performanceSnapshots: record.performanceSnapshots.map((snapshot, index) => ({
      ...snapshot,
      id: `${snapshot.id}-${importSuffix}-${index + 1}`,
      notes: [
        ...snapshot.notes,
        "Imported copy created because the original package ID already existed.",
      ],
      publishedPostId:
        postIdMap.get(snapshot.publishedPostId) ?? snapshot.publishedPostId,
    })),
    platformDrafts,
    publishedPosts,
    sourceUpdate: {
      ...record.sourceUpdate,
      createdAt: importedAt,
      id: sourceUpdateId,
      notes: [
        ...record.sourceUpdate.notes,
        "Imported copy created because the original package ID already existed.",
      ],
      title: `${record.sourceUpdate.title} (Imported copy)`,
    },
  } satisfies LocalContentPackageRecord;
}

export function ContentPackageBuilder({
  initialRecords,
  projects,
  publicationTargets,
}: ContentPackageBuilderProps) {
  const [primaryProjectId, setPrimaryProjectId] =
    useState<OpsProjectId>("syncsoap");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceType, setSourceType] =
    useState<SourceUpdateType>("product-update");
  const [sourceDate, setSourceDate] = useState("2026-06-06");
  const [sourceSummary, setSourceSummary] = useState("");
  const [sourceNotes, setSourceNotes] = useState("");
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [draftSlots, setDraftSlots] = useState<DraftSlotInput[]>([]);
  const [records, setRecords] = useState<LocalContentPackageRecord[]>(initialRecords);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveIssues, setSaveIssues] = useState<string[]>([]);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [packetMessage, setPacketMessage] = useState("");
  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as unknown;
      const issues = issueText(parsed, "storedContentPackages");

      if (issues.length === 0 && Array.isArray(parsed)) {
        setRecords(parsed as LocalContentPackageRecord[]);
      }
    } catch {
      setSaveIssues(["Stored local content packages could not be parsed."]);
    }
  }, []);

  const selectedTargets = useMemo(
    () =>
      publicationTargets.filter((target) =>
        selectedTargetIds.includes(target.id),
      ),
    [publicationTargets, selectedTargetIds],
  );

  const selectedProjectIds = useMemo(() => {
    const targetProjectIds = selectedTargets
      .map((target) => target.projectId)
      .filter((projectId): projectId is OpsProjectId => Boolean(projectId));

    return Array.from(new Set([primaryProjectId, ...targetProjectIds]));
  }, [primaryProjectId, selectedTargets]);

  const weeklyQueueRows = useMemo(() => buildWeeklyQueueRows(records), [records]);
  const weeklyQueueGroups = useMemo(
    () => ({
      "missing metrics": weeklyQueueRows.filter(
        (row) => row.state === "missing metrics",
      ),
      "not posted": weeklyQueueRows.filter((row) => row.state === "not posted"),
      posted: weeklyQueueRows.filter((row) => row.state === "posted"),
      ready: weeklyQueueRows.filter((row) => row.state === "ready"),
    }),
    [weeklyQueueRows],
  );

  function toggleTarget(targetId: string) {
    const target = publicationTargets.find((item) => item.id === targetId);

    if (target && targetIsBlocked(target)) {
      setSaveIssues([
        `${target.accountName} is ${target.accountStatus}; activate the account before creating drafts.`,
      ]);
      return;
    }

    setSelectedTargetIds((current) =>
      current.includes(targetId)
        ? current.filter((id) => id !== targetId)
        : [...current, targetId],
    );
  }

  function generateDraftSlots() {
    const packageSlug = slugify(sourceTitle);
    const activeTargets = selectedTargets.filter(
      (target) => !targetIsBlocked(target),
    );

    if (activeTargets.length === 0) {
      setSaveIssues([
        "Select at least one active publication target before generating slots.",
      ]);
      return;
    }

    setDraftSlots(
      activeTargets.map((target) => {
        const campaign = campaignName(sourceTitle, target);
        const destinationUrl = buildUtmForTarget(target, campaign);

        return {
          body: draftTemplateBody({
            campaign,
            destinationUrl,
            sourceSummary,
            sourceTitle,
            target,
          }),
          id: `slot-${packageSlug}-${target.id}`,
          status: "drafted",
          targetId: target.id,
          title: sourceTitle || `${target.accountName} draft`,
        };
      }),
    );
    setSaveIssues([]);
  }

  function addBlankDraftSlot() {
    const target =
      selectedTargets.find((item) => !targetIsBlocked(item)) ??
      publicationTargets.find((item) => !targetIsBlocked(item));

    if (!target) {
      setSaveIssues([
        "Select or create an active publication target before adding a slot.",
      ]);
      return;
    }

    setDraftSlots((current) => [
      ...current,
      {
        body: "",
        id: `slot-manual-${nowId()}`,
        status: "slot",
        targetId: target.id,
        title: "",
      },
    ]);
  }

  function updateDraftSlot(
    slotId: string,
    patch: Partial<Omit<DraftSlotInput, "id">>,
  ) {
    setDraftSlots((current) =>
      current.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)),
    );
  }

  function persistRecords(nextRecords: LocalContentPackageRecord[]) {
    const issues = issueText(nextRecords, "contentPackageRecords");

    if (issues.length > 0) {
      setSaveIssues(issues);
      setSaveMessage("");
      return false;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(nextRecords, null, 2));
    setRecords(nextRecords);
    setSaveIssues([]);
    return true;
  }

  function exportPackage(record: LocalContentPackageRecord) {
    const issues = issueText(record, "contentPackageExport");

    if (issues.length > 0) {
      setSaveIssues(issues);
      setSaveMessage("");
      return;
    }

    downloadTextFile(
      packageExportFilename(record),
      "application/json",
      `${JSON.stringify(record, null, 2)}\n`,
    );
    setSaveIssues([]);
    setPacketMessage(`Exported ${record.contentPackage.title} as JSON.`);
  }

  async function copyPostPacket(record: LocalContentPackageRecord) {
    const packet = buildPostPacket(record);
    const issues = issueText(packet, "postPacket");

    if (issues.length > 0) {
      setSaveIssues(issues);
      setPacketMessage("");
      return;
    }

    try {
      await navigator.clipboard.writeText(packet);
      setPacketMessage(`Copied post packet for ${record.contentPackage.title}.`);
      setSaveIssues([]);
    } catch {
      setSaveIssues([
        "Clipboard copy failed. Use Export Package JSON as the fallback local handoff.",
      ]);
      setPacketMessage("");
    }
  }

  function importPackageJson(rawJson: string, sourceLabel: string) {
    const trimmed = rawJson.trim();

    if (!trimmed) {
      setImportIssues(["Selected import file is empty."]);
      setImportMessage("");
      return;
    }

    if (new Blob([rawJson]).size > maxPackageImportBytes) {
      setImportIssues(["Content package imports must be 200 KB or smaller."]);
      setImportMessage("");
      return;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      setImportIssues([`${sourceLabel} is not valid JSON.`]);
      setImportMessage("");
      return;
    }

    const importedValues = Array.isArray(parsed) ? parsed : [parsed];

    if (importedValues.length > 20) {
      setImportIssues(["Import at most 20 content packages at a time."]);
      setImportMessage("");
      return;
    }

    const shapeIssues = importedValues.flatMap((value, index) =>
      isLocalContentPackageRecord(value)
        ? []
        : [`contentPackageImport[${index}] is not a valid content package export.`],
    );

    if (shapeIssues.length > 0) {
      setImportIssues(shapeIssues);
      setImportMessage("");
      return;
    }

    const importedRecords = importedValues as LocalContentPackageRecord[];
    const safetyIssues = issueText(importedRecords, "contentPackageImport");

    if (safetyIssues.length > 0) {
      setImportIssues(safetyIssues);
      setImportMessage("");
      return;
    }

    const knownPackageIds = new Set(
      records.map((record) => record.contentPackage.id),
    );
    let copyCount = 0;
    const normalizedRecords = importedRecords.map((record) => {
      if (!knownPackageIds.has(record.contentPackage.id)) {
        knownPackageIds.add(record.contentPackage.id);
        return record;
      }

      const copiedRecord = createImportedPackageCopy(record);
      knownPackageIds.add(copiedRecord.contentPackage.id);
      copyCount += 1;
      return copiedRecord;
    });
    const nextRecords = [...normalizedRecords, ...records];

    if (persistRecords(nextRecords)) {
      setImportFileName(sourceLabel);
      setImportIssues([]);
      setImportMessage(
        `Imported ${normalizedRecords.length} content package record${
          normalizedRecords.length === 1 ? "" : "s"
        } from ${sourceLabel}${
          copyCount > 0
            ? `; ${copyCount} duplicate ID${copyCount === 1 ? "" : "s"} saved as imported copies.`
            : "."
        }`,
      );
      setSaveIssues([]);
      setSaveMessage("");
    }
  }

  function openImportFilePicker() {
    importFileInputRef.current?.click();
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setImportFileName(file.name);
    setImportIssues([]);
    setImportMessage("");

    const isJsonFile =
      file.type === "application/json" ||
      file.name.toLowerCase().endsWith(".json");

    if (!isJsonFile) {
      setImportIssues(["Choose a .json file exported from Export Package."]);
      setImportMessage("");
      return;
    }

    if (file.size > maxPackageImportBytes) {
      setImportIssues(["Content package imports must be 200 KB or smaller."]);
      setImportMessage("");
      return;
    }

    try {
      const rawJson = await file.text();
      importPackageJson(rawJson, file.name);
    } catch {
      setImportIssues([`Could not read ${file.name}. Choose a local JSON export.`]);
      setImportMessage("");
    }
  }

  function saveContentPackage() {
    const baseIssues: string[] = [];

    if (!sourceTitle.trim()) {
      baseIssues.push("Source update title is required.");
    }

    if (!sourceSummary.trim()) {
      baseIssues.push("Source update summary is required.");
    }

    if (selectedTargets.length === 0) {
      baseIssues.push("Select at least one publication target.");
    }

    const blockedSelectedTargets = selectedTargets.filter(targetIsBlocked);

    if (blockedSelectedTargets.length > 0) {
      baseIssues.push(
        `Blocked targets cannot be saved: ${blockedSelectedTargets
          .map((target) => target.accountName)
          .join(", ")}.`,
      );
    }

    if (draftSlots.length === 0) {
      baseIssues.push("Generate or manually add at least one draft slot.");
    }

    const blockedDraftTargets = draftSlots
      .map((slot) =>
        publicationTargets.find((item) => item.id === slot.targetId),
      )
      .filter((target): target is PublicationTarget =>
        Boolean(target && targetIsBlocked(target)),
      );

    if (blockedDraftTargets.length > 0) {
      baseIssues.push(
        `Draft slots include blocked targets: ${blockedDraftTargets
          .map((target) => target.accountName)
          .join(", ")}.`,
      );
    }

    if (baseIssues.length > 0) {
      setSaveIssues(baseIssues);
      setSaveMessage("");
      return;
    }

    const idSuffix = nowId();
    const packageSlug = slugify(sourceTitle);
    const sourceUpdateId = `source-update-${packageSlug}-${idSuffix}`;
    const contentPackageId = `content-package-${packageSlug}-${idSuffix}`;
    const createdAt = new Date().toISOString();
    const sourceUpdate: SourceUpdate = {
      approvalRequired: true,
      createdAt,
      id: sourceUpdateId,
      notes: sourceNotes
        .split(/\r?\n/)
        .map((note) => note.trim())
        .filter(Boolean),
      projectId: primaryProjectId,
      sourceBoundary:
        "Metadata-only business/product update. No PHI, clinical payloads, credentials, private messages, or raw logs.",
      sourceDate,
      summary: sourceSummary,
      title: sourceTitle,
      updateType: sourceType,
    };
    const contentPackage: ContentPackage = {
      approvalRequired: true,
      createdAt,
      id: contentPackageId,
      notes: [
        "Local/mock content package",
        "Manual approval required before posting",
        "No AI or posting API is connected",
      ],
      projectIds: selectedProjectIds,
      publicationTargetIds: selectedTargets.map((target) => target.id),
      sourceUpdateId,
      status: "drafting",
      title: sourceTitle,
      updatedAt: createdAt,
    };
    const platformDrafts = draftSlots.map((slot, index): PlatformDraft => {
      const target =
        publicationTargets.find((item) => item.id === slot.targetId) ??
        selectedTargets[0];
      const campaign = campaignName(sourceTitle, target);
      const content = `${target.id}_${index + 1}`;
      const generatedUrl = buildUtmForTarget(target, campaign, content);
      const body =
        slot.body.trim() ||
        draftTemplateBody({
          campaign,
          destinationUrl: generatedUrl,
          sourceSummary,
          sourceTitle,
          target,
        });

      return {
        accountName: target.accountName,
        approvalRequired: true,
        body,
        contentPackageId,
        generatedUrl,
        id: `platform-draft-${packageSlug}-${target.id}-${index + 1}-${idSuffix}`,
        platform: target.platform,
        projectId: target.projectId ?? primaryProjectId,
        publicationTargetId: target.id,
        safetyNotes: [
          "Manual approval required before posting",
          "No PHI, private identifiers, credentials, or raw logs",
          "No posting API is connected",
        ],
        sourceUpdateId,
        status: slot.status,
        title: slot.title || sourceTitle,
        updatedAt: createdAt,
        utmCampaignId: `utm-${packageSlug}-${target.id}-${index + 1}-${idSuffix}`,
      };
    });
    const publishedPosts = platformDrafts.map(
      (draft): PublishedPost => ({
        id: `published-post-${draft.id}`,
        manualNotes: ["Track URL only after manual posting"],
        platformDraftId: draft.id,
        publicationTargetId: draft.publicationTargetId,
        status: "not posted",
      }),
    );
    const performanceSnapshots = publishedPosts.map(
      (post): PerformanceSnapshot => ({
        capturedAt: sourceDate,
        clicks: "0",
        comments: "0",
        id: `performance-${post.id}`,
        impressions: "0",
        notes: ["Manual metrics only"],
        publishedPostId: post.id,
        reactions: "0",
        saves: "0",
        source: "manual",
      }),
    );
    const businessOutcome: BusinessOutcome = {
      capturedAt: sourceDate,
      contentPackageId,
      conversations: "0",
      id: `outcome-${contentPackageId}`,
      leads: "0",
      notes: ["Aggregate outcomes only"],
      revenue: "$0",
      source: "manual",
    };
    const record: LocalContentPackageRecord = {
      businessOutcome,
      contentPackage,
      performanceSnapshots,
      platformDrafts,
      publishedPosts,
      sourceUpdate,
    };
    const nextRecords = [record, ...records];

    if (persistRecords(nextRecords)) {
      setSaveMessage("Content package saved locally after metadata-only validation.");
    }
  }

  function updateRecord(recordId: string, patch: Partial<LocalContentPackageRecord>) {
    const nextRecords = records.map((record) =>
      record.contentPackage.id === recordId ? { ...record, ...patch } : record,
    );

    persistRecords(nextRecords);
  }

  function updatePublishedPost(
    record: LocalContentPackageRecord,
    postId: string,
    patch: Partial<PublishedPost>,
  ) {
    const nextPosts = record.publishedPosts.map((post) =>
      post.id === postId ? { ...post, ...patch } : post,
    );

    const invalidUrl = nextPosts.find(
      (post) => post.postUrl && !validPostUrl(post.postUrl),
    );

    if (invalidUrl) {
      setSaveIssues(["Published URL must be blank or an http/https URL."]);
      setSaveMessage("");
      return;
    }

    updateRecord(record.contentPackage.id, { publishedPosts: nextPosts });
  }

  function updatePerformanceSnapshot(
    record: LocalContentPackageRecord,
    snapshotId: string,
    patch: Partial<PerformanceSnapshot>,
  ) {
    updateRecord(record.contentPackage.id, {
      performanceSnapshots: record.performanceSnapshots.map((snapshot) =>
        snapshot.id === snapshotId ? { ...snapshot, ...patch } : snapshot,
      ),
    });
  }

  function updateBusinessOutcome(
    record: LocalContentPackageRecord,
    patch: Partial<BusinessOutcome>,
  ) {
    updateRecord(record.contentPackage.id, {
      businessOutcome: { ...record.businessOutcome, ...patch },
    });
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <FilePlus2 className="h-4 w-4" />
            Source Update
          </div>
          <h2 className="mt-1 font-sans text-base font-semibold text-slate-950">
            Enter One Metadata-Only Update
          </h2>
        </div>
        <div className="grid gap-5 p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Primary product
              <select
                value={primaryProjectId}
                onChange={(event) =>
                  setPrimaryProjectId(event.target.value as OpsProjectId)
                }
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Update type
              <select
                value={sourceType}
                onChange={(event) =>
                  setSourceType(event.target.value as SourceUpdateType)
                }
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              >
                {sourceUpdateTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Source date
              <input
                value={sourceDate}
                onChange={(event) => setSourceDate(event.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                type="date"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Title
            <input
              value={sourceTitle}
              onChange={(event) => setSourceTitle(event.target.value)}
              placeholder="Example: SyncSOAP beta positioning update"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Source update summary
            <textarea
              value={sourceSummary}
              onChange={(event) => setSourceSummary(event.target.value)}
              placeholder="Business/product update only. Do not paste PHI, transcripts, identifiers, private messages, credentials, or raw logs."
              className="min-h-28 rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-800"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Internal notes
            <textarea
              value={sourceNotes}
              onChange={(event) => setSourceNotes(event.target.value)}
              placeholder="One note per line. Metadata-only planning notes."
              className="min-h-20 rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-800"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Upload className="h-4 w-4" />
            Import Package
          </div>
          <h2 className="mt-1 font-sans text-base font-semibold text-slate-950">
            Import An Exported Package JSON File
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose the JSON file downloaded by Export Package. Imports are
            validated before rendering and saved only to this browser.
          </p>
        </div>
        <div className="grid gap-4 p-5">
          <input
            ref={importFileInputRef}
            onChange={(event) => void handleImportFileChange(event)}
            type="file"
            accept=".json,application/json"
            className="hidden"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={openImportFilePicker}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <Upload className="h-4 w-4" />
              Import Package
            </button>
            <p className="text-sm text-slate-500">
              Opens a local file picker for .json files. Duplicate package IDs
              are saved as imported copies instead of replacing existing rows.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {importFileName
              ? `Last selected file: ${importFileName}`
              : "No import file selected yet."}
          </div>
          {importMessage ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {importMessage}
            </div>
          ) : null}
          {importIssues.length > 0 ? (
            <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <div className="flex items-start gap-3 font-medium">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                Import failed before rendering or saving.
              </div>
              <ul className="space-y-2">
                {importIssues.slice(0, 12).map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-sans text-base font-semibold text-slate-950">
            Weekly Content Queue
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Derived from saved local content packages. It shows what is ready,
            not posted, posted, and missing manual performance metrics.
          </p>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-4">
          {(
            [
              ["ready", weeklyQueueGroups.ready],
              ["not posted", weeklyQueueGroups["not posted"]],
              ["posted", weeklyQueueGroups.posted],
              ["missing metrics", weeklyQueueGroups["missing metrics"]],
            ] as const
          ).map(([state, rows]) => (
            <div
              key={state}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-sans text-sm font-semibold capitalize text-slate-950">
                  {state}
                </h3>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                  {rows.length}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {rows.length === 0 ? (
                  <p className="text-sm leading-6 text-slate-500">
                    No drafts in this queue.
                  </p>
                ) : (
                  rows.slice(0, 6).map((row) => (
                    <article
                      key={`${state}-${row.draftId}`}
                      className="rounded-md border border-slate-200 bg-white p-3"
                    >
                      <div className="text-sm font-semibold text-slate-950">
                        {row.title}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {row.accountName} / {row.platform}
                      </div>
                      <div className="mt-2 break-all font-mono text-[11px] leading-5 text-slate-500">
                        {row.url}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-sans text-base font-semibold text-slate-950">
            Select Products, Accounts, And Platforms
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Targets are manual-only publication destinations. No posting or ad
            spend API is connected.
          </p>
        </div>
        <div className="grid gap-3 p-5 lg:grid-cols-2">
          {publicationTargets.map((target) => {
            const blocked = targetIsBlocked(target);

            return (
              <label
                key={target.id}
                className={`flex gap-3 rounded-lg border border-slate-200 p-4 text-sm ${
                  blocked
                    ? "cursor-not-allowed bg-slate-100 text-slate-500"
                    : "cursor-pointer bg-slate-50"
                }`}
              >
                <input
                  checked={selectedTargetIds.includes(target.id)}
                  disabled={blocked}
                  onChange={() => toggleTarget(target.id)}
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block font-semibold text-slate-950">
                    {target.accountName}
                  </span>
                  <span className="mt-1 block text-slate-600">
                    {target.platform} / {target.audience} / {target.publicHandle}
                  </span>
                  {blocked ? (
                    <span className="mt-2 inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                      {target.accountStatus}
                    </span>
                  ) : null}
                  <span className="mt-2 block text-xs leading-5 text-slate-500">
                    {target.sourceBoundary}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-sans text-base font-semibold text-slate-950">
              Platform-Specific Draft Slots
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Generate deterministic slots from the update, or add blank slots
              manually. This is not AI generation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateDraftSlots}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <ClipboardCheck className="h-4 w-4" />
              Generate Slots
            </button>
            <button
              type="button"
              onClick={addBlankDraftSlot}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Blank Slot
            </button>
          </div>
        </div>
        <div className="grid gap-4 p-5">
          {draftSlots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              Select targets, then generate or add draft slots.
            </div>
          ) : (
            draftSlots.map((slot) => {
              const target =
                publicationTargets.find((item) => item.id === slot.targetId) ??
                publicationTargets[0];

              return (
                <article
                  key={slot.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
                    <div className="grid gap-4">
                      <label className="grid gap-2 text-sm font-semibold text-slate-700">
                        Target
                        <select
                          value={slot.targetId}
                          onChange={(event) =>
                            updateDraftSlot(slot.id, {
                              targetId: event.target.value,
                            })
                          }
                          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                        >
                          {publicationTargets.map((item) => (
                            <option
                              key={item.id}
                              value={item.id}
                              disabled={targetIsBlocked(item)}
                            >
                              {item.accountName} / {item.platform}
                              {targetIsBlocked(item)
                                ? ` / ${item.accountStatus}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-700">
                        Status
                        <select
                          value={slot.status}
                          onChange={(event) =>
                            updateDraftSlot(slot.id, {
                              status: event.target.value as PlatformDraftStatus,
                            })
                          }
                          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                        >
                          {[
                            "slot",
                            "drafted",
                            "needs review",
                            "approved",
                            "posted",
                            "archived",
                          ].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
                        UTM destination: {target?.defaultDestinationUrl}
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <label className="grid gap-2 text-sm font-semibold text-slate-700">
                        Draft title
                        <input
                          value={slot.title}
                          onChange={(event) =>
                            updateDraftSlot(slot.id, { title: event.target.value })
                          }
                          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-700">
                        Draft body
                        <textarea
                          value={slot.body}
                          onChange={(event) =>
                            updateDraftSlot(slot.id, { body: event.target.value })
                          }
                          className="min-h-36 rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-800"
                        />
                      </label>
                    </div>
                  </div>
                </article>
              );
            })
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={saveContentPackage}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <Save className="h-4 w-4" />
              Save Locally
            </button>
            <p className="text-sm text-slate-500">
              Saves to this browser only after metadata-only validation.
            </p>
          </div>

          {saveMessage ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {saveMessage}
            </div>
          ) : null}

          {saveIssues.length > 0 ? (
            <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <div className="flex items-start gap-3 font-medium">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                Fix these before saving or updating.
              </div>
              <ul className="space-y-2">
                {saveIssues.slice(0, 12).map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-sans text-base font-semibold text-slate-950">
            Saved Local Content Packages
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Track posted/not posted state, post URLs, manual performance
            snapshots, and business outcomes locally.
          </p>
        </div>
        <div className="grid gap-5 p-5">
          {packetMessage ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {packetMessage}
            </div>
          ) : null}

          {records.map((record) => (
            <article
              key={record.contentPackage.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-sans text-lg font-semibold text-slate-950">
                    {record.contentPackage.title}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    {record.sourceUpdate.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => exportPackage(record)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Export Package
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyPostPacket(record)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Post Packet
                  </button>
                  <select
                    value={record.contentPackage.status}
                    onChange={(event) =>
                      updateRecord(record.contentPackage.id, {
                        contentPackage: {
                          ...record.contentPackage,
                          status: event.target.value as ContentPackageStatus,
                          updatedAt: new Date().toISOString(),
                        },
                      })
                    }
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
                  >
                    {packageStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {record.platformDrafts.map((draft) => {
                  const post = record.publishedPosts.find(
                    (item) => item.platformDraftId === draft.id,
                  );
                  const snapshot = post
                    ? record.performanceSnapshots.find(
                        (item) => item.publishedPostId === post.id,
                      )
                    : undefined;

                  return (
                    <div
                      key={draft.id}
                      className="rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-slate-500" />
                            <h4 className="font-sans text-base font-semibold text-slate-950">
                              {draft.accountName} / {draft.platform}
                            </h4>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {draft.body}
                          </p>
                          <p className="mt-3 break-all font-mono text-xs leading-5 text-slate-500">
                            {draft.generatedUrl}
                          </p>
                        </div>

                        <div className="grid gap-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-2 text-sm font-semibold text-slate-700">
                              Posted state
                              <select
                                value={post?.status ?? "not posted"}
                                onChange={(event) =>
                                  post
                                    ? updatePublishedPost(record, post.id, {
                                        postedManuallyAt:
                                          event.target.value === "posted"
                                            ? new Date().toISOString()
                                            : undefined,
                                        status: event.target
                                          .value as PublishedPostStatus,
                                      })
                                    : undefined
                                }
                                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                              >
                                {["not posted", "posted", "archived"].map(
                                  (status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>

                            <label className="grid gap-2 text-sm font-semibold text-slate-700">
                              Published URL
                              <input
                                value={post?.postUrl ?? ""}
                                onChange={(event) =>
                                  post
                                    ? updatePublishedPost(record, post.id, {
                                        postUrl: event.target.value,
                                      })
                                    : undefined
                                }
                                placeholder="https://..."
                                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                              />
                            </label>
                          </div>

                          {snapshot ? (
                            <div className="grid gap-3 sm:grid-cols-5">
                              {(
                                [
                                  "impressions",
                                  "clicks",
                                  "reactions",
                                  "comments",
                                  "saves",
                                ] as const
                              ).map((field) => (
                                <label
                                  key={field}
                                  className="grid gap-2 text-xs font-semibold capitalize text-slate-600"
                                >
                                  {field}
                                  <input
                                    value={snapshot[field]}
                                    onChange={(event) =>
                                      updatePerformanceSnapshot(record, snapshot.id, {
                                        [field]: event.target.value,
                                      })
                                    }
                                    className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
                                  />
                                </label>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="font-sans text-sm font-semibold text-slate-950">
                  Business Outcome
                </h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {(["leads", "conversations", "revenue"] as const).map((field) => (
                    <label
                      key={field}
                      className="grid gap-2 text-sm font-semibold capitalize text-slate-700"
                    >
                      {field}
                      <input
                        value={record.businessOutcome[field]}
                        onChange={(event) =>
                          updateBusinessOutcome(record, {
                            [field]: event.target.value,
                          })
                        }
                        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
