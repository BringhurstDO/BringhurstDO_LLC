"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plug,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { LiveDataBadge } from "@/app/ops/_components/ops-data-status";
import { opsFetch } from "@/app/ops/_components/ops-fetch";
import { OpsPanel, StatusPill } from "@/app/ops/_components/ops-ui";
import type {
  SocialConnectionPublicStatus,
  SocialConnectionsStatusResponse,
} from "@/lib/ops/types";

type XConnectPanelProps = {
  connectError?: string;
  connectResult?: string;
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
      ? "Reconnect required"
      : "Not connected";

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {account.configuredLabel}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Personal profile ·{" "}
            <span className="font-mono">{account.accountId}</span>
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

      {account.disabledReason ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
          {account.disabledReason}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`/ops/api/social/x/connect?account=${encodeURIComponent(
            account.accountId,
          )}`}
          className="inline-flex h-8 items-center gap-2 rounded-md bg-slate-950 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
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

export function XConnectPanel({ connectError, connectResult }: XConnectPanelProps) {
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
      const response = await opsFetch("/ops/api/social/x/status");
      if (response.status === 401) {
        throw new Error(
          "Ops session expired. Refresh the page and sign in again, then retry Connect.",
        );
      }

      const data = (await response.json()) as SocialConnectionsStatusResponse;
      setStatus(data);
    } catch {
      setActionError("Could not load X connection status.");
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
        const response = await opsFetch("/ops/api/social/x/disconnect", {
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
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <LiveDataBadge label="Live · Phase 9" />
          <span className="text-sm font-semibold text-slate-700">
            {connectedCount}/{accounts.length || 0} connected
          </span>
        </div>
      }
      eyebrow="Phase 9"
      title="X Publishing"
    >
      <div className="flex flex-col gap-4">
        {connectResult === "connected" ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            X account connected. Tokens are stored server-side only.
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
                busy={busy}
                onDisconnect={(id) => void handleDisconnect(id)}
              />
            ))}
          </div>
        ) : null}

        {configured && status?.oauthRedirectUri ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            <p className="font-semibold">If X shows “you must be logged in” or HTTP 400</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                In the{" "}
                <a
                  className="font-semibold underline"
                  href="https://developer.x.com/en/portal/dashboard"
                  rel="noreferrer"
                  target="_blank"
                >
                  X Developer Portal
                </a>
                , open your app → <strong>User authentication settings</strong> →
                enable <strong>OAuth 2.0</strong>.
              </li>
              <li>
                App type: <strong>Web App, Automated App or Bot</strong>. App
                permissions: <strong>Read and write</strong>. Do not enable direct
                message access.
              </li>
              <li>
                Callback / redirect URI must match{" "}
                <strong>exactly</strong> (copy-paste):
                <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-xs text-slate-800">
                  {status.oauthRedirectUri}
                </code>
              </li>
              <li>
                Scopes enabled in the portal should include:{" "}
                <code className="font-mono text-xs">
                  {(status.oauthScopes ?? []).join(" ")}
                </code>
              </li>
              <li>
                Sign in at{" "}
                <a
                  className="font-semibold underline"
                  href="https://x.com"
                  rel="noreferrer"
                  target="_blank"
                >
                  x.com
                </a>{" "}
                in this browser first, then click Connect.
              </li>
              <li>
                Microsoft Edge <strong>Tracking Prevention</strong> can block X
                login cookies (console shows blocked storage). Try Chrome, or set
                Tracking prevention to Basic for this site.
              </li>
            </ol>
          </div>
        ) : null}

        <p className="text-xs leading-5 text-slate-500">
          Requires X developer app with OAuth 2.0,{" "}
          <code className="font-mono">OPS_X_ENABLED=true</code>, and callback URL{" "}
          <code className="font-mono">/ops/api/social/x/callback</code>. Posts
          are text-only up to 280 characters after sanitizing. Weekly metrics
          readback will use read scopes only for Ops-published post ids. Direct
          message scopes are intentionally not requested. Tokens are encrypted at
          rest and never sent to the browser. Short-lived access tokens renew
          automatically using the refresh token granted by{" "}
          <code className="font-mono">offline.access</code>.
        </p>
      </div>
    </OpsPanel>
  );
}
