import { NextResponse, type NextRequest } from "next/server";

import { getOpsAiPublicStatus, requireOpsAiGeneration } from "@/lib/ops/ai-config";
import { validateSeriesSplitRequest } from "@/lib/ops/ai-series-context";
import { generateOpsAiSeriesSplit } from "@/lib/ops/ai-series-split";
import { saveOpsAiRunRecord } from "@/lib/ops/ai-runs-db";
import {
  collectAiSafetyIssues,
  formatAiSafetyIssues,
} from "@/lib/ops/ai-safety";
import { opsDashboardData } from "@/lib/ops/mock-data";
import type { OpsAiProvider, OpsAiRunRecord } from "@/lib/ops/types";

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

function configuredProvider(): Exclude<OpsAiProvider, "none"> {
  const status = getOpsAiPublicStatus();
  return status.provider === "none" ? "openai" : status.provider;
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

  const requestBody = (await request.json()) as Record<string, unknown>;
  const {
    audienceProfiles,
    brandProfiles,
    draftReviewChecklist,
    publicationTargets,
  } = opsDashboardData;

  const validated = validateSeriesSplitRequest({
    audienceProfiles,
    brandProfiles,
    draftReviewChecklist,
    publicationTargets,
    request: requestBody,
  });

  if (!validated.context) {
    const runId = `ai-run-${nowId()}`;
    const runRecord: OpsAiRunRecord = {
      completionTokens: 0,
      contentPackageId: "series-unknown",
      createdAt: new Date().toISOString(),
      estimatedCostUsd: "0.000000",
      id: runId,
      inputSafetyResult: "fail",
      model: publicStatus.model ?? "unknown",
      notes: ["Allowlisted series split request rejected before provider call."],
      outputSafetyResult: "skipped",
      platformCount: 0,
      promptTokens: 0,
      provider: configuredProvider(),
      safetyIssues: validated.issues,
      sourceBoundary:
        "BringhurstDO Ops metadata-only AI weekly summary series split request.",
      status: "blocked_input",
      totalTokens: 0,
    };

    await saveOpsAiRunRecord(runRecord).catch(() => undefined);

    return jsonNoStore(
      {
        error: "Ops AI series split input rejected before generation.",
        issues: validated.issues,
        runId,
      },
      400,
    );
  }

  const context = validated.context;
  const inputIssues = formatAiSafetyIssues(
    collectAiSafetyIssues(context, "aiSeriesContext"),
  );

  if (inputIssues.length > 0) {
    const runId = `ai-run-${nowId()}`;
    const runRecord: OpsAiRunRecord = {
      contentPackageId: context.series.id,
      createdAt: new Date().toISOString(),
      id: runId,
      inputSafetyResult: "fail",
      model: publicStatus.model ?? "unknown",
      notes: ["Allowlisted series context failed metadata-only safety validation."],
      outputSafetyResult: "skipped",
      platformCount: context.slots.length,
      provider: configuredProvider(),
      safetyIssues: inputIssues,
      sourceBoundary:
        "BringhurstDO Ops metadata-only AI weekly summary series split request.",
      status: "blocked_input",
    };

    await saveOpsAiRunRecord(runRecord).catch(() => undefined);

    return jsonNoStore(
      {
        error: "Ops AI series context failed safety validation.",
        issues: inputIssues,
        runId,
      },
      400,
    );
  }

  const runId = `ai-run-${nowId()}`;

  try {
    const { apiKey, model, provider } = requireOpsAiGeneration();
    const generated = await generateOpsAiSeriesSplit({
      apiKey,
      context,
      model,
      provider,
    });
    const outputIssues = formatAiSafetyIssues(
      collectAiSafetyIssues(generated.proposals, "aiSeriesProposals"),
    );

    if (outputIssues.length > 0) {
      const runRecord: OpsAiRunRecord = {
        completionTokens: generated.completionTokens,
        contentPackageId: context.series.id,
        createdAt: new Date().toISOString(),
        estimatedCostUsd: generated.estimatedCostUsd,
        id: runId,
        inputSafetyResult: "pass",
        model,
        notes: ["AI series output blocked before returning proposals to the operator."],
        outputSafetyResult: "fail",
        platformCount: generated.proposals.length,
        promptTokens: generated.promptTokens,
        provider,
        safetyIssues: outputIssues,
        sourceBoundary:
          "BringhurstDO Ops metadata-only AI weekly summary series split request.",
        status: "blocked_output",
        totalTokens: generated.totalTokens,
      };

      await saveOpsAiRunRecord(runRecord).catch(() => undefined);

      return jsonNoStore(
        {
          error: "Ops AI series output failed safety validation.",
          issues: outputIssues,
          runId,
        },
        400,
      );
    }

    const runRecord: OpsAiRunRecord = {
      completionTokens: generated.completionTokens,
      contentPackageId: context.series.id,
      createdAt: new Date().toISOString(),
      estimatedCostUsd: generated.estimatedCostUsd,
      id: runId,
      inputSafetyResult: "pass",
      model,
      notes: [
        "Series proposals returned for manual review. No draft text was auto-saved.",
      ],
      outputSafetyResult: "pass",
      platformCount: generated.proposals.length,
      promptTokens: generated.promptTokens,
      provider,
      safetyIssues: [],
      sourceBoundary:
        "BringhurstDO Ops metadata-only AI weekly summary series split request.",
      status: "success",
      totalTokens: generated.totalTokens,
    };

    await saveOpsAiRunRecord(runRecord).catch(() => undefined);

    return jsonNoStore({
      manualReviewRequired: true,
      model,
      proposals: generated.proposals,
      provider,
      runId,
      seriesId: generated.seriesId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ops AI series split failed.";

    const runRecord: OpsAiRunRecord = {
      contentPackageId: context.series.id,
      createdAt: new Date().toISOString(),
      id: runId,
      inputSafetyResult: "pass",
      model: publicStatus.model ?? "unknown",
      notes: [message],
      outputSafetyResult: "skipped",
      platformCount: context.slots.length,
      provider: configuredProvider(),
      safetyIssues: [],
      sourceBoundary:
        "BringhurstDO Ops metadata-only AI weekly summary series split request.",
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
