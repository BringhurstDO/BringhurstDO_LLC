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
      <div
        className="relative h-9 w-36 shrink-0 overflow-hidden rounded-sm border border-slate-200"
        aria-hidden
      >
        <div className="absolute inset-0 flex flex-col">
          {Array.from({ length: 13 }, (_, index) => (
            <span
              key={index}
              className={
                index % 2 === 0
                  ? "min-h-0 flex-1 bg-[#B22234]"
                  : "min-h-0 flex-1 bg-white"
              }
            />
          ))}
        </div>
        <div className="absolute left-0 top-0 grid h-[54%] w-[40%] grid-cols-3 grid-rows-2 place-items-center bg-[#3C3B6E]">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="size-1 rounded-full bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
