"use client";

import Image from "next/image";
import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const PLACEHOLDER_IMAGE_SRC = new Set([
  "/syncsafety-mock.jpg",
  "/placeholder-syncsafety",
]);

const FLIP_INTERVAL_MS = 5000;

const TABS = ["DASHBOARD", "INCIDENTS", "PROGRAMS", "REPORTS"] as const;

export type PristineMockupProps = {
  mockUrl?: string;
  /**
   * Server-rendered view panels (Dashboard, Incidents, Programs, Reports).
   * When present, enables the tactical flipper; otherwise static image mode.
   */
  children?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  isPlaceholder?: boolean;
};

function shouldShowSkeleton(
  imageSrc: string | undefined,
  isPlaceholder: boolean | undefined,
): boolean {
  if (!imageSrc) return false;
  if (isPlaceholder === true) return true;
  if (isPlaceholder === false) return false;
  return PLACEHOLDER_IMAGE_SRC.has(imageSrc);
}

export function PristineMockup({
  mockUrl,
  children,
  imageSrc,
  imageAlt,
  isPlaceholder,
}: PristineMockupProps) {
  const panels = useMemo(
    () => Children.toArray(children).filter(Boolean),
    [children],
  );
  const useFlipper = panels.length > 0;

  const [active, setActive] = useState(0);
  const count = useFlipper ? Math.min(panels.length, TABS.length) : 0;

  const safeActive = count > 0 ? Math.min(active, count - 1) : 0;

  const bumpAuto = useCallback(() => {
    if (count < 2) return;
    setActive((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (count < 2) return;
    const id = window.setInterval(bumpAuto, FLIP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count, bumpAuto]);

  const selectTab = (index: number) => {
    setActive(index);
  };

  const showSkeleton =
    !useFlipper && shouldShowSkeleton(imageSrc, isPlaceholder);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-300 bg-white p-1">
      <header className="flex items-center gap-3 border-b border-slate-300 bg-slate-100 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 justify-center px-2">
          <div className="truncate rounded border border-slate-300 bg-white px-3 py-1 font-mono text-[10px] text-slate-500 sm:text-xs">
            {mockUrl ?? "SyncSafety.app"}
          </div>
        </div>
        <div
          className="size-2.5 shrink-0 rounded-full bg-slate-500 ring-1 ring-slate-400/50"
          aria-label="System status: nominal"
          role="status"
        />
      </header>

      <div className="relative aspect-video w-full overflow-hidden rounded-b-2xl bg-slate-50">
        {useFlipper ? (
          <div className="relative h-full min-h-[200px] w-full">
            {panels.slice(0, count).map((panel, i) => (
              <div
                key={i}
                className={`absolute inset-0 overflow-auto transition-opacity duration-500 ease-out ${
                  i === safeActive
                    ? "z-10 opacity-100"
                    : "z-0 opacity-0 pointer-events-none"
                }`}
                aria-hidden={i !== safeActive}
              >
                {panel}
              </div>
            ))}
          </div>
        ) : showSkeleton ? (
          <LegacySkeletonFallback />
        ) : imageSrc && imageAlt ? (
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 896px"
          />
        ) : null}
      </div>

      {useFlipper && count > 0 ? (
        <nav
          className="flex items-center justify-center gap-1 border-t border-slate-300 bg-slate-100 px-2 py-2"
          aria-label="Viewport"
        >
          {TABS.slice(0, count).map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => selectTab(i)}
              className={`rounded px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors sm:text-[10px] ${
                i === safeActive
                  ? "bg-white text-cyan-800 ring-1 ring-slate-300"
                  : "text-slate-500 hover:bg-white/80 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

/** Kept for non-flipper image placeholder usage. */
function LegacySkeletonFallback() {
  const barHeights = [42, 68, 36, 84, 52, 76, 44, 61, 39, 71];

  return (
    <div
      className="flex h-full min-h-[200px] flex-col gap-4 p-4 sm:p-5"
      role="img"
      aria-label="App preview placeholder"
    >
      <div className="grid grid-cols-3 gap-3">
        {["TRIR", "DART", "RECORDABLES"].map((label) => (
          <div
            key={label}
            className="space-y-2 rounded border border-slate-200 bg-white p-3"
          >
            <div className="h-2 w-14 rounded bg-slate-200" />
            <div className="h-7 w-full max-w-[4.5rem] rounded bg-slate-200" />
            <div className="h-1.5 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col rounded border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="h-2.5 w-28 rounded bg-slate-200" />
          <div className="h-2 w-16 rounded bg-slate-100" />
        </div>
        <div className="flex min-h-[7rem] flex-1 items-end gap-1.5 border-t border-slate-100 pt-3">
          {barHeights.map((pct, i) => (
            <div
              key={i}
              className="max-w-[10%] flex-1 rounded-t bg-slate-200"
              style={{ height: `${pct}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
