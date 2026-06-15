import { NextResponse, type NextRequest } from "next/server";

import { getOpsAiPublicStatus, requireOpsAiGeneration } from "@/lib/ops/ai-config";
import { generateOpsAiSeriesPlan } from "@/lib/ops/ai-series-plan";
import { estimateSeriesPlanHeuristic } from "@/lib/ops/series-plan-heuristic";
import { collectAiSafetyIssues, formatAiSafetyIssues } from "@/lib/ops/ai-safety";
import { opsDashboardData } from "@/lib/ops/mock-data";
import type { OpsAiProvider } from "@/lib/ops/types";

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

function configuredProvider(): Exclude<OpsAiProvider, "none"> {
  const status = getOpsAiPublicStatus();
  return status.provider === "none" ? "openai" : status.provider;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const publicStatus = getOpsAiPublicStatus();
  const requestBody = (await request.json()) as Record<string, unknown>;
  const { publicationTargets } = opsDashboardData;

  if (!isRecord(requestBody)) {
    return jsonNoStore({ error: "Request body must be an object." }, 400);
  }

  const summary =
    typeof requestBody.seriesSummary === "string"
      ? requestBody.seriesSummary.trim()
      : "";
  const title =
    typeof requestBody.seriesTitle === "string"
      ? requestBody.seriesTitle.trim()
      : "Weekly summary";
  const updateType =
    typeof requestBody.updateType === "string"
      ? requestBody.updateType.trim()
      : "weekly-review";

  const rawTargetIds = requestBody.publicationTargetIds;
  const publicationTargetIds = Array.isArray(rawTargetIds)
    ? rawTargetIds.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
    : [];

  const issues: string[] = [];

  if (!summary) {
    issues.push("seriesSummary is required.");
  }

  if (summary.length > 12_000) {
    issues.push("seriesSummary must be 12,000 characters or fewer.");
  }

  if (publicationTargetIds.length === 0) {
    issues.push("Select at least one publication target.");
  }

  const selectedTargets = publicationTargetIds
    .map((id) => publicationTargets.find((target) => target.id === id))
    .filter((target) => target !== undefined);

  if (selectedTargets.length !== publicationTargetIds.length) {
    issues.push("One or more publication targets are unknown.");
  }

  if (issues.length > 0) {
    return jsonNoStore(
      {
        error: "Series plan input rejected.",
        issues,
      },
      400,
    );
  }

  const targetCount = selectedTargets.length;
  const context = {
    excludedData:
      "No PHI, patient identifiers, encounter text, transcripts, clinical payloads, credentials, or private messages.",
    summary,
    targetCount,
    title,
    updateType,
  };

  const inputIssues = formatAiSafetyIssues(
    collectAiSafetyIssues(context, "aiSeriesPlanContext"),
  );

  if (inputIssues.length > 0) {
    return jsonNoStore(
      {
        error: "Series plan input failed safety validation.",
        issues: inputIssues,
      },
      400,
    );
  }

  if (!publicStatus.enabled) {
    const plan = estimateSeriesPlanHeuristic(summary, targetCount);
    return jsonNoStore({
      manualReviewRequired: true,
      model: "heuristic",
      plan,
      provider: "none",
    });
  }

  try {
    const { apiKey, model, provider } = requireOpsAiGeneration();
    const generated = await generateOpsAiSeriesPlan({
      apiKey,
      context,
      model,
      provider,
    });

    return jsonNoStore({
      manualReviewRequired: true,
      model,
      plan: generated.plan,
      provider: configuredProvider(),
    });
  } catch (error) {
    const plan = estimateSeriesPlanHeuristic(summary, targetCount);
    const message =
      error instanceof Error ? error.message : "Ops AI series plan failed.";

    return jsonNoStore({
      manualReviewRequired: true,
      model: "heuristic",
      plan,
      provider: "none",
      warning: message,
    });
  }
}
