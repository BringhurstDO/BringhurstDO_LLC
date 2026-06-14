"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plug,
  RefreshCw,
  Share2,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { OpsPanel, StatusPill } from "@/app/ops/_components/ops-ui";
import type {
  SocialConnectionPublicStatus,
  SocialConnectionsStatusResponse,
} from "@/lib/ops/types";

type LinkedInConnectPanelProps = {
  connectResult?: string;
  connectError?: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleString();
}

function AccountRow({
  account,
  busy,
  onDisconnect,
}: {
  account: SocialConnectionPublicStatus;
  busy: boolean;
  onDisconnect: (accountId: string) => void;
}) {
  const connected = account.connected;
  const expired = account.expired;
  const tone = connected ? "good" : expired ? "watch" : "neutral";
  const label = connected
    ? "Connected"
    : expired
      ? "Token expired"
      : "Not connected";

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {account.configuredLabel}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {account.configuredAuthorType === "member"
              ? "Personal profile (member)"
              : "Company page (organization)"}{" "}
            · <span className="font-mono">{account.accountId}</span>
          </p>
        </div>
        <StatusPill tone={tone}>{label}</StatusPill>
      </div>

      {connected || expired ? (
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Author id</dt>
            <dd className="mt-0.5 font-mono text-slate-700">
              {account.authorIdMasked ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Token expires</dt>
            <dd className="mt-0.5 text-slate-700">
              {formatDate(account.expiresAt)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Scopes</dt>
            <dd className="mt-0.5 font-mono text-slate-700">
              {account.scopes.length ? account.scopes.join(" ") : "—"}
            </dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {/* Full-page navigation: OAuth requires a top-level redirect. */}
        <a
          href={`/ops/api/social/linkedin/connect?account=${encodeURIComponent(
            account.accountId,
          )}`}
          className="inline-flex h-8 items-center gap-2 rounded-md bg-[#0a66c2] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#0954a0]"
        >
          <Plug className="h-3.5 w-3.5" aria-hidden />
          {connected || expired ? "Reconnect" : "Connect"}
        </a>
        {connected || expired ? (
          <button
            type="button"
            onClick={() => onDisconnect(account.accountId)}
            disabled={busy}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 transition-colors hover:bg-white disabled:opacity-50"
          >
            <Unplug className="h-3.5 w-3.5" aria-hidden />
            Disconnect
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function LinkedInConnectPanel({
  connectResult,
  connectError,
}: LinkedInConnectPanelProps) {
  const [status, setStatus] = useState<SocialConnectionsStatusResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setActionError(null);

    try {
      const response = await fetch("/ops/api/social/linkedin/status", {
        cache: "no-store",
      });
      const data = (await response.json()) as SocialConnectionsStatusResponse;
      setStatus(data);
    } catch {
      setActionError("Could not load LinkedIn connection status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleDisconnect = useCallback(
    async (accountId: string) => {
      setBusy(true);
      setActionError(null);

      try {
        const response = await fetch("/ops/api/social/linkedin/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Disconnect failed.");
        }

        await loadStatus();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Disconnect failed.",
        );
      } finally {
        setBusy(false);
      }
    },
    [loadStatus],
  );

  const configured = status?.configured ?? false;
  const accounts = status?.accounts ?? [];
  const connectedCount = accounts.filter((account) => account.connected).length;

  return (
    <OpsPanel
      title="LinkedIn Publishing (Phase 7A/7B)"
      eyebrow="Approved integration"
      actions={
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0a66c2]">
          <Share2 className="h-4 w-4" aria-hidden />
          {connectedCount}/{accounts.length || 0} connected
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        {connectResult === "connected" ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            LinkedIn account connected. Tokens are stored server-side only.
          </div>
        ) : null}

        {connectError ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {connectError}
          </div>
        ) : null}

        {actionError ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {actionError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <StatusPill tone={configured ? "good" : "blocked"}>
            {configured ? "Configured" : "Not configured"}
          </StatusPill>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Manual approval required per post
          </span>
          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={busy}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-white disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading status…</p>
        ) : null}

        {!loading && !configured && status?.disabledReason ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            <p className="font-semibold text-slate-900">Integration not ready</p>
            <p className="mt-1">{status.disabledReason}</p>
          </div>
        ) : null}

        {!loading && configured && accounts.length > 0 ? (
          <div className="grid gap-3">
            {accounts.map((account) => (
              <AccountRow
                key={account.accountId}
                account={account}
                busy={busy}
                onDisconnect={(id) => void handleDisconnect(id)}
              />
            ))}
          </div>
        ) : null}

        <p className="text-xs leading-5 text-slate-500">
          Connect Kyle&apos;s personal profile as the primary author and each
          brand page for amplification. Tokens are encrypted at rest and never
          sent to the browser. Publishing and resharing happen only from approved
          drafts after explicit operator confirmation, and require durable
          database storage.
        </p>
      </div>
    </OpsPanel>
  );
}
