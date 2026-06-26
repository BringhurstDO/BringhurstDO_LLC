"use client";

import { ImageIcon, Loader2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { opsFetch } from "@/app/ops/_components/ops-fetch";
import type { OpsProjectId } from "@/lib/ops/types";

type CatalogEntry = {
  assetLocation: string;
  id: string;
  label: string;
  projectId: OpsProjectId;
  tags: string[];
};

type CatalogResponse = {
  entries: CatalogEntry[];
  upload: {
    configured: boolean;
    mode: "local-public" | "vercel-blob" | null;
    reason: string | null;
  };
};

type IgMediaAttachPanelProps = {
  assetLocation?: string;
  catalogScope?: "all" | "project";
  compact?: boolean;
  description?: string;
  disabled?: boolean;
  heading?: string;
  onChange: (assetLocation: string) => void;
  projectId: OpsProjectId;
};

function previewUrl(assetLocation: string) {
  if (assetLocation.startsWith("https://") || assetLocation.startsWith("http://")) {
    return assetLocation;
  }

  if (typeof window === "undefined") {
    return assetLocation;
  }

  return assetLocation.startsWith("/")
    ? `${window.location.origin}${assetLocation}`
    : assetLocation;
}

export function IgMediaAttachPanel({
  assetLocation = "",
  catalogScope = "project",
  compact = false,
  description = "Pick an approved image or upload a new screenshot. Ops publishes this image with your approved caption.",
  disabled = false,
  heading = "Instagram product screenshot",
  onChange,
  projectId,
}: IgMediaAttachPanelProps) {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const catalogUrl =
        catalogScope === "all"
          ? "/ops/api/media/catalog"
          : `/ops/api/media/catalog?projectId=${encodeURIComponent(projectId)}`;
      const response = await opsFetch(catalogUrl, { cache: "no-store" });
      const payload = (await response.json()) as CatalogResponse;

      if (!response.ok) {
        throw new Error("Could not load IG media catalog.");
      }

      setCatalog(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load IG media catalog.",
      );
    } finally {
      setLoading(false);
    }
  }, [catalogScope, projectId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const selectedPreview = useMemo(
    () => (assetLocation.trim() ? previewUrl(assetLocation.trim()) : null),
    [assetLocation],
  );

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.set("file", file);
      body.set("projectId", projectId);

      const response = await opsFetch("/ops/api/media/upload", {
        body,
        cache: "no-store",
        method: "POST",
      });
      const payload = (await response.json()) as {
        assetLocation?: string;
        error?: string;
      };

      if (!response.ok || !payload.assetLocation) {
        throw new Error(payload.error ?? "Screenshot upload failed.");
      }

      onChange(payload.assetLocation);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Screenshot upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={`rounded-md border border-fuchsia-200 bg-fuchsia-50/60 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start gap-2">
        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-fuchsia-950">{heading}</p>
          <p className="mt-1 text-xs leading-5 text-fuchsia-900">{description}</p>
        </div>
      </div>

      {selectedPreview ? (
        <div className="mt-3 overflow-hidden rounded-md border border-fuchsia-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedPreview}
            alt="Selected Instagram media preview"
            className="max-h-48 w-full object-contain bg-slate-950/5"
          />
          <div className="border-t border-fuchsia-100 px-3 py-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Selected:</span>{" "}
            <span className="break-all font-mono">{assetLocation}</span>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          No screenshot selected yet. Instagram will fall back to a brand default
          image unless you attach one here.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <label
          className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-fuchsia-300 bg-white px-3 text-xs font-semibold text-fuchsia-900 hover:bg-fuchsia-100 ${
            disabled || uploading || !catalog?.upload.configured
              ? "cursor-not-allowed opacity-50"
              : ""
          }`}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden />
          )}
          {uploading ? "Uploading…" : "Upload screenshot"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || uploading || !catalog?.upload.configured}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";

              if (file) {
                void handleUpload(file);
              }
            }}
          />
        </label>

        {assetLocation ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Clear image
          </button>
        ) : null}
      </div>

      {!catalog?.upload.configured && catalog?.upload.reason ? (
        <p className="mt-2 text-xs text-amber-900">{catalog.upload.reason}</p>
      ) : null}

      {loading ? (
        <p className="mt-3 text-xs text-slate-500">Loading approved images…</p>
      ) : null}

      {!loading && catalog && catalog.entries.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {catalog.entries.map((entry) => {
            const selected = assetLocation.trim() === entry.assetLocation;

            return (
              <button
                key={entry.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(entry.assetLocation)}
                className={`overflow-hidden rounded-md border text-left transition ${
                  selected
                    ? "border-fuchsia-500 ring-2 ring-fuchsia-200"
                    : "border-slate-200 bg-white hover:border-fuchsia-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl(entry.assetLocation)}
                  alt={entry.label}
                  className="h-24 w-full object-cover bg-slate-100"
                />
                <div className="px-2 py-2">
                  <p className="text-xs font-semibold text-slate-900">{entry.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {entry.tags.join(" · ")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}
