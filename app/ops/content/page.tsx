import Link from "next/link";
import { CalendarDays, FilePlus2, Link2, Megaphone, PencilLine } from "lucide-react";

import { ExportButtons } from "@/app/ops/_components/export-buttons";
import {
  BoundaryPill,
  OpsPageHeader,
  OpsPanel,
  opsShellClass,
  StatusPill,
} from "@/app/ops/_components/ops-ui";
import {
  csvExportFile,
  draftPostsToCsv,
  draftPostsToMarkdown,
  jsonExportFile,
  markdownExportFile,
  utmCampaignLinksToCsv,
  utmCampaignLinksToMarkdown,
} from "@/lib/ops/export";
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
  const utmLinkById = new Map(
    utmCampaignLinks.map((utmLink) => [utmLink.id, utmLink]),
  );
  const draftExportFiles = [
    jsonExportFile("ops-draft-posts", "JSON", draftPosts),
    markdownExportFile("ops-draft-posts", "Markdown", draftPostsToMarkdown(draftPosts)),
    csvExportFile("ops-draft-posts", "CSV", draftPostsToCsv(draftPosts)),
  ];
  const utmExportFiles = [
    jsonExportFile("ops-utm-links", "JSON", utmCampaignLinks),
    markdownExportFile(
      "ops-utm-links",
      "Markdown",
      utmCampaignLinksToMarkdown(utmCampaignLinks),
    ),
    csvExportFile("ops-utm-links", "CSV", utmCampaignLinksToCsv(utmCampaignLinks)),
  ];

  return (
    <main>
      <OpsPageHeader
        eyebrow="Content workspace"
        title="Content Planning"
        description="Local-only idea bank, draft queue, manual posted tracking, and UTM helper links. Nothing here posts externally."
      />

      <div className={`${opsShellClass} grid gap-6 py-6`}>
        <div className="flex flex-wrap gap-2">
          <BoundaryPill>Manual posted tracking only</BoundaryPill>
          <BoundaryPill>No publishing API</BoundaryPill>
          <BoundaryPill>No audience lists or private identifiers</BoundaryPill>
          <BoundaryPill>Every post gets a UTM link</BoundaryPill>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-sans text-base font-semibold text-slate-950">
                Publish Calendar
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Review today&apos;s drafts, overdue items, and upcoming schedule.
                Approve and publish manually — dates are reminders only.
              </p>
            </div>
            <Link
              href="/ops/content/calendar"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              Open Calendar
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-sans text-base font-semibold text-slate-950">
                Weekly Summary To Content Series
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Paste a metadata-only weekly summary and let AI split it into
                platform posts with suggested publish dates over one or more weeks.
              </p>
            </div>
            <Link
              href="/ops/content/series"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-violet-300 bg-violet-50 px-4 text-sm font-semibold text-violet-900 hover:bg-violet-100"
            >
              <Megaphone className="h-4 w-4" aria-hidden />
              Split Series
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-sans text-base font-semibold text-slate-950">
                Source Update To Content Package
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Turn one metadata-only product or operator update into
                platform-specific draft slots with generated UTM links.
              </p>
            </div>
            <Link
              href="/ops/content/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden />
              New Package
            </Link>
          </div>
        </section>

        <OpsPanel title="Idea Bank" eyebrow={`${contentIdeas.length} local ideas`}>
          {contentIdeas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
              No ideas yet. Future AI suggestions will appear here for your review
              and approval before they become drafts.
            </div>
          ) : (
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
          )}
        </OpsPanel>

        <OpsPanel
          title="Draft Post Queue"
          eyebrow={`${draftPosts.length} draft rows`}
          actions={
            draftPosts.length > 0 ? <ExportButtons files={draftExportFiles} /> : undefined
          }
        >
          {draftPosts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
              No draft queue rows yet. Split a weekly summary or create a content
              package to generate platform drafts.
            </div>
          ) : (
          <>
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
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">UTM</dt>
                    <dd className="text-right font-medium text-slate-800">
                      {draft.utmCampaignId ? "Generated" : "Missing"}
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
                  <th scope="col" className="px-4 py-3">UTM Discipline</th>
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
                      {draft.utmCampaignId ? (
                        <div>
                          <div className="font-medium text-slate-900">
                            {utmLinkById.get(draft.utmCampaignId)?.label ??
                              draft.utmCampaignId}
                          </div>
                          <div className="mt-1 break-all font-mono text-xs text-slate-500">
                            {utmLinkById.get(draft.utmCampaignId)?.generatedUrl ??
                              "Generated link pending review"}
                          </div>
                        </div>
                      ) : (
                        <StatusPill tone="blocked">missing</StatusPill>
                      )}
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
          </>
          )}
        </OpsPanel>

        <OpsPanel
          title="UTM Campaign Helper"
          eyebrow="Generated locally"
          actions={
            utmCampaignLinks.length > 0 ? (
              <ExportButtons files={utmExportFiles} />
            ) : undefined
          }
        >
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

          {utmCampaignLinks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
              No UTM helper links yet. They are created automatically when you save
              content packages with platform draft slots.
            </div>
          ) : (
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
          )}
        </OpsPanel>
      </div>
    </main>
  );
}
