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

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} BringhurstDO LLC. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
