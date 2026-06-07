"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";

import { collectMetadataOnlyIssues } from "@/lib/ops/safety";
import type {
  OpsProjectId,
  WeeklyScorecardMetric,
  WeeklyScorecardMetricId,
} from "@/lib/ops/types";

const projectOptions: { label: string; value: OpsProjectId }[] = [
  { label: "SyncSOAP", value: "syncsoap" },
  { label: "SyncSafety", value: "syncsafety" },
  { label: "BringhurstDO", value: "bringhurstdo" },
];

type ManualMetricEntryPanelProps = {
  scorecard: WeeklyScorecardMetric[];
  weekEnd: string;
  weekStart: string;
};

export function ManualMetricEntryPanel({
  scorecard,
  weekEnd,
  weekStart,
}: ManualMetricEntryPanelProps) {
  const [projectId, setProjectId] = useState<OpsProjectId>("bringhurstdo");
  const [metricId, setMetricId] = useState<WeeklyScorecardMetricId>("posts");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("count");
  const [notes, setNotes] = useState("");

  const selectedMetric = scorecard.find((metric) => metric.id === metricId);
  const previewEntry = useMemo(
    () => ({
      enteredAt: "local-preview",
      id: "manual-metric-preview",
      label: selectedMetric?.label ?? metricId,
      metricId,
      notes: notes
        .split(/\r?\n/)
        .map((note) => note.trim())
        .filter(Boolean),
      projectId,
      source: "manual",
      unit,
      value,
      weekEnd,
      weekStart,
    }),
    [metricId, notes, projectId, selectedMetric?.label, unit, value, weekEnd, weekStart],
  );

  const issues = useMemo(() => {
    const validationIssues = collectMetadataOnlyIssues(
      previewEntry,
      "manualMetricPreview",
    ).map((issue) => `${issue.path}: ${issue.message}`);

    if (!value.trim()) {
      validationIssues.unshift("manualMetricPreview.value is required.");
    }

    if (!unit.trim()) {
      validationIssues.unshift("manualMetricPreview.unit is required.");
    }

    return validationIssues;
  }, [previewEntry, unit, value]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Project
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value as OpsProjectId)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {projectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Metric
          <select
            value={metricId}
            onChange={(event) =>
              setMetricId(event.target.value as WeeklyScorecardMetricId)
            }
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {scorecard.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Value
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Aggregate total"
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Unit
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="count, USD, clicks"
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Manual aggregate note only. No contact details, private messages, credentials, or raw logs."
          className="min-h-24 rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </label>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        {issues.length > 0 ? (
          <div className="grid gap-3">
            <div className="flex items-start gap-3 text-sm font-medium leading-6 text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              Local row is not ready to copy.
            </div>
            <ul className="space-y-2 text-sm leading-6 text-amber-900">
              {issues.map((issue) => (
                <li key={issue} className="rounded-md bg-amber-50 px-3 py-2">
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="flex items-start gap-3 text-sm font-medium leading-6 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              Manual metric row validated for copy/import preview.
            </div>
            <pre className="overflow-x-auto rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700">
              {JSON.stringify(previewEntry, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p>
          Copy validated rows into a local JSON import or mock data after manual
          review. This form does not persist, publish, spend, or call an API.
        </p>
      </div>
    </div>
  );
}
