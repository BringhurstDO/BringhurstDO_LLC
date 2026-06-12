import { NextResponse, type NextRequest } from "next/server";

import { buildOpsAiImproveContext } from "@/lib/ops/ai-context";
import { getOpsAiPublicStatus, requireOpsAiGeneration } from "@/lib/ops/ai-config";
import { generateOpsAiImprovedDrafts } from "@/lib/ops/ai-improve";
import { saveOpsAiRunRecord } from "@/lib/ops/ai-runs-db";
import {
  collectAiSafetyIssues,
  formatAiSafetyIssues,
} from "@/lib/ops/ai-safety";
import { validateOpsContentPackageRecords } from "@/lib/ops/persistence-validation";
import type {
  OpsAiImproveDraftsResponse,
  OpsAiRunRecord,
  OpsAudienceProfile,
  OpsBrandProfile,
  PublicationTarget,
} from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: NextRequest) {
  const publicStatus = getOpsAiPublicStatus();

  if (!publicStatus.enabled) {
    return jsonNoStore(
      {
        error: "Ops AI generation is disabled.",
        reason: publicStatus.disabledReason,
      },
      503,
    );
  }

  const payload = (await request.json()) as {
    audienceProfiles?: OpsAudienceProfile[];
    brandProfiles?: OpsBrandProfile[];
    draftReviewChecklist?: string[];
    publicationTargets?: PublicationTarget[];
    record?: unknown;
  };

  const validation = validateOpsContentPackageRecords(
    payload.record ? [payload.record] : [],
    "aiImproveDrafts.record",
  );

  if (!validation.ok) {
    const runId = `ai-run-${nowId()}`;
    const safetyIssues = validation.issues;
    const runRecord: OpsAiRunRecord = {
      completionTokens: 0,
      contentPackageId: "unknown",
      createdAt: new Date().toISOString(),
      estimatedCostUsd: "0.000000",
      id: runId,
      inputSafetyResult: "fail",
      model: publicStatus.model ?? "unknown",
      notes: ["Input rejected before AI provider call."],
      outputSafetyResult: "skipped",
      platformCount: 0,
      promptTokens: 0,
      provider: "openai",
      safetyIssues,
      sourceBoundary:
        "BringhurstDO Ops metadata-only AI draft improvement request.",
      status: "blocked_input",
      totalTokens: 0,
    };

    await saveOpsAiRunRecord(runRecord).catch(() => undefined);

    return jsonNoStore(
      {
        error: "Ops AI input rejected before generation.",
        issues: safetyIssues,
        runId,
      },
      400,
    );
  }

  const record = validation.records[0];
  const brandProfiles = Array.isArray(payload.brandProfiles)
    ? payload.brandProfiles
    : [];
  const audienceProfiles = Array.isArray(payload.audienceProfiles)
    ? payload.audienceProfiles
    : [];
  const publicationTargets = Array.isArray(payload.publicationTargets)
    ? payload.publicationTargets
    : [];
  const draftReviewChecklist = Array.isArray(payload.draftReviewChecklist)
    ? payload.draftReviewChecklist.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];

  const context = buildOpsAiImproveContext({
    audienceProfiles,
    brandProfiles,
    draftReviewChecklist,
    publicationTargets,
    record,
  });
  const inputIssues = formatAiSafetyIssues(collectAiSafetyIssues(context, "aiContext"));

  if (inputIssues.length > 0) {
    const runId = `ai-run-${nowId()}`;
    const runRecord: OpsAiRunRecord = {
      contentPackageId: record.contentPackage.id,
      createdAt: new Date().toISOString(),
      id: runId,
      inputSafetyResult: "fail",
      model: publicStatus.model ?? "unknown",
      notes: ["AI context failed metadata-only safety validation."],
      outputSafetyResult: "skipped",
      platformCount: record.platformDrafts.length,
      provider: "openai",
      safetyIssues: inputIssues,
      sourceBoundary:
        "BringhurstDO Ops metadata-only AI draft improvement request.",
      status: "blocked_input",
    };

    await saveOpsAiRunRecord(runRecord).catch(() => undefined);

    return jsonNoStore(
      {
        error: "Ops AI context failed safety validation.",
        issues: inputIssues,
        runId,
      },
      400,
    );
  }

  const runId = `ai-run-${nowId()}`;

  try {
    const { apiKey, model } = requireOpsAiGeneration();
    const generated = await generateOpsAiImprovedDrafts({
      apiKey,
      context,
      model,
    });
    const outputIssues = formatAiSafetyIssues(
      collectAiSafetyIssues(generated.proposals, "aiProposals"),
    );

    if (outputIssues.length > 0) {
      const runRecord: OpsAiRunRecord = {
        completionTokens: generated.completionTokens,
        contentPackageId: record.contentPackage.id,
        createdAt: new Date().toISOString(),
        estimatedCostUsd: generated.estimatedCostUsd,
        id: runId,
        inputSafetyResult: "pass",
        model,
        notes: ["AI output blocked before returning proposals to the operator."],
        outputSafetyResult: "fail",
        platformCount: generated.proposals.length,
        promptTokens: generated.promptTokens,
        provider: "openai",
        safetyIssues: outputIssues,
        sourceBoundary:
          "BringhurstDO Ops metadata-only AI draft improvement request.",
        status: "blocked_output",
        totalTokens: generated.totalTokens,
      };

      await saveOpsAiRunRecord(runRecord).catch(() => undefined);

      return jsonNoStore(
        {
          error: "Ops AI output failed safety validation.",
          issues: outputIssues,
          runId,
        },
        400,
      );
    }

    const runRecord: OpsAiRunRecord = {
      completionTokens: generated.completionTokens,
      contentPackageId: record.contentPackage.id,
      createdAt: new Date().toISOString(),
      estimatedCostUsd: generated.estimatedCostUsd,
      id: runId,
      inputSafetyResult: "pass",
      model,
      notes: [
        "Proposals returned for manual review. No draft text was auto-saved.",
      ],
      outputSafetyResult: "pass",
      platformCount: generated.proposals.length,
      promptTokens: generated.promptTokens,
      provider: "openai",
      safetyIssues: [],
      sourceBoundary:
        "BringhurstDO Ops metadata-only AI draft improvement request.",
      status: "success",
      totalTokens: generated.totalTokens,
    };

    await saveOpsAiRunRecord(runRecord).catch(() => undefined);

    const response: OpsAiImproveDraftsResponse = {
      manualReviewRequired: true,
      model,
      proposals: generated.proposals,
      provider: "openai",
      runId,
    };

    return jsonNoStore(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ops AI generation failed.";

    const runRecord: OpsAiRunRecord = {
      contentPackageId: record.contentPackage.id,
      createdAt: new Date().toISOString(),
      id: runId,
      inputSafetyResult: "pass",
      model: publicStatus.model ?? "unknown",
      notes: [message],
      outputSafetyResult: "skipped",
      platformCount: record.platformDrafts.length,
      provider: "openai",
      safetyIssues: [],
      sourceBoundary:
        "BringhurstDO Ops metadata-only AI draft improvement request.",
      status: "error",
    };

    await saveOpsAiRunRecord(runRecord).catch(() => undefined);

    return jsonNoStore(
      {
        error: message,
        runId,
      },
      502,
    );
  }
}
