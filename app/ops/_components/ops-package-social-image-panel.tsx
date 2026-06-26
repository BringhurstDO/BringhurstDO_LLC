"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { IgMediaAttachPanel } from "@/app/ops/_components/ig-media-attach-panel";
import { opsFetch } from "@/app/ops/_components/ops-fetch";
import { resolveSuggestedCatalogEntry } from "@/lib/ops/social-media-suggest";
import type { OpsProjectId } from "@/lib/ops/types";

type CatalogEntry = {
  assetLocation: string;
  id: string;
  label: string;
  projectId: OpsProjectId;
};

type OpsPackageSocialImagePanelProps = {
  assetLocation: string;
  onChange: (assetLocation: string) => void;
  projectId: OpsProjectId;
  sourceSummary: string;
  sourceTitle: string;
};

export function OpsPackageSocialImagePanel({
  assetLocation,
  onChange,
  projectId,
  sourceSummary,
  sourceTitle,
}: OpsPackageSocialImagePanelProps) {
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([]);

  const loadCatalog = useCallback(async () => {
    try {
      const response = await opsFetch("/ops/api/media/catalog", {
        cache: "no-store",
      });
      const payload = (await response.json()) as { entries?: CatalogEntry[] };

      if (response.ok && Array.isArray(payload.entries)) {
        setCatalogEntries(payload.entries);
      }
    } catch {
      setCatalogEntries([]);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const suggestion = useMemo(
    () =>
      resolveSuggestedCatalogEntry(catalogEntries, sourceTitle, sourceSummary),
    [catalogEntries, sourceSummary, sourceTitle],
  );

  const showSuggestion =
    suggestion &&
    suggestion.assetLocation.trim() !== assetLocation.trim();

  return (
    <div className="grid gap-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-sans text-sm font-semibold text-slate-950">
          Social image for Facebook and Instagram
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Attach once at the package level. Ops copies this image onto every
          Facebook and Instagram draft when you generate slots or save a series.
          Upload a new file or pick from the approved catalog.
        </p>
        {showSuggestion ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
            <span>
              Suggested from your summary:{" "}
              <span className="font-semibold">{suggestion.label}</span>
            </span>
            <button
              type="button"
              onClick={() => onChange(suggestion.assetLocation)}
              className="inline-flex h-7 items-center rounded-md border border-sky-300 bg-white px-2.5 font-semibold text-sky-900 hover:bg-sky-100"
            >
              Use suggestion
            </button>
          </div>
        ) : null}
      </div>

      <IgMediaAttachPanel
        assetLocation={assetLocation}
        catalogScope="all"
        heading="Package social image"
        description="Used for Facebook and Instagram publish and autopublish."
        onChange={onChange}
        projectId={projectId}
      />
    </div>
  );
}
