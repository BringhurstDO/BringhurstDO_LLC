"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardPaste, ShieldCheck } from "lucide-react";

import {
  type ManualImportKind,
  validateManualImportPayload,
} from "@/lib/ops/import-validation";

const maxImportBytes = 200_000;

const importOptions: {
  description: string;
  label: string;
  value: ManualImportKind;
}[] = [
  {
    description: "Array of local draft post rows.",
    label: "Content drafts",
    value: "draftPosts",
  },
  {
    description: "Array of generated campaign links.",
    label: "UTM links",
    value: "utmCampaignLinks",
  },
  {
    description: "Single weekly operator report object.",
    label: "Weekly report",
    value: "weeklyReport",
  },
  {
    description: "Array of project health snapshot rows.",
    label: "Project health snapshots",
    value: "projectHealthSnapshots",
  },
  {
    description: "Array of weekly manual scorecard rows.",
    label: "Manual metric entries",
    value: "manualMetricEntries",
  },
];

type ParsedImportState =
  | {
      issues: string[];
      ok: false;
      previewRows: [];
      summary: string;
    }
  | {
      issues: [];
      ok: true;
      previewRows: {
        detail: string;
        label: string;
        value: string;
      }[];
      summary: string;
    }
  | null;

export function ImportJsonPanel() {
  const [kind, setKind] = useState<ManualImportKind>("draftPosts");
  const [rawJson, setRawJson] = useState("");

  const selectedOption = importOptions.find((option) => option.value === kind);

  const importState = useMemo<ParsedImportState>(() => {
    const trimmed = rawJson.trim();

    if (!trimmed) {
      return null;
    }

    if (new Blob([rawJson]).size > maxImportBytes) {
      return {
        issues: ["Pasted JSON must be 200 KB or smaller."],
        ok: false,
        previewRows: [],
        summary: "Import rejected before rendering.",
      };
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return validateManualImportPayload(kind, parsed);
    } catch {
      return {
        issues: ["Pasted content is not valid JSON."],
        ok: false,
        previewRows: [],
        summary: "Import rejected before rendering.",
      };
    }
  }, [kind, rawJson]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Dataset
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as ManualImportKind)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {importOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal leading-5 text-slate-500">
            {selectedOption?.description}
          </span>
        </label>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <div className="flex items-center gap-2 font-semibold text-slate-950">
            <ShieldCheck className="h-4 w-4 text-slate-500" aria-hidden />
            Metadata-only validation
          </div>
          <p className="mt-1">
            This preview rejects unsafe keys and obvious unsafe values before any
            imported rows render. It does not save data, publish content, call
            APIs, or replace the mock dashboard.
          </p>
        </div>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Paste JSON
        <textarea
          value={rawJson}
          onChange={(event) => setRawJson(event.target.value)}
          placeholder='Paste a JSON export, for example [{"id":"draft-example", ...}]'
          spellCheck={false}
          className="min-h-72 resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs leading-5 text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </label>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {!importState ? (
          <div className="flex items-start gap-3 text-sm leading-6 text-slate-600">
            <ClipboardPaste className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              Paste JSON to run local validation. Nothing renders until the data
              passes metadata-only and shape checks.
            </p>
          </div>
        ) : importState.ok ? (
          <div className="grid gap-4">
            <div className="flex items-start gap-3 text-sm leading-6 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p className="font-medium">{importState.summary}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[640px] divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Item
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Detail
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importState.previewRows.map((row) => (
                    <tr key={`${row.label}-${row.detail}-${row.value}`}>
                      <td className="px-4 py-3 font-medium text-slate-950">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.detail}</td>
                      <td className="px-4 py-3 text-slate-700">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="flex items-start gap-3 text-sm leading-6 text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="font-medium">{importState.summary}</p>
            </div>
            <ul className="space-y-2 text-sm leading-6 text-red-800">
              {importState.issues.slice(0, 12).map((issue) => (
                <li key={issue} className="rounded-md bg-red-50 px-3 py-2">
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
