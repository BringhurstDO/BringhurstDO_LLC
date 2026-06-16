// Temporary America 250 accents. Remove after July 2026.
function AmericanFlagIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 76 50"
      className={className}
      role="img"
      aria-label="American flag"
    >
      <rect width="76" height="50" rx="4" fill="#fff" />
      {Array.from({ length: 7 }).map((_, index) => (
        <rect
          key={index}
          y={index * 7.69}
          width="76"
          height="3.85"
          fill="#b91c1c"
        />
      ))}
      <rect width="32" height="26.9" rx="3" fill="#1d4ed8" />
      {Array.from({ length: 15 }).map((_, index) => {
        const row = Math.floor(index / 5);
        const col = index % 5;

        return (
          <circle
            key={index}
            cx={5 + col * 5.4 + (row % 2) * 2.7}
            cy={5 + row * 6.8}
            r="1.15"
            fill="#fff"
          />
        );
      })}
    </svg>
  );
}

export function America250HeaderBanner() {
  return (
    <div
      className="border-t border-red-200/80 bg-white shadow-sm"
      aria-label="Celebrating America's 250th birthday"
    >
      <div className="mx-auto flex min-h-10 max-w-6xl items-center justify-center gap-3 px-4 py-2 text-center sm:px-6">
        <AmericanFlagIcon className="h-6 w-9 shrink-0 drop-shadow-sm" />
        <p className="text-xs font-semibold text-slate-900 sm:text-sm">
          <span className="hidden text-red-700 sm:inline">
            Celebrating America&apos;s 250th Birthday
          </span>
          <span className="text-red-700 sm:hidden">America 250</span>
          <span className="mx-2 text-slate-300" aria-hidden>
            |
          </span>
          <span className="whitespace-nowrap text-[#1d4ed8]">1776-2026</span>
        </p>
      </div>
    </div>
  );
}

export function America250FooterMark() {
  return (
    <div
      className="flex w-full flex-col gap-4 rounded-md border border-red-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      aria-label="Celebrating America's 250th birthday"
    >
      <div className="flex items-center gap-4">
        <AmericanFlagIcon className="h-12 w-[4.5rem] shrink-0 drop-shadow-sm" />
        <div>
          <p className="text-base font-semibold text-slate-900">
            Celebrating America&apos;s 250th Birthday
          </p>
          <p className="text-sm text-muted-foreground">
            1776-2026 commemorative site accent
          </p>
        </div>
      </div>
      <div className="flex h-9 overflow-hidden rounded-md border border-slate-200 sm:w-36">
        <span className="flex-1 bg-[#b91c1c]" aria-hidden />
        <span className="flex-1 bg-white" aria-hidden />
        <span className="flex-1 bg-[#1d4ed8]" aria-hidden />
      </div>
    </div>
  );
}
