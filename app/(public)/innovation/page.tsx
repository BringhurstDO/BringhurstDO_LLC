import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "What Drives Us",
  description:
    "Precision, security, and transparent engineering — how BringhurstDO builds software for industries where accuracy is non-negotiable.",
};

const pillars = [
  {
    title: "User-First Architecture",
    body: "Built by practitioners, for practitioners. We design workflows that mirror real-world clinical and industrial operations.",
  },
  {
    title: "Uncompromising Security",
    body: "From strict RBAC implementations to data encryption, we treat user data with the exactness required by federal compliance standards.",
  },
  {
    title: "Continuous Iteration",
    body: "We build in public and iterate relentlessly based on direct user feedback and evolving industry regulations.",
  },
] as const;

const buildSteps = [
  {
    title: "Observe the real workflow",
    body: "We start with the actual operator path: where information enters, where it gets duplicated, and where accuracy breaks down under time pressure.",
  },
  {
    title: "Model the failure points",
    body: "Before writing software, we identify the decisions, handoffs, and documentation risks that create preventable errors.",
  },
  {
    title: "Build the smallest reliable system",
    body: "We prefer structured, durable workflows over feature sprawl so the product remains understandable, maintainable, and resilient.",
  },
  {
    title: "Validate with practitioners",
    body: "We refine against real-world use, not abstract assumptions, so the interface reflects how people actually work.",
  },
  {
    title: "Harden for trust",
    body: "Security, permissions, auditability, and graceful failure handling are part of the product itself, not post-launch decoration.",
  },
] as const;

const practiceAreas = [
  {
    title: "Precision in practice",
    body: "We encode the underlying structure of the work itself, whether that means OSHA 1904 logic, clinical documentation flow, or repeatable study reinforcement.",
  },
  {
    title: "Security by default",
    body: "We design for controlled access, minimal ambiguity, and safe failure states because trust erodes fastest in systems handling sensitive decisions.",
  },
  {
    title: "Transparency over mystique",
    body: "We aim for software that can be understood: clear workflows, visible assumptions, and tools that support users rather than obscure the process.",
  },
] as const;

const productLinks = [
  {
    title: "SyncSOAP",
    href: "/syncsoap",
    body: "Clinical documentation support built around the realities of patient encounters and physician workflow.",
  },
  {
    title: "SyncSafety",
    href: "/syncsafety",
    body: "Safety documentation and compliance infrastructure designed to remove administrative drag without losing rigor.",
  },
  {
    title: "NBOME Pearl Injector",
    href: "/anki",
    body: "A small service project for COMLEX learners that reduces study friction inside an existing Anki workflow.",
  },
] as const;

export default function InnovationPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/[0.04] via-card/40 to-background px-4 py-16 sm:px-6 sm:py-24">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <svg
            viewBox="0 0 1200 420"
            className="absolute right-[-8rem] top-0 h-full w-[70rem] opacity-[0.16]"
            fill="none"
          >
            <g stroke="currentColor" className="text-primary/50">
              <path d="M740 62h150v64h110v88h-88v80h-104" strokeWidth="1.5" />
              <path d="M664 152h84v-42h112" strokeWidth="1.5" />
              <path d="M700 236h126v54h146" strokeWidth="1.5" />
              <path d="M598 114h52v184h82" strokeWidth="1.5" />
              <path d="M842 38h126v58" strokeWidth="1.5" />
              <path d="M930 214h150v88h-92" strokeWidth="1.5" />
              <path d="M764 320h112v34h144" strokeWidth="1.5" />
              <path d="M610 76h74" strokeWidth="1.5" />
              <path d="M610 342h74" strokeWidth="1.5" />
            </g>
            <g fill="currentColor" className="text-primary/60">
              <circle cx="740" cy="62" r="6" />
              <circle cx="890" cy="62" r="6" />
              <circle cx="1000" cy="126" r="6" />
              <circle cx="912" cy="214" r="6" />
              <circle cx="808" cy="294" r="6" />
              <circle cx="972" cy="294" r="6" />
              <circle cx="684" cy="76" r="5" />
              <circle cx="684" cy="342" r="5" />
            </g>
            <g stroke="currentColor" className="text-slate-400/50">
              <path d="M560 36h82v82h-82" strokeWidth="1.5" />
              <path d="M560 304h82v82h-82" strokeWidth="1.5" />
              <path d="M1010 104h108v108h-108" strokeWidth="1.5" />
              <path d="M1046 252h96v96h-96" strokeWidth="1.5" />
            </g>
          </svg>
        </div>
        <div className="relative mx-auto max-w-6xl">
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-tight">
            Our Philosophy: Precision, Security, and Transparent Engineering.
          </h1>
          <div className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-4">
            {["Observe", "Model", "Validate", "Harden"].map((step, index) => (
              <div
                key={step}
                className="rounded-xl border border-border/70 bg-background/75 px-4 py-3 backdrop-blur-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  0{index + 1}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="mx-auto max-w-2xl text-center text-lg leading-relaxed text-muted-foreground sm:text-xl">
          We don&apos;t just write code; we engineer infrastructure for industries
          where accuracy is non-negotiable.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <h2 className="sr-only">Core pillars</h2>
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {pillars.map((pillar) => (
            <Card
              key={pillar.title}
              className="h-full border-border/80 bg-card/50"
            >
              <CardHeader className="gap-4 border-0">
                <CardTitle className="text-lg leading-snug sm:text-xl">
                  {pillar.title}
                </CardTitle>
                <CardDescription className="text-base leading-relaxed text-muted-foreground">
                  {pillar.body}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/20 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              How We Build
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Our process is intentionally conservative: understand the stakes,
              map the workflow, then build only what improves clarity,
              reliability, and trust.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            {buildSteps.map((step, index) => (
              <Card
                key={step.title}
                className="h-full border-border/80 bg-background/80"
              >
                <CardHeader className="gap-4 border-0">
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                    0{index + 1}
                  </p>
                  <CardTitle className="text-lg leading-snug">
                    {step.title}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed text-muted-foreground">
                    {step.body}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Why This Matters
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              In high-stakes work, messy software doesn&apos;t just waste time. It
              creates uncertainty, hides weak handoffs, and increases the odds
              of avoidable error. We build to reduce that burden.
            </p>
          </div>
          <div className="grid gap-6 lg:col-span-7 md:grid-cols-3">
            {practiceAreas.map((area) => (
              <Card
                key={area.title}
                className="h-full border-border/80 bg-card/50"
              >
                <CardHeader className="gap-4 border-0">
                  <CardTitle className="text-lg leading-snug">
                    {area.title}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed text-muted-foreground">
                    {area.body}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-gradient-to-b from-card/20 to-background px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Built Across Domains
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              The philosophy is consistent across products: reduce friction,
              preserve rigor, and design systems that respect the reality of the
              work.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
            {productLinks.map((product) => (
              <Card
                key={product.title}
                className="h-full border-border/80 bg-card/50 transition-colors hover:border-primary/30"
              >
                <CardHeader className="gap-4 border-0">
                  <CardTitle className="text-lg leading-snug">
                    {product.title}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed text-muted-foreground">
                    {product.body}
                  </CardDescription>
                  <Link
                    href={product.href}
                    className="pt-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Explore {product.title}
                  </Link>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
