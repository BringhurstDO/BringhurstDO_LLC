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
import { opsFetch } from "@/app/ops/_components/ops-fetch";
import type {
  SocialConnectionPublicStatus,
  SocialConnectionsStatusResponse,
} from "@/lib/ops/types";

type MetaConnectPanelProps = {
  connectResult?: string;
  connectResultCount?: string;
  connectSkippedCount?: string;
  connectError?: string;
  connectErrorAccount?: string;
  connectErrorCode?: string;
  connectErrorHint?: string;
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

function isInstagramAccount(accountId: string) {
  return accountId.includes("instagram");
}

function facebookAccountIdForInstagram(accountId: string) {
  return accountId.replace("-instagram", "-facebook");
}

function FacebookPageRow({
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
            Facebook Page ·{" "}
            <span className="font-mono">{account.accountId}</span>
          </p>
        </div>
        <StatusPill tone={tone}>{label}</StatusPill>
      </div>

      {connected || expired ? (
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Page id</dt>
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
        <a
          href={`/ops/api/social/meta/connect?account=${encodeURIComponent(
            account.accountId,
          )}`}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-[#1877F2]/30 bg-white px-3 text-xs font-medium text-[#1877F2] transition-colors hover:bg-[#1877F2]/5"
        >
          <Plug className="h-3.5 w-3.5" aria-hidden />
          {connected || expired ? "Reconnect" : "Connect one"}
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

function InstagramMirrorRow({
  account,
  facebookConnected,
}: {
  account: SocialConnectionPublicStatus;
  facebookConnected: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {account.configuredLabel}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Instagram · <span className="font-mono">{account.accountId}</span>
          </p>
        </div>
        <StatusPill tone={facebookConnected ? "good" : "neutral"}>
          {facebookConnected ? "Via Page cross-post" : "Needs Facebook Page"}
        </StatusPill>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">
        Ops publishes to the linked Facebook Page. Meta cross-posting sends the
        post to this Instagram account when enabled in Business Suite. No
        separate Instagram OAuth is required.
      </p>
    </div>
  );
}

export function MetaConnectPanel({
  connectResult,
  connectResultCount,
  connectSkippedCount,
  connectError,
  connectErrorAccount,
  connectErrorCode,
  connectErrorHint,
}: MetaConnectPanelProps) {
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
      const response = await opsFetch("/ops/api/social/meta/status");
      const data = (await response.json()) as SocialConnectionsStatusResponse;
      setStatus(data);
    } catch {
      setActionError("Could not load Meta connection status.");
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
        const response = await opsFetch("/ops/api/social/meta/disconnect", {
          body: JSON.stringify({ accountId }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
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
  const facebookAccounts = accounts.filter(
    (account) => !isInstagramAccount(account.accountId),
  );
  const instagramAccounts = accounts.filter((account) =>
    isInstagramAccount(account.accountId),
  );
  const facebookConnectedCount = facebookAccounts.filter(
    (account) => account.connected,
  ).length;
  const facebookConnectedById = new Map(
    facebookAccounts.map((account) => [account.accountId, account.connected]),
  );

  return (
    <OpsPanel
      actions={
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1877F2]">
          <Share2 className="h-4 w-4" aria-hidden />
          Pages {facebookConnectedCount}/{facebookAccounts.length || 0} connected
        </span>
      }
      eyebrow="Phase 9 — Meta"
      title="Facebook & Instagram"
    >
      <div className="flex flex-col gap-4">
        {connectResult === "connected_all" ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Connected {connectResultCount ?? "all configured"} Facebook Page
            {connectResultCount === "1" ? "" : "s"} in one login. Page tokens are
            stored server-side only.
            {connectSkippedCount && connectSkippedCount !== "0" ? (
              <span className="block mt-1">
                {connectSkippedCount} configured Page(s) were skipped — see hint
                below.
              </span>
            ) : null}
          </div>
        ) : null}

        {connectResult === "connected" ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Meta account connected. Page tokens are stored server-side only.
          </div>
        ) : null}

        {connectError ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p>{connectError}</p>
              {connectErrorAccount || connectErrorCode || connectErrorHint ? (
                <dl className="mt-2 grid gap-1 text-xs text-red-900">
                  {connectErrorAccount ? (
                    <div>
                      <dt className="inline font-semibold">Account: </dt>
                      <dd className="inline font-mono">{connectErrorAccount}</dd>
                    </div>
                  ) : null}
                  {connectErrorCode ? (
                    <div>
                      <dt className="inline font-semibold">OAuth code: </dt>
                      <dd className="inline font-mono">{connectErrorCode}</dd>
                    </div>
                  ) : null}
                  {connectErrorHint ? (
                    <div>
                      <dt className="inline font-semibold">Hint: </dt>
                      <dd className="inline">{connectErrorHint}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </div>
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
          {configured && facebookAccounts.length > 0 ? (
            <a
              href="/ops/api/social/meta/connect?mode=all-pages"
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[#1877F2] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#166fe5]"
            >
              <Plug className="h-3.5 w-3.5" aria-hidden />
              Connect all Facebook Pages
            </a>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void loadStatus()}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-white disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading status…</p>
        ) : null}

        {!loading && status?.disabledReason ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            <p className="font-semibold text-slate-900">Integration not ready</p>
            <p className="mt-1">{status.disabledReason}</p>
          </div>
        ) : null}

        {!loading && configured && status?.oauthRedirectUri ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
            <p className="font-semibold text-slate-900">Facebook app callback</p>
            <p className="mt-1 break-all font-mono">{status.oauthRedirectUri}</p>
            {status.oauthScopes && status.oauthScopes.length > 0 ? (
              <p className="mt-2">
                Scopes:{" "}
                <span className="font-mono">{status.oauthScopes.join(", ")}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {!loading && configured && facebookAccounts.length > 0 ? (
          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Facebook Pages (publish from Ops)
            </p>
            {facebookAccounts.map((account) => (
              <FacebookPageRow
                key={account.accountId}
                account={account}
                busy={busy}
                onDisconnect={(id) => void handleDisconnect(id)}
              />
            ))}
          </div>
        ) : null}

        {!loading && configured && instagramAccounts.length > 0 ? (
          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Instagram (via Meta cross-post)
            </p>
            {instagramAccounts.map((account) => (
              <InstagramMirrorRow
                key={account.accountId}
                account={account}
                facebookConnected={
                  facebookConnectedById.get(
                    facebookAccountIdForInstagram(account.accountId),
                  ) ?? false
                }
              />
            ))}
          </div>
        ) : null}

        <p className="text-xs leading-5 text-slate-500">
          One Facebook Business login can authorize every brand Page you admin.
          Ops only stores tokens for configured business Pages in META_ACCOUNTS —
          not your personal Facebook profile. Instagram rows mirror the linked
          Page through Meta cross-posting; native Instagram publish is not
          implemented yet.
        </p>
      </div>
    </OpsPanel>
  );
}
