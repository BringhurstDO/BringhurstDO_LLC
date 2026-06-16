"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isPendingHref } from "@/lib/pending-link";

/** Set each URL when ready. Empty string = bright red “pending” chip (not a link). */
export const socialUrls = {
  linkedin: "https://www.linkedin.com/company/bringhurstdo-llc/?viewAsMember=true",
  x: "https://x.com/kyle_bringhurst",
  instagram: "https://www.instagram.com/kyle_bringhurst/",
  doximity: "https://www.doximity.com",
} as const;

function getLinkedInUrl(pathname: string | null): string {
  if (pathname === "/founder") {
    return "https://www.linkedin.com/in/kyle-bringhurst/";
  }

  if (pathname === "/syncsoap") {
    return "https://www.linkedin.com/showcase/syncsoap/about/?viewAsMember=true";
  }

  if (pathname === "/syncsafety") {
    return "https://www.linkedin.com/showcase/syncsafety/about/?viewAsMember=true";
  }

  return socialUrls.linkedin;
}

const socialItems = [
  { key: "linkedin" as const, label: "LinkedIn" },
  { key: "x" as const, label: "X" },
  { key: "instagram" as const, label: "Instagram" },
  { key: "doximity" as const, label: "Doximity" },
];

// Temporary America 250 accent. Remove after July 2026.
function America250FooterMark() {
  return (
    <div
      className="flex w-full flex-col gap-3 rounded-md border border-red-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      aria-label="Celebrating America's 250th birthday"
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#1d4ed8] text-white ring-2 ring-red-600/80"
          aria-hidden
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current">
            <path d="m10 1.8 2.3 5 5.5.6-4.1 3.7 1.1 5.4-4.8-2.7-4.8 2.7 1.1-5.4-4.1-3.7 5.5-.6L10 1.8Z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Celebrating America&apos;s 250th Birthday
          </p>
          <p className="text-xs text-muted-foreground">
            1776-2026 commemorative site accent
          </p>
        </div>
      </div>
      <div className="flex h-8 overflow-hidden rounded-md border border-slate-200 sm:w-28">
        <span className="flex-1 bg-[#b91c1c]" aria-hidden />
        <span className="flex-1 bg-white" aria-hidden />
        <span className="flex-1 bg-[#1d4ed8]" aria-hidden />
      </div>
    </div>
  );
}

function SocialNavItem({
  label,
  href,
  configKey,
}: {
  label: string;
  href: string;
  configKey: keyof typeof socialUrls;
}) {
  const pending = isPendingHref(href);

  if (pending) {
    return (
      <span
        className="inline-flex cursor-default items-center rounded-md border-2 border-red-500 bg-red-500/15 px-3 py-1.5 text-sm font-semibold tracking-tight text-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]"
        title={`Set socialUrls.${String(configKey)} in components/site-footer.tsx`}
      >
        {label}: URL pending
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="text-muted-foreground transition-colors hover:text-foreground"
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
    </Link>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  const resolvedSocialUrls = {
    ...socialUrls,
    linkedin: getLinkedInUrl(pathname),
  } as const;

  return (
    <footer className="border-t border-border/80 bg-card/30">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
        <America250FooterMark />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-heading text-lg font-semibold text-foreground">
              BringhurstDO LLC
            </p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Bridging the gap between clinical efficiency and industrial safety
              with modern, high-performance software.
            </p>
          </div>
          <div className="flex max-w-md flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap justify-end gap-3">
              <span className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                HIPAA-Ready Architecture
              </span>
              <span className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                OSHA 1904 Compliant
              </span>
            </div>
            <p className="text-right text-xs text-muted-foreground">
              Nova Southeastern University - Doctor of Osteopathic Medicine Candidate
            </p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Social
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {socialItems.map((item) => (
              <SocialNavItem
                key={item.key}
                label={item.label}
                href={resolvedSocialUrls[item.key]}
                configKey={item.key}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Link
              href="/privacy"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BringhurstDO LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
