import { BadgeCheck, Ban, ClipboardList, ExternalLink } from "lucide-react";

import {
  BoundaryPill,
  OpsPageHeader,
  OpsPanel,
  StatusPill,
} from "@/app/ops/_components/ops-ui";
import { opsDashboardData } from "@/lib/ops/mock-data";
import type {
  OpsAccountRegistryEntry,
  OpsAccountStatus,
  OpsTone,
} from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const accountStatuses: OpsAccountStatus[] = [
  "active",
  "planned",
  "blocked_pending_meta_trust",
  "missing",
];

const accountStatusTones: Record<OpsAccountStatus, OpsTone> = {
  active: "good",
  blocked_pending_meta_trust: "blocked",
  missing: "blocked",
  planned: "neutral",
};

function AccountFieldList({ account }: { account: OpsAccountRegistryEntry }) {
  return (
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-slate-500">Project ID</dt>
        <dd className="mt-1 font-medium text-slate-900">{account.projectId}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Platform</dt>
        <dd className="mt-1 font-medium text-slate-900">{account.platform}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Handle</dt>
        <dd className="mt-1 font-medium text-slate-900">{account.handle}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Role</dt>
        <dd className="mt-1 font-medium text-slate-900">{account.role}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-slate-500">Profile URL</dt>
        <dd className="mt-1 break-all font-mono text-xs text-slate-700">
          {account.profileUrl}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-slate-500">Notes</dt>
        <dd className="mt-1 leading-6 text-slate-700">
          {account.notes.join(" ")}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-slate-500">Source boundary</dt>
        <dd className="mt-1 leading-6 text-slate-700">
          {account.sourceBoundary}
        </dd>
      </div>
    </dl>
  );
}

export default function OpsAccountsPage() {
  const { accountRegistry, socialMetricPlaceholders } = opsDashboardData;
  const projectAccounts = accountRegistry.filter((account) => account.kind === "project");
  const founderAccounts = accountRegistry.filter((account) => account.kind === "founder");
  const accountStatusCounts = Object.fromEntries(
    accountStatuses.map((status) => [
      status,
      accountRegistry.filter((account) => account.status === status).length,
    ]),
  ) as Record<OpsAccountStatus, number>;

  return (
    <main>
      <OpsPageHeader
        eyebrow="Account registry"
        title="Accounts"
        description="Manual registry for project and founder accounts. This stores public account context only, not credentials or private platform data."
      />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <BoundaryPill>No credentials or login state</BoundaryPill>
          <BoundaryPill>No private messages or audience exports</BoundaryPill>
          <BoundaryPill>Manual approval before publishing</BoundaryPill>
          <BoundaryPill>Manual approval before spending</BoundaryPill>
        </div>

        <OpsPanel title="Account Status Labels" eyebrow="Basic labels">
          <div className="flex flex-wrap gap-2">
            {accountStatuses.map((status) => (
              <StatusPill key={status} tone={accountStatusTones[status]}>
                {status}: {accountStatusCounts[status]}
              </StatusPill>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Facebook rows are blocked while Meta Page creation is unavailable.
            This registry remains public-context metadata only and does not
            connect Meta Business tools.
          </p>
        </OpsPanel>

        <OpsPanel title="Project Accounts" eyebrow={`${projectAccounts.length} rows`}>
          <div className="grid gap-4 lg:grid-cols-2">
            {projectAccounts.map((account) => (
              <article
                key={account.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-slate-500" />
                      <h2 className="font-sans text-base font-semibold text-slate-950">
                        {account.name}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {account.platform} / {account.role}
                    </p>
                  </div>
                  <StatusPill tone={account.statusTone}>{account.status}</StatusPill>
                </div>

                <AccountFieldList account={account} />

                <p className="mt-4 text-sm leading-6 text-slate-700">
                  {account.purpose}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <BadgeCheck className="h-4 w-4 text-emerald-500" />
                      Allowed Metrics
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {account.allowedMetrics.join(", ")}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <Ban className="h-4 w-4 text-red-500" />
                      Forbidden Data
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {account.forbiddenData.join(", ")}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </OpsPanel>

        <OpsPanel title="Founder Accounts" eyebrow={`${founderAccounts.length} rows`}>
          <div className="grid gap-4 lg:grid-cols-2">
            {founderAccounts.map((account) => (
              <article
                key={account.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-sans text-base font-semibold text-slate-950">
                      {account.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {account.platform} / {account.handle}
                    </p>
                  </div>
                  <StatusPill tone={account.statusTone}>{account.status}</StatusPill>
                </div>
                <AccountFieldList account={account} />
                <p className="mt-4 text-sm leading-6 text-slate-700">
                  {account.purpose}
                </p>
                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {account.integrationPlaceholder}
                </div>
              </article>
            ))}
          </div>
        </OpsPanel>

        <OpsPanel title="Social Metric Placeholder Coverage">
          <div className="grid gap-4 lg:grid-cols-3">
            {socialMetricPlaceholders.map((placeholder) => (
              <article
                key={placeholder.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start gap-3">
                  <ClipboardList className="mt-1 h-5 w-5 shrink-0 text-slate-500" />
                  <div>
                    <h2 className="font-sans text-base font-semibold text-slate-950">
                      {placeholder.platform}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {placeholder.sourceBoundary}
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-sm leading-6 text-slate-700">
                  Accounts: {placeholder.accountIds.length}
                </div>
              </article>
            ))}
          </div>
        </OpsPanel>
      </div>
    </main>
  );
}
