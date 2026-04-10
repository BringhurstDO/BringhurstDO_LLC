"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { isPendingHref } from "@/lib/pending-link";
import { cn } from "@/lib/utils";

const pendingCtaClassName =
  "cursor-default border-2 border-red-500 bg-red-500/15 text-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.35)] hover:bg-red-500/15 hover:opacity-100 active:translate-y-0";

type ProductPrimaryCtaProps = {
  href: string;
  children: React.ReactNode;
  /** Shown as tooltip when the href is still a placeholder. */
  pendingTitle?: string;
  /** Opens in a new tab with safe `rel` (e.g. GitHub). */
  external?: boolean;
};

export function ProductPrimaryCta({
  href,
  children,
  pendingTitle = "Configure this link — href is still a placeholder (# or empty).",
  external = false,
}: ProductPrimaryCtaProps) {
  if (isPendingHref(href)) {
    return (
      <span
        role="status"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          pendingCtaClassName,
        )}
        title={pendingTitle}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: "default", size: "lg" }))}
      {...(external
        ? { target: "_blank" as const, rel: "noopener noreferrer" }
        : {})}
    >
      {children}
    </Link>
  );
}
