import { Link2, Megaphone, PencilLine } from "lucide-react";

import { BoundaryPill, OpsPageHeader, OpsPanel, StatusPill } from "@/app/ops/_components/ops-ui";
import { opsDashboardData } from "@/lib/ops/mock-data";
import type { ContentStatus, OpsTone } from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const statusTone: Record<ContentStatus, OpsTone> = {
  idea: "neutral",
  drafted: "watch",
  "needs review": "watch",
  approved: "good",
  posted: "good",
  archived: "neutral",
};

export default function OpsContentPage() {
  const { contentIdeas, draftPosts, utmCampaignLinks } = opsDashboardData;

  return (
    <main>
      <OpsPageHeader
        eyebrow="Content workspace"
        title="Content Planning"
        description="Local-only idea bank, draft queue, manual posted tracking, and UTM helper links. Nothing here posts externally."
      />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <BoundaryPill>Manual posted tracking only</BoundaryPill>
          <BoundaryPill>No publishing API</BoundaryPill>
          <BoundaryPill>No audience lists or private identifiers</BoundaryPill>
        </div>

        <OpsPanel title="Idea Bank" eyebrow={`${contentIdeas.length} local ideas`}>
          <div className="grid gap-4 lg:grid-cols-2">
            {contentIdeas.map((idea) => (
              <article
                key={idea.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-sans text-base font-semibold text-slate-950">
                      {idea.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {idea.angle}
                    </p>
                  </div>
                  <StatusPill tone={statusTone[idea.status]}>{idea.status}</StatusPill>
                </div>

                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Project</dt>
                    <dd className="font-medium text-slate-900">{idea.projectId}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Audience</dt>
                    <dd className="font-medium text-slate-900">{idea.audience}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Risk</dt>
                    <dd className="font-medium text-slate-900">{idea.riskLevel}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Channels</dt>
                    <dd className="font-medium text-slate-900">
                      {idea.channelFit.join(", ")}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600">
                  {idea.sourceBoundary}
                </div>

                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {idea.notes.map((note) => (
                    <li key={note} className="flex gap-2">
                      <PencilLine className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </OpsPanel>

        <OpsPanel title="Draft Post Queue" eyebrow={`${draftPosts.length} draft rows`}>
          <div className="grid gap-3 md:hidden">
            {draftPosts.map((draft) => (
              <article
                key={draft.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-sans text-sm font-semibold text-slate-950">
                      {draft.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">{draft.bodyPreview}</p>
                  </div>
                  <StatusPill tone={statusTone[draft.status]}>
                    {draft.status}
                  </StatusPill>
                </div>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Platform</dt>
                    <dd className="font-medium text-slate-800">{draft.channel}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Audience</dt>
                    <dd className="font-medium text-slate-800">{draft.audience}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Window</dt>
                    <dd className="text-right text-slate-800">
                      {draft.publishWindow}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[900px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Draft</th>
                  <th scope="col" className="px-4 py-3">Platform</th>
                  <th scope="col" className="px-4 py-3">Audience</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Window</th>
                  <th scope="col" className="px-4 py-3">Manual Tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {draftPosts.map((draft) => (
                  <tr key={draft.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950">{draft.title}</div>
                      <div className="mt-1 max-w-md text-slate-600">
                        {draft.bodyPreview}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{draft.channel}</td>
                    <td className="px-4 py-4 text-slate-700">{draft.audience}</td>
                    <td className="px-4 py-4">
                      <StatusPill tone={statusTone[draft.status]}>
                        {draft.status}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {draft.publishWindow}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {draft.postedManuallyAt
                        ? `Posted manually ${draft.postedManuallyAt}`
                        : "Not posted"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OpsPanel>

        <OpsPanel title="UTM Campaign Helper" eyebrow="Generated locally">
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <div className="flex items-center gap-2 font-semibold text-slate-950">
              <Link2 className="h-4 w-4" aria-hidden />
              Format
            </div>
            <p className="mt-1">
              Destination URL plus `utm_source`, `utm_medium`, `utm_campaign`,
              and `utm_content`. Links are examples only and do not post or track
              anything by themselves.
            </p>
          </div>

          <div className="grid gap-4">
            {utmCampaignLinks.map((link) => (
              <article
                key={link.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-slate-500" aria-hidden />
                      <h2 className="font-sans text-base font-semibold text-slate-950">
                        {link.label}
                      </h2>
                    </div>
                    <p className="mt-2 break-all font-mono text-xs leading-5 text-slate-600">
                      {link.generatedUrl}
                    </p>
                  </div>
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                    {link.status}
                  </span>
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-slate-500">Source</dt>
                    <dd className="font-medium text-slate-900">{link.source}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Medium</dt>
                    <dd className="font-medium text-slate-900">{link.medium}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Campaign</dt>
                    <dd className="font-medium text-slate-900">{link.campaign}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Content</dt>
                    <dd className="font-medium text-slate-900">{link.content}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </OpsPanel>
      </div>
    </main>
  );
}
