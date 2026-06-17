"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plug,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { MockDataBadge } from "@/app/ops/_components/ops-data-status";
import { opsFetch } from "@/app/ops/_components/ops-fetch";
import { OpsPanel, StatusPill } from "@/app/ops/_components/ops-ui";
import type {
  SocialConnectionPublicStatus,
  SocialConnectionsStatusResponse,
} from "@/lib/ops/types";

type PlatformConnectPanelProps = {
  connectError?: string;
  connectErrorParam?: string;
  connectPath: string;
  description: string;
  eyebrow: string;
  phase: string;
  platformLabel: string;
  statusPath: string;
  title: string;
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
  connectPath,
  oauthImplemented,
}: {
  account: SocialConnectionPublicStatus;
  connectPath: string;
  oauthImplemented: boolean;
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
              ? "Personal profile"
              : "Organization / page"}{" "}
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
        </dl>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {oauthImplemented ? (
          <a
            href={`${connectPath}?account=${encodeURIComponent(account.accountId)}`}
            className="inline-flex h-8 items-center gap-2 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
          >
            <Plug className="h-3.5 w-3.5" aria-hidden />
            {connected || expired ? "Reconnect" : "Connect"}
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex h-8 cursor-not-allowed items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-800 opacity-80"
            title="OAuth connect not implemented yet"
          >
            <Plug className="h-3.5 w-3.5" aria-hidden />
            Connect (Phase 9 scaffold)
          </button>
        )}
      </div>
    </div>
  );
}

export function PlatformConnectPanel({
  connectError,
  connectErrorParam = "error",
  connectPath,
  description,
  eyebrow,
  phase,
  platformLabel,
  statusPath,
  title,
}: PlatformConnectPanelProps) {
  const [status, setStatus] = useState<SocialConnectionsStatusResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setActionError(null);

    try {
      const response = await opsFetch(statusPath);
      const data = (await response.json()) as SocialConnectionsStatusResponse;
      setStatus(data);
    } catch {
      setActionError(`Could not load ${platformLabel} connection status.`);
    } finally {
      setLoading(false);
    }
  }, [platformLabel, statusPath]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const configured = status?.configured ?? false;
  const oauthImplemented = status?.oauthImplemented ?? false;
  const accounts = status?.accounts ?? [];
  const connectedCount = accounts.filter((account) => account.connected).length;

  return (
    <OpsPanel
      actions={
        oauthImplemented ? undefined : (
          <MockDataBadge phase={phase} />
        )
      }
      eyebrow={eyebrow}
      title={title}
    >
      <div className="flex flex-col gap-4">
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

        {!oauthImplemented ? (
          <div className="rounded-md border-2 border-red-300 bg-red-50 p-3 text-sm leading-6 text-red-900">
            <p className="font-semibold">Phase 9 scaffold — connect not wired yet</p>
            <p className="mt-1">
              Env validation and status APIs are live. OAuth callback, token
              storage, and publish routes will ship after external API approval.
              Query param <code className="font-mono">{connectErrorParam}</code>{" "}
              surfaces config errors from connect attempts.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <StatusPill tone={configured ? "good" : "blocked"}>
            {configured ? "Env configured" : "Not configured"}
          </StatusPill>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Manual approval required per post
          </span>
          {oauthImplemented && connectedCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {connectedCount}/{accounts.length} connected
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void loadStatus()}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-white"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
        </div>

        {loading ? <p className="text-sm text-slate-500">Loading status…</p> : null}

        {!loading && status?.disabledReason ? (
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
                connectPath={connectPath}
                oauthImplemented={oauthImplemented}
              />
            ))}
          </div>
        ) : null}

        <p className="text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </OpsPanel>
  );
}
