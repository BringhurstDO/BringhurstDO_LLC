import "server-only";

import type { OpsAiPublicStatus } from "@/lib/ops/types";

export function getOpsAiPublicStatus(): OpsAiPublicStatus {
  const enabledFlag =
    process.env.OPS_AI_ENABLED?.trim().toLowerCase() === "true";
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPS_AI_MODEL?.trim() || "gpt-4o-mini";

  if (!enabledFlag) {
    return {
      disabledReason:
        "OPS_AI_ENABLED is not true. Set OPS_AI_ENABLED=true after explicit approval.",
      enabled: false,
      manualReviewRequired: true,
      model: null,
      provider: "none",
    };
  }

  if (!apiKey) {
    return {
      disabledReason:
        "OPENAI_API_KEY is not configured. Add a server-only key in Vercel or .env.local.",
      enabled: false,
      manualReviewRequired: true,
      model: null,
      provider: "none",
    };
  }

  return {
    disabledReason: null,
    enabled: true,
    manualReviewRequired: true,
    model,
    provider: "openai",
  };
}

export function requireOpsAiGeneration() {
  const status = getOpsAiPublicStatus();

  if (!status.enabled || !status.model) {
    throw new Error(status.disabledReason ?? "Ops AI generation is disabled.");
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return {
    apiKey,
    model: status.model,
    provider: "openai" as const,
  };
}
