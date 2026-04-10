import Link from "next/link";

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const cardLinkClass =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white/80 px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted";

const products = [
  {
    href: "/syncsoap",
    title: "SyncSOAP",
    badge: "Gated Beta",
    eyebrow: "Clinical workflow",
    description:
      "The Scribe is the bottleneck. SyncSOAP is the solution. Chart from home, not the hospital.",
    span: "lg:col-span-7",
    cta: "Explore SyncSOAP",
    theme: "clinical",
    cardClass:
      "border-sky-200/70 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.98),rgba(240,249,255,0.92))]",
    badgeClass:
      "border-sky-300/60 bg-sky-50 text-sky-800",
  },
  {
    href: "/syncsafety",
    title: "SyncSafety",
    badge: "Live",
    eyebrow: "Industrial compliance",
    description:
      "Compliance is a burden. SyncSafety is the partner. 100% OSHA 1904 accuracy in seconds.",
    span: "lg:col-span-5",
    cta: "Explore SyncSafety",
    theme: "safety",
    cardClass:
      "border-amber-200/70 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.98),rgba(255,251,235,0.92))]",
    badgeClass:
      "border-amber-300/60 bg-amber-50 text-amber-900",
  },
  {
    href: "/anki",
    title: "Anki optimization",
    badge: "Open source",
    eyebrow: "Learning systems",
    description:
      "Open-source tools for high-yield learning. Better retention, less burnout.",
    span: "lg:col-span-12",
    cta: "Explore Anki tools",
    theme: "editorial",
    cardClass:
      "border-indigo-200/70 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.98),rgba(248,247,243,0.96))]",
    badgeClass:
      "border-indigo-300/60 bg-indigo-50 text-indigo-900",
  },
] as const;

const studioPrinciples = [
  {
    title: "Reduce documentation burden",
    body: "Less duplicate entry, less after-hours clean-up, and less cognitive drag on the people doing the real work.",
  },
  {
    title: "Preserve rigor",
    body: "Accuracy, auditability, and compliance matter most in the environments where bad software usually cuts corners.",
  },
  {
    title: "Support high-stakes practitioners",
    body: "Every product is built around the reality of the operator, clinician, learner, or team under pressure.",
  },
] as const;

const heroPrinciples = [
  "Workflow-first design",
  "Documentation without drag",
  "Rigor that holds under pressure",
] as const;

function renderProductPreview(theme: (typeof products)[number]["theme"]) {
  if (theme === "clinical") {
    return (
      <div className="rounded-2xl border border-sky-200/80 bg-white/90 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">
            SOAP workspace
          </span>
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800">
            Drafting
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-2 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
            <div className="h-2.5 w-20 rounded-full bg-sky-200/80" />
            <div className="h-2.5 w-full rounded-full bg-sky-100" />
            <div className="h-2.5 w-11/12 rounded-full bg-sky-100" />
            <div className="h-2.5 w-10/12 rounded-full bg-sky-100" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="h-2.5 w-16 rounded-full bg-slate-300" />
            <div className="mt-3 space-y-2">
              <div className="h-8 rounded-lg bg-slate-100" />
              <div className="h-8 rounded-lg bg-slate-100" />
              <div className="h-8 rounded-lg bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (theme === "safety") {
    return (
      <div className="rounded-2xl border border-slate-300/80 bg-[#f8fafc] p-4 shadow-sm">
        <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-700">
            SyncSafety.app
          </span>
          <span className="size-2 rounded-full bg-amber-400" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-900">
              Recordable rate
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">0.86</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Open cases
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">12</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Programs
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">24</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#ddd7cc] bg-[#F8F7F3] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4338CA]">
          Study workflow
        </span>
        <span className="rounded-full border border-[#ddd7cc] bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-700">
          Open source
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-[#ddd7cc] bg-white/80 p-3">
          <div className="rounded-lg bg-[linear-gradient(to_bottom,rgba(79,70,229,0.12),rgba(255,255,255,0.72))] p-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#4338CA]">
              Source note
            </div>
            <div className="mt-2 h-2 w-4/5 rounded-full bg-[#c7d2fe]" />
            <div className="mt-1.5 h-2 w-full rounded-full bg-[#e0e7ff]" />
            <div className="mt-1.5 h-2 w-3/4 rounded-full bg-[#e0e7ff]" />
          </div>
        </div>
        <div className="rounded-xl border border-[#ddd7cc] bg-white/80 p-3">
          <div className="rounded-lg bg-[linear-gradient(to_bottom,rgba(192,132,252,0.14),rgba(255,255,255,0.72))] p-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7C3AED]">
              Pearl injection
            </div>
            <div className="mt-2 flex items-end gap-1">
              <div className="h-5 w-3 rounded-sm bg-[#ddd6fe]" />
              <div className="h-7 w-3 rounded-sm bg-[#c4b5fd]" />
              <div className="h-9 w-3 rounded-sm bg-[#a78bfa]" />
              <div className="h-6 w-3 rounded-sm bg-[#c4b5fd]" />
              <div className="h-8 w-3 rounded-sm bg-[#8b5cf6]" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#ddd7cc] bg-white/80 p-3">
          <div className="rounded-lg bg-[linear-gradient(to_bottom,rgba(201,151,62,0.14),rgba(255,255,255,0.72))] p-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9A6B1F]">
              Review output
            </div>
            <div className="mt-2 flex gap-1.5">
              <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[8px] font-medium text-[#92400E]">
                OMM
              </span>
              <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[8px] font-medium text-[#92400E]">
                Micro
              </span>
              <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[8px] font-medium text-[#92400E]">
                Pharm
              </span>
            </div>
            <div className="mt-2 h-2 w-5/6 rounded-full bg-[#FDE68A]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="bg-[linear-gradient(to_bottom,#fbfcfb,#f8fafc_42%,#f7f6f2_100%)]">
      <section className="relative overflow-hidden border-b border-border/60 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.96),rgba(248,250,252,0.96))] px-4 py-16 sm:px-6 sm:py-24">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <svg
            viewBox="0 0 1440 760"
            className="absolute inset-0 h-full w-full opacity-[0.34]"
            fill="none"
          >
            <defs>
              <pattern id="home-grid" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M80 0H0V80" stroke="#CBD5E1" strokeOpacity="0.28" strokeWidth="1" />
              </pattern>
              <linearGradient id="home-route" x1="120" y1="210" x2="1260" y2="470" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0891B2" stopOpacity="0.18" />
                <stop offset="0.54" stopColor="#475569" stopOpacity="0.12" />
                <stop offset="1" stopColor="#4F46E5" stopOpacity="0.16" />
              </linearGradient>
            </defs>
            <rect width="1440" height="760" fill="url(#home-grid)" />
            <g stroke="url(#home-route)" strokeWidth="1.3">
              <path d="M54 218c132-66 276-84 424-48 113 28 202 84 320 88 135 5 243-55 378-41 85 9 158 45 264 30" />
              <path d="M18 312c146-42 283-41 420 5 122 42 214 96 342 104 145 9 267-42 413-28 86 8 161 26 247 18" />
              <path d="M76 422c122-26 229-19 340 20 106 38 199 92 319 110 145 22 274-10 420-5 101 4 184 24 264 13" />
            </g>
            <g stroke="#94A3B8" strokeOpacity="0.18" strokeWidth="1">
              <path d="M150 148h210" />
              <path d="M1088 144h176" />
              <path d="M1032 610h220" />
            </g>
          </svg>
          <div className="absolute left-[50%] top-[6rem] hidden text-[9rem] font-semibold uppercase tracking-[0.18em] text-slate-300/[0.08] lg:block">
            SYSTEMS
          </div>
          <div className="absolute right-12 top-[20rem] hidden text-[6rem] font-semibold uppercase tracking-[0.2em] text-cyan-300/[0.07] lg:block">
            CLARITY
          </div>
          <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.92),rgba(255,255,255,0))]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              BringhurstDO LLC
            </p>
            <h1 className="mt-4 max-w-4xl font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-tight">
              Engineering documentation for the high-stakes practitioner.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Clinical workflow, industrial compliance, and learning tools built
              to reduce friction without sacrificing rigor.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/syncsoap"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Join the SyncSOAP beta
              </Link>
              <Link href="/innovation" className={cardLinkClass}>
                How we build
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center rounded-full border border-sky-200/70 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
                Clinical systems
              </span>
              <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
                Safety infrastructure
              </span>
              <span className="inline-flex items-center rounded-full border border-indigo-200/70 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
                Learning tools
              </span>
            </div>
          </div>

          <div className="relative lg:col-span-6">
            <div className="absolute inset-0 rounded-[2rem] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.72),rgba(241,245,249,0.38))] blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    One studio, three environments
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-slate-900">
                    A systems studio for high-stakes work
                  </h2>
                </div>
                <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
                  Founder-led
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl border border-slate-200/80 bg-[linear-gradient(to_bottom,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Systems map
                  </p>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 min-w-[8.5rem] items-center rounded-xl border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-900">
                        Clinical workflow
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-sky-300 to-slate-300" />
                    </div>
                    <div className="flex items-center gap-3 pl-6">
                      <div className="flex h-10 min-w-[9rem] items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800">
                        Documentation systems
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-slate-300 to-amber-300" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 min-w-[8rem] items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-900">
                        Compliance rigor
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-amber-300 to-indigo-300" />
                    </div>
                    <div className="flex items-center gap-3 pl-10">
                      <div className="flex h-10 min-w-[7.5rem] items-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-900">
                        Learning loops
                      </div>
                    </div>
                  </div>
                  <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-600">
                    Different domains, same requirement: software must support
                    judgment, reduce administrative drag, and remain dependable
                    when the stakes are high.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200/80 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Studio manifesto
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      Build tools that feel calm, durable, and useful inside the
                      environments where messy software causes the most harm.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.98),rgba(250,248,244,0.94))] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Principles
                    </p>
                    <div className="mt-3 space-y-2">
                      {heroPrinciples.map((principle) => (
                        <div
                          key={principle}
                          className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700"
                        >
                          {principle}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200/80 bg-[linear-gradient(to_right,rgba(248,250,252,0.96),rgba(255,255,255,0.96))] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Studio thesis
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Better systems reduce documentation drag, preserve precision,
                  and let practitioners spend more energy on the work that
                  actually matters.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          What we build
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Three product lanes, one shared point of view: software should reduce
          friction while remaining trustworthy under real operational pressure.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {products.map((product) => (
            <Card
              key={product.href}
              className={`${product.span} relative min-h-[300px] overflow-hidden justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${product.cardClass}`}
            >
              <div className="absolute right-5 top-5 h-20 w-20 rounded-full bg-white/40 blur-2xl" aria-hidden />
              <CardHeader className="relative border-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {product.eyebrow}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl">{product.title}</CardTitle>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${product.badgeClass}`}>
                    {product.badge}
                  </span>
                </div>
                <CardDescription className="max-w-2xl text-base">
                  {product.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="relative mt-auto flex-col items-start gap-5 border-0 pt-0">
                <div className="w-full">{renderProductPreview(product.theme)}</div>
                <Link href={product.href} className={cardLinkClass}>
                  {product.cta}
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-[linear-gradient(to_bottom,rgba(248,250,252,0.82),rgba(250,248,244,0.86))] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Why this studio exists
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Better systems support better work in the clinic and on the plant
              floor.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              BringhurstDO LLC exists to make high-stakes documentation easier
              to trust, easier to maintain, and less exhausting to live inside.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {studioPrinciples.map((principle) => (
              <div
                key={principle.title}
                className="rounded-2xl border border-white/70 bg-white/88 p-6 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-sm"
              >
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  {principle.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  {principle.body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/founder" className={cardLinkClass}>
              Meet the founder
            </Link>
            <Link
              href="/innovation"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Explore our philosophy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
