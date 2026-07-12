"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { IgMediaAttachPanel } from "@/app/ops/_components/ig-media-attach-panel";
import { opsFetch } from "@/app/ops/_components/ops-fetch";
import { resolveAutoPackageSocialImage } from "@/lib/ops/social-media-suggest";
import type { OpsProjectId, SourceUpdateType } from "@/lib/ops/types";

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
  updateType?: SourceUpdateType;
};

export function OpsPackageSocialImagePanel({
  assetLocation,
  onChange,
  projectId,
  sourceSummary,
  sourceTitle,
  updateType,
}: OpsPackageSocialImagePanelProps) {
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([]);
  const lastAutoKeyRef = useRef("");

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
      resolveAutoPackageSocialImage(catalogEntries, {
        currentAssetLocation: "",
        projectId,
        summary: sourceSummary,
        title: sourceTitle,
        updateType,
      }) ??
      null,
    [catalogEntries, projectId, sourceSummary, sourceTitle, updateType],
  );

  useEffect(() => {
    if (!catalogEntries.length) {
      return;
    }

    const auto = resolveAutoPackageSocialImage(catalogEntries, {
      currentAssetLocation: assetLocation,
      projectId,
      summary: sourceSummary,
      title: sourceTitle,
      updateType,
    });

    if (!auto) {
      return;
    }

    const autoKey = `${sourceTitle}\n${sourceSummary}\n${auto.catalogId}`;

    if (assetLocation.trim()) {
      lastAutoKeyRef.current = autoKey;
      return;
    }

    if (lastAutoKeyRef.current === autoKey) {
      return;
    }

    lastAutoKeyRef.current = autoKey;
    onChange(auto.assetLocation);
  }, [
    assetLocation,
    catalogEntries,
    onChange,
    projectId,
    sourceSummary,
    sourceTitle,
    updateType,
  ]);

  const showSuggestion =
    suggestion && suggestion.assetLocation.trim() !== assetLocation.trim();

  return (
    <div className="grid gap-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-sans text-sm font-semibold text-slate-950">
          Social media for connected platforms
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Attach once at the package level. Ops copies this media onto LinkedIn,
          X, Facebook, and Instagram drafts when keywords or update type match
          the catalog. JPEG/PNG/WebP, GIF, and MP4 are supported. Instagram
          rejects GIFs — use MP4 or a still there. When no media is selected,
          publish defaults use the source product and post copy — not the posting
          account brand (e.g. Kyle&apos;s LinkedIn posting SyncSOAP still gets
          SyncSOAP art).
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
        heading="Package social media"
        description="One media file per post on LinkedIn, X, Facebook, and Instagram (JPEG/PNG/WebP, GIF, or MP4). Remove before save if a draft should be text-only."
        onChange={onChange}
        projectId={projectId}
      />
    </div>
  );
}
