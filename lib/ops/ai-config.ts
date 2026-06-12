import "server-only";

import type { OpsAiProvider, OpsAiPublicStatus } from "@/lib/ops/types";

export const GEMINI_FREE_TIER_WARNING =
  "Gemini free tier / Google AI Studio may review prompts to improve services. Only send public-safe marketing context from the allowlisted AI preview.";

function resolveProvider(): Exclude<OpsAiProvider, "none"> {
  const raw = process.env.OPS_AI_PROVIDER?.trim().toLowerCase();

  if (raw === "gemini") {
    return "gemini";
  }

  return "openai";
}

function defaultModel(provider: Exclude<OpsAiProvider, "none">) {
  const configured = process.env.OPS_AI_MODEL?.trim();

  if (configured) {
    return configured;
  }

  return provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini";
}

function providerApiKey(provider: Exclude<OpsAiProvider, "none">) {
  if (provider === "gemini") {
    return process.env.GEMINI_API_KEY?.trim() ?? "";
  }

  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

function providerKeyName(provider: Exclude<OpsAiProvider, "none">) {
  return provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
}

export function getOpsAiPublicStatus(): OpsAiPublicStatus {
  const enabledFlag =
    process.env.OPS_AI_ENABLED?.trim().toLowerCase() === "true";
  const provider = resolveProvider();
  const model = defaultModel(provider);
  const apiKey = providerApiKey(provider);

  if (!enabledFlag) {
    return {
      disabledReason:
        "OPS_AI_ENABLED is not true. Set OPS_AI_ENABLED=true after explicit approval.",
      enabled: false,
      manualReviewRequired: true,
      model: null,
      provider: "none",
      providerWarning: null,
    };
  }

  if (!apiKey) {
    return {
      disabledReason: `${providerKeyName(provider)} is not configured. Add a server-only key in Vercel or .env.local.`,
      enabled: false,
      manualReviewRequired: true,
      model: null,
      provider: "none",
      providerWarning: provider === "gemini" ? GEMINI_FREE_TIER_WARNING : null,
    };
  }

  return {
    disabledReason: null,
    enabled: true,
    manualReviewRequired: true,
    model,
    provider,
    providerWarning: provider === "gemini" ? GEMINI_FREE_TIER_WARNING : null,
  };
}

export function requireOpsAiGeneration() {
  const status = getOpsAiPublicStatus();

  if (!status.enabled || !status.model || status.provider === "none") {
    throw new Error(status.disabledReason ?? "Ops AI generation is disabled.");
  }

  const apiKey = providerApiKey(status.provider);

  if (!apiKey) {
    throw new Error(`${providerKeyName(status.provider)} is not configured.`);
  }

  return {
    apiKey,
    model: status.model,
    provider: status.provider,
  };
}
