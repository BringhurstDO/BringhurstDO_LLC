"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navItems = [
  { href: "/syncsoap", label: "SyncSOAP" },
  { href: "/syncsafety", label: "SyncSafety" },
  { href: "/anki", label: "Anki" },
  { href: "/founder", label: "Founder" },
  { href: "/innovation", label: "Innovation" },
] as const;

// Temporary America 250 accent. Remove after July 2026.
function America250HeaderMark() {
  return (
    <div
      className="hidden h-8 shrink-0 items-center gap-2 rounded-md border border-red-200 bg-white px-2.5 text-xs font-semibold text-slate-900 shadow-sm sm:flex"
      aria-label="Celebrating America's 250th birthday"
    >
      <span
        className="grid h-5 w-5 place-items-center rounded-full bg-[#1d4ed8] text-[10px] leading-none text-white ring-2 ring-red-600/80"
        aria-hidden
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
          <path d="m10 1.8 2.3 5 5.5.6-4.1 3.7 1.1 5.4-4.8-2.7-4.8 2.7 1.1-5.4-4.1-3.7 5.5-.6L10 1.8Z" />
        </svg>
      </span>
      <span className="whitespace-nowrap">
        America <span className="text-red-700">250</span>
      </span>
      <span className="hidden whitespace-nowrap text-[10px] font-medium text-muted-foreground lg:inline">
        1776-2026
      </span>
    </div>
  );
}

export function SiteHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-3 font-heading text-lg font-semibold tracking-tight text-foreground"
          onClick={closeMobileMenu}
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

        <America250HeaderMark />

        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-primary-nav"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white/70 text-slate-700 transition-colors hover:bg-muted md:hidden"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
        >
          <span className="sr-only">Toggle menu</span>
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <nav
          className="hidden flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-muted-foreground md:flex"
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

      <div
        id="mobile-primary-nav"
        className={`${isMobileMenuOpen ? "block" : "hidden"} border-t border-border/70 bg-white/95 px-4 py-3 backdrop-blur md:hidden`}
      >
        <nav className="grid gap-2" aria-label="Mobile primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              onClick={closeMobileMenu}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
