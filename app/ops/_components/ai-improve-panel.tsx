"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";

import { buildOpsAiVisibleContextFromRecord } from "@/lib/ops/ai-visible-context";
import { sanitizePublishableBody } from "@/lib/ops/publishable-copy";
import type {
  OpsAiImprovedDraftProposal,
  OpsAiImproveDraftsResponse,
  OpsAiPublicStatus,
  OpsAudienceProfile,
  OpsBrandProfile,
  OpsContentPackageRecord,
  PlatformDraft,
  PublicationTarget,
} from "@/lib/ops/types";

type AiImprovePanelProps = {
  aiStatus: OpsAiPublicStatus;
  audienceProfiles: OpsAudienceProfile[];
  brandProfiles: OpsBrandProfile[];
  draftReviewChecklist: string[];
  onApplyProposals: (
    record: OpsContentPackageRecord,
    proposals: OpsAiImprovedDraftProposal[],
    runId: string,
  ) => Promise<boolean>;
  onRevertDraft: (
    record: OpsContentPackageRecord,
    draftId: string,
  ) => Promise<boolean>;
  publicationTargets: PublicationTarget[];
  record: OpsContentPackageRecord;
};

export function AiImprovePanel({
  aiStatus,
  audienceProfiles,
  brandProfiles,
  draftReviewChecklist,
  onApplyProposals,
  onRevertDraft,
  publicationTargets,
  record,
}: AiImprovePanelProps) {
  const [issues, setIssues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [proposals, setProposals] = useState<OpsAiImprovedDraftProposal[]>([]);
  const [runId, setRunId] = useState("");
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);

  const aiVisibleContext = useMemo(
    () =>
      buildOpsAiVisibleContextFromRecord({
        audienceProfiles,
        brandProfiles,
        draftReviewChecklist,
        publicationTargets,
        record,
      }),
    [
      audienceProfiles,
      brandProfiles,
      draftReviewChecklist,
      publicationTargets,
      record,
    ],
  );

  const proposalMap = useMemo(
    () => new Map(proposals.map((proposal) => [proposal.platformDraftId, proposal])),
    [proposals],
  );

  async function generateImprovedDrafts() {
    if (!aiStatus.enabled) {
      setIssues([
        aiStatus.disabledReason ??
          "Ops AI is disabled. Configure OPS_AI_ENABLED, OPS_AI_PROVIDER, and the matching provider API key server-side.",
      ]);
      setMessage("");
      return;
    }

    setLoading(true);
    setIssues([]);
    setMessage("");

    try {
      const response = await fetch("/ops/api/ai/improve-drafts", {
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
        runId?: string;
      };

      if (!response.ok) {
        setIssues(
          payload.issues?.length
            ? payload.issues
            : [payload.error ?? `AI generation failed with ${response.status}.`],
        );
        setProposals([]);
        setRunId(typeof payload.runId === "string" ? payload.runId : "");
        return;
      }

      setProposals(payload.proposals);
      setRunId(payload.runId);
      setSelectedDraftIds(payload.proposals.map((proposal) => proposal.platformDraftId));
      setMessage(
        `Generated ${payload.proposals.length} improved draft proposal${
          payload.proposals.length === 1 ? "" : "s"
        } via ${payload.provider} for manual review. Nothing was saved automatically.`,
      );
    } catch {
      setIssues(["Ops AI generation request failed. Try again or use Copy AI Prompt."]);
    } finally {
      setLoading(false);
    }
  }

  async function applySelectedProposals() {
    const selected = proposals.filter((proposal) =>
      selectedDraftIds.includes(proposal.platformDraftId),
    );

    if (selected.length === 0) {
      setIssues(["Select at least one AI proposal to apply."]);
      return;
    }

    const applied = await onApplyProposals(record, selected, runId);

    if (applied) {
      setMessage(
        `Applied ${selected.length} AI-improved draft${
          selected.length === 1 ? "" : "s"
        } after manual review. Original deterministic text was preserved for rollback.`,
      );
      setIssues([]);
      setProposals([]);
      setSelectedDraftIds([]);
    }
  }

  function toggleDraftSelection(draftId: string) {
    setSelectedDraftIds((current) =>
      current.includes(draftId)
        ? current.filter((item) => item !== draftId)
        : [...current, draftId],
    );
  }

  function renderDraftComparison(draft: PlatformDraft) {
    const proposal = proposalMap.get(draft.id);
    const originalBody = draft.originalDeterministicBody ?? draft.body;

    return (
      <article
        key={draft.id}
        className="rounded-lg border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="font-sans text-sm font-semibold text-slate-950">
              {draft.accountName} / {draft.platform}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Draft ID: {draft.id}
            </p>
          </div>
          {draft.originalDeterministicBody ? (
            <button
              type="button"
              onClick={() => void onRevertDraft(record, draft.id)}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Revert to original
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Original deterministic draft
            </p>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-800">
              {sanitizePublishableBody(originalBody)}
            </pre>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {proposal ? "AI proposal (publishable preview)" : "Current publishable draft"}
            </p>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-violet-200 bg-violet-50 p-3 text-xs leading-5 text-slate-800">
              {sanitizePublishableBody(proposal?.body ?? draft.body)}
            </pre>
            {proposal ? (
              <label className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedDraftIds.includes(draft.id)}
                  onChange={() => toggleDraftSelection(draft.id)}
                />
                Apply this AI proposal after review
              </label>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <details className="mt-5 rounded-lg border border-violet-200 bg-violet-50/60">
      <summary className="cursor-pointer p-4 text-sm font-semibold text-violet-950">
        AI Draft Improvement - manual review required
      </summary>
      <div className="grid gap-4 border-t border-violet-200 p-4">
        <div className="rounded-md border border-violet-200 bg-white p-3 text-sm leading-6 text-violet-950">
          {aiStatus.enabled ? (
            <>
              AI provider connected ({aiStatus.provider}, model {aiStatus.model}
              ). Only the allowlisted AI context preview fields are sent to the
              provider. Generated drafts are proposals only. Manual approval is
              still required before posting, and originals remain available for
              rollback.
            </>
          ) : (
            <>
              AI generation is disabled.{" "}
              {aiStatus.disabledReason ??
                "Configure OPS_AI_ENABLED=true, OPS_AI_PROVIDER, and the matching provider API key server-side."}
            </>
          )}
        </div>

        {aiStatus.providerWarning ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            {aiStatus.providerWarning}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!aiStatus.enabled || loading}
            onClick={() => void generateImprovedDrafts()}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-violet-300 bg-violet-600 px-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? "Generating..." : "Generate AI Improved Drafts"}
          </button>
          {proposals.length > 0 ? (
            <button
              type="button"
              onClick={() => void applySelectedProposals()}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-300 bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Apply Selected Proposals
            </button>
          ) : null}
        </div>

        {message ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            {message}
          </div>
        ) : null}

        {issues.length > 0 ? (
          <div className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            <div className="flex items-start gap-3 font-medium">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              AI generation blocked or failed.
            </div>
            <ul className="space-y-1">
              {issues.slice(0, 8).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-3">
          {record.platformDrafts.map((draft) => renderDraftComparison(draft))}
        </div>
      </div>
    </details>
  );
}
