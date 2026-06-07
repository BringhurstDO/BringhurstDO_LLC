import { BoundaryPill, OpsPageHeader, OpsPanel } from "@/app/ops/_components/ops-ui";
import { ImportJsonPanel } from "@/app/ops/_components/import-json-panel";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function OpsImportPage() {
  return (
    <main>
      <OpsPageHeader
        eyebrow="Manual JSON import"
        title="Import Preview"
        description="Paste local JSON exports for metadata-only validation and preview. This page does not save, publish, or call external services."
      />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <BoundaryPill>Browser-local validation</BoundaryPill>
          <BoundaryPill>No storage or database writes</BoundaryPill>
          <BoundaryPill>No credentials, cookies, tokens, or raw logs</BoundaryPill>
        </div>

        <OpsPanel title="Paste JSON For Preview" eyebrow="Local/manual only">
          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            Supports content drafts, UTM links, weekly reports, project health
            snapshots, and manual metric entries. Previewed imports never save
            data or replace the mock dashboard.
          </div>
          <ImportJsonPanel />
        </OpsPanel>
      </div>
    </main>
  );
}
