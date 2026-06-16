import Image from "next/image";

const flagAlt = "Flag of the United States";
const flagSrc = "/flag-of-the-united-states.svg";

export function America250HeaderBanner() {
  return (
    <div
      className="border-t border-red-200/80 bg-white shadow-sm"
      aria-label="Celebrating America's 250th birthday"
    >
      <div className="mx-auto flex min-h-10 max-w-6xl items-center justify-center gap-3 px-4 py-2 text-center sm:px-6">
        <Image
          src={flagSrc}
          alt={flagAlt}
          width={48}
          height={25}
          className="h-6 w-auto shrink-0 rounded-sm border border-slate-200 object-contain shadow-sm"
        />
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
        <Image
          src={flagSrc}
          alt={flagAlt}
          width={76}
          height={40}
          className="h-12 w-auto shrink-0 rounded-sm border border-slate-200 object-contain shadow-sm"
        />
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
