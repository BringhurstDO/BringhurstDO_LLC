"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { IgMediaAttachPanel } from "@/app/ops/_components/ig-media-attach-panel";
import { opsFetch } from "@/app/ops/_components/ops-fetch";
import { resolveAutoPackageSocialImage } from "@/lib/ops/social-media-suggest";
import type {
  OpsOverlayCrop,
  OpsOverlayFormat,
  OpsOverlayPreset,
  OpsOverlayTextScale,
  OpsProjectId,
  SourceUpdateType,
} from "@/lib/ops/types";

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
  overlayHeadline?: string;
  onOverlayHeadlineChange?: (headline: string) => void;
  overlayCrop?: OpsOverlayCrop;
  overlayFormat?: OpsOverlayFormat;
  overlayPreset?: OpsOverlayPreset;
  overlayTextScale?: OpsOverlayTextScale;
  onOverlayCropChange?: (crop: OpsOverlayCrop) => void;
  onOverlayFormatChange?: (format: OpsOverlayFormat) => void;
  onOverlayPresetChange?: (preset: OpsOverlayPreset) => void;
  onOverlayTextScaleChange?: (scale: OpsOverlayTextScale) => void;
};

const presetOptions: Array<{
  description: string;
  label: string;
  value: OpsOverlayPreset;
}> = [
  { description: "Bold lower-third headline", label: "Editorial", value: "editorial" },
  { description: "Compact top-left treatment", label: "Minimal", value: "minimal" },
  { description: "Centered announcement panel", label: "Centered", value: "centered" },
  { description: "Light editorial quotation", label: "Quote", value: "quote" },
  { description: "High-contrast conference banner", label: "Event", value: "event" },
];

export function OpsPackageSocialImagePanel({
  assetLocation,
  onChange,
  projectId,
  sourceSummary,
  sourceTitle,
  updateType,
  overlayHeadline,
  onOverlayHeadlineChange,
  overlayCrop = "attention",
  overlayFormat = "square",
  overlayPreset = "editorial",
  overlayTextScale = "standard",
  onOverlayCropChange,
  onOverlayFormatChange,
  onOverlayPresetChange,
  onOverlayTextScaleChange,
}: OpsPackageSocialImagePanelProps) {
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([]);
  const [overlayIssue, setOverlayIssue] = useState("");
  const [overlayMessage, setOverlayMessage] = useState("");
  const [renderingOverlay, setRenderingOverlay] = useState(false);
  const [overlaySourceAsset, setOverlaySourceAsset] = useState("");
  const lastRenderedAssetRef = useRef("");
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

  useEffect(() => {
    if (!assetLocation.trim()) {
      setOverlaySourceAsset("");
      lastRenderedAssetRef.current = "";
      return;
    }

    if (assetLocation !== lastRenderedAssetRef.current) {
      setOverlaySourceAsset(assetLocation);
    }
  }, [assetLocation]);

  async function renderApprovedOverlay() {
    setOverlayIssue("");
    setOverlayMessage("");
    setRenderingOverlay(true);

    try {
      const response = await opsFetch("/ops/api/media/overlay", {
        body: JSON.stringify({
          assetLocation: overlaySourceAsset || assetLocation,
          confirmApproved: true,
          crop: overlayCrop,
          format: overlayFormat,
          headline: overlayHeadline ?? "",
          preset: overlayPreset,
          projectId,
          textScale: overlayTextScale,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        assetLocation?: string;
        error?: string;
      };

      if (!response.ok || !payload.assetLocation) {
        throw new Error(payload.error ?? "Overlay render failed.");
      }

      lastRenderedAssetRef.current = payload.assetLocation;
      onChange(payload.assetLocation);
      setOverlayMessage("Approved headline rendered onto a new social image.");
    } catch (error) {
      setOverlayIssue(error instanceof Error ? error.message : "Overlay render failed.");
    } finally {
      setRenderingOverlay(false);
    }
  }

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
      {onOverlayHeadlineChange ? (
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Text on image</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Gemini may suggest this short headline, but it is rendered only after you apply or edit it and click Render. Captions, hashtags, and mentions remain in the post text.
          </p>
        </div>
        <input
          value={overlayHeadline ?? ""}
          maxLength={90}
          onChange={(event) => onOverlayHeadlineChange(event.target.value)}
          placeholder="Short visual headline"
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Style
            <select
              value={overlayPreset}
              onChange={(event) => onOverlayPresetChange?.(event.target.value as OpsOverlayPreset)}
              className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              {presetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Format
            <select
              value={overlayFormat}
              onChange={(event) => onOverlayFormatChange?.(event.target.value as OpsOverlayFormat)}
              className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="square">Square 1080 x 1080</option>
              <option value="portrait">Portrait 1080 x 1350</option>
              <option value="landscape">Landscape 1200 x 630</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Text size
            <select
              value={overlayTextScale}
              onChange={(event) => onOverlayTextScaleChange?.(event.target.value as OpsOverlayTextScale)}
              className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="compact">Compact</option>
              <option value="standard">Standard</option>
              <option value="large">Large</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Crop focus
            <select
              value={overlayCrop}
              onChange={(event) => onOverlayCropChange?.(event.target.value as OpsOverlayCrop)}
              className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="attention">Automatic subject focus</option>
              <option value="center">Center</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={renderingOverlay || !assetLocation.trim() || !(overlayHeadline ?? "").trim()}
            onClick={() => void renderApprovedOverlay()}
            className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {renderingOverlay ? "Rendering..." : "Render approved text on media"}
          </button>
          {overlaySourceAsset && assetLocation !== overlaySourceAsset ? (
            <button
              type="button"
              onClick={() => {
                lastRenderedAssetRef.current = "";
                onChange(overlaySourceAsset);
              }}
              className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Restore original image
            </button>
          ) : null}
          <span className="text-xs text-slate-500">{(overlayHeadline ?? "").length}/90</span>
        </div>
        {overlayMessage ? <p className="text-sm text-emerald-700">{overlayMessage}</p> : null}
        {overlayIssue ? <p className="text-sm text-red-700">{overlayIssue}</p> : null}
      </div>
      ) : null}
    </div>
  );
}
