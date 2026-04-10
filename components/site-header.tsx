"use client";

import Image from "next/image";
import Link from "next/link";

const navItems = [
  { href: "/syncsoap", label: "SyncSOAP" },
  { href: "/syncsafety", label: "SyncSafety" },
  { href: "/anki", label: "Anki" },
  { href: "/founder", label: "Founder" },
  { href: "/innovation", label: "Innovation" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-3 font-heading text-lg font-semibold tracking-tight text-foreground"
        >
          <Image
            src="/Icon-BringhurstDOLLC.svg"
            alt="BringhurstDO LLC"
            width={28}
            height={28}
            priority
            className="block h-7 w-7 shrink-0 object-contain"
          />
          BringhurstDO
        </Link>
        <nav
          className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-muted-foreground"
          aria-label="Primary"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
