"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

import { opsFetch } from "@/app/ops/_components/ops-fetch";
import type { OpsAiVisibleContext } from "@/lib/ops/ai-visible-context";
import { sanitizePublishableBody } from "@/lib/ops/publishable-copy";
import type {
  OpsAiImproveDraftsResponse,
  OpsAiImprovedDraftProposal,
  OpsAiPublicStatus,
} from "@/lib/ops/types";

type SinglePostAiEnhancerProps = {
  aiStatus: OpsAiPublicStatus;
  aiVisibleContext: OpsAiVisibleContext | null;
  onApply: (body: string) => void;
};

export function SinglePostAiEnhancer({
  aiStatus,
  aiVisibleContext,
  onApply,
}: SinglePostAiEnhancerProps) {
  const [issues, setIssues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [proposal, setProposal] =
    useState<OpsAiImprovedDraftProposal | null>(null);

  async function enhancePost() {
    if (!aiStatus.enabled) {
      setIssues([
        aiStatus.disabledReason ??
          "Ops AI is disabled. Configure the server-side AI provider first.",
      ]);
      return;
    }

    if (!aiVisibleContext) {
      setIssues(["Add a title and post text before enhancing with AI."]);
      return;
    }

    setLoading(true);
    setIssues([]);
    setMessage("");
    setProposal(null);

    try {
      const response = await opsFetch("/ops/api/ai/improve-drafts", {
        body: JSON.stringify({ aiVisibleContext }),
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as OpsAiImproveDraftsResponse & {
        error?: string;
        issues?: string[];
      };

      if (!response.ok) {
        setIssues(
          payload.issues?.length
            ? payload.issues
            : [payload.error ?? `AI enhancement failed with ${response.status}.`],
        );
        return;
      }

      const nextProposal = payload.proposals[0];

      if (!nextProposal) {
        setIssues(["The AI provider returned no usable post proposal."]);
        return;
      }

      setProposal(nextProposal);
      setMessage("AI proposal ready for review. Nothing has been applied yet.");
    } catch {
      setIssues(["AI enhancement request failed. Try again."]);
    } finally {
      setLoading(false);
    }
  }

  function applyProposal() {
    if (!proposal) {
      return;
    }

    onApply(sanitizePublishableBody(proposal.body));
    setProposal(null);
    setIssues([]);
    setMessage("Enhanced post text applied. Review it before saving.");
  }

  return (
    <div className="grid gap-3 border-t border-slate-200 pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">AI enhancement</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Uses public-safe brand context and selected destinations when
            available. You review the proposal before applying it.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || !aiStatus.enabled || !aiVisibleContext}
          onClick={() => void enhancePost()}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {loading ? "Enhancing..." : "Enhance with AI"}
        </button>
      </div>

      {proposal ? (
        <div className="grid gap-3 border-l-4 border-violet-400 bg-violet-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
            AI proposal
          </p>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
            {sanitizePublishableBody(proposal.body)}
          </p>
          <button
            type="button"
            onClick={applyProposal}
            className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Use enhanced version
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="flex items-start gap-2 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {message}
        </p>
      ) : null}

      {issues.length > 0 ? (
        <div className="flex items-start gap-2 text-sm leading-6 text-amber-900">
          <AlertTriangle className="mt-1 h-4 w-4 shrink-0" aria-hidden />
          <span>{issues.join(" ")}</span>
        </div>
      ) : null}
    </div>
  );
}
