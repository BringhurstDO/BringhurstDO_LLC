import fs from "node:fs";
import path from "node:path";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

function founderHeadshotOnDisk(): boolean {
  try {
    return fs.existsSync(
      path.join(process.cwd(), "public", "founder-headshot.jpg"),
    );
  } catch {
    return false;
  }
}

export const metadata: Metadata = {
  title: "Meet the Founder",
  description:
    "Kyle Joshua Bringhurst — Doctor of Osteopathic Medicine candidate at NSU and former safety professional — founded BringhurstDO LLC to remove documentation friction in clinical and industrial settings.",
};

const founderFacts = [
  "Doctor of Osteopathic Medicine candidate",
  "Former safety professional",
  "Founder of BringhurstDO LLC",
  "Builder of SyncSOAP, SyncSafety, and NBOME Pearl Injector",
] as const;

const currentWork = [
  {
    title: "SyncSOAP",
    href: "/syncsoap",
    body: "Clinical documentation support built for the realities of patient encounters, charting load, and physician workflow.",
  },
  {
    title: "SyncSafety",
    href: "/syncsafety",
    body: "Safety and compliance infrastructure focused on rigorous records without burying teams in administrative clean-up.",
  },
  {
    title: "NBOME Pearl Injector",
    href: "/anki",
    body: "A service-minded Anki project for COMLEX learners that reduces study friction inside the workflow they already use.",
  },
] as const;

const operatingPrinciples = [
  {
    title: "Practitioner-informed",
    body: "The work starts from real operating environments, not abstract feature lists.",
  },
  {
    title: "Compliance-conscious",
    body: "Systems should reduce risk and ambiguity, not create new layers of it.",
  },
  {
    title: "Security-first",
    body: "Sensitive workflows demand clear permissions, trustworthy defaults, and durable architecture.",
  },
  {
    title: "Built for real workflows",
    body: "The best software respects the pace, pressure, and constraints of the people using it.",
  },
] as const;

const founderTimeline = [
  {
    step: "01",
    phase: "Safety",
    timeframe: "BYU-Idaho -> Volvo Group Trucks",
    title: "Industrial safety built the operating lens.",
    body: "Training in occupational health and safety, followed by hands-on work as a Health and Safety Specialist, shaped an approach centered on systems, risk control, and documentation that holds up under pressure.",
    tags: ["Occupational Health & Safety", "Volvo Group Trucks", "Risk systems"],
    accentClass:
      "border-amber-200/80 bg-[linear-gradient(to_bottom,rgba(255,251,235,0.98),rgba(255,255,255,0.92))]",
    pillClass:
      "border-amber-200 bg-amber-50 text-amber-900",
    nodeClass:
      "border-amber-300 bg-amber-50 text-amber-900 shadow-[0_10px_24px_-16px_rgba(217,119,6,0.55)]",
  },
  {
    step: "02",
    phase: "Medicine",
    timeframe: "NSU-KPCOM -> Gulf Coast Paincare",
    title: "Clinical training sharpened the human stakes.",
    body: "Osteopathic medical training and clinical support work made the documentation burden personal: software should support judgment, preserve attention, and reduce avoidable friction in patient care.",
    tags: ["DO candidate", "NSU-KPCOM", "Clinical workflow"],
    accentClass:
      "border-indigo-200/80 bg-[linear-gradient(to_bottom,rgba(238,242,255,0.92),rgba(255,255,255,0.96))]",
    pillClass:
      "border-indigo-200 bg-indigo-50 text-indigo-900",
    nodeClass:
      "border-indigo-300 bg-indigo-50 text-indigo-900 shadow-[0_10px_24px_-16px_rgba(79,70,229,0.55)]",
  },
  {
    step: "03",
    phase: "Building SyncSOAP",
    timeframe: "BringhurstDO LLC",
    title: "SyncSOAP emerged from charting fatigue and workflow drag.",
    body: "The medical side of the work became a focused product thesis: use AI responsibly to reduce note burden, protect clinical flow, and make documentation feel like support rather than interference.",
    tags: ["Clinical documentation", "AI scribe", "Burnout reduction"],
    accentClass:
      "border-slate-200/90 bg-[linear-gradient(to_bottom,rgba(241,245,249,0.95),rgba(255,255,255,0.98))]",
    pillClass:
      "border-slate-200 bg-slate-50 text-slate-700",
    nodeClass:
      "border-slate-300 bg-white text-slate-800 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.35)]",
  },
  {
    step: "04",
    phase: "Building SyncSafety",
    timeframe: "BringhurstDO LLC",
    title: "SyncSafety brought the safety background back into software.",
    body: "The same systems thinking was applied to compliance and incident workflows, turning safety administration into a product built for rigor, traceability, and less paperwork overhead.",
    tags: ["Compliance", "Incident systems", "Administrative relief"],
    accentClass:
      "border-sky-200/80 bg-[linear-gradient(to_bottom,rgba(240,249,255,0.95),rgba(255,255,255,0.96))]",
    pillClass:
      "border-sky-200 bg-sky-50 text-sky-900",
    nodeClass:
      "border-sky-300 bg-sky-50 text-sky-900 shadow-[0_10px_24px_-16px_rgba(2,132,199,0.45)]",
  },
] as const;

export default function FounderPage() {
  const hasHeadshot = founderHeadshotOnDisk();

  return (
    <div className="bg-[linear-gradient(to_bottom,#f8fafc,#f8fafc_34%,#fdfcf9_100%)] font-sans text-slate-800">
      {/* Hero — asymmetrical studio layout; portrait anchors left with overlap */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_48%,rgba(250,248,244,0.92)_100%)]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <svg
            viewBox="0 0 1440 760"
            className="absolute inset-0 h-full w-full opacity-[0.38]"
            fill="none"
          >
            <defs>
              <pattern id="founder-grid" width="72" height="72" patternUnits="userSpaceOnUse">
                <path
                  d="M72 0H0V72"
                  stroke="#CBD5E1"
                  strokeOpacity="0.32"
                  strokeWidth="1"
                />
              </pattern>
              <linearGradient id="founder-contour" x1="84" y1="84" x2="1260" y2="560" gradientUnits="userSpaceOnUse">
                <stop stopColor="#D97706" stopOpacity="0.18" />
                <stop offset="0.45" stopColor="#475569" stopOpacity="0.12" />
                <stop offset="1" stopColor="#4F46E5" stopOpacity="0.14" />
              </linearGradient>
            </defs>
            <rect width="1440" height="760" fill="url(#founder-grid)" />
            <g stroke="url(#founder-contour)" strokeWidth="1.35">
              <path d="M56 190c118-70 249-92 388-70 84 13 159 51 246 58 113 9 224-35 333-17 92 15 168 66 361 40" />
              <path d="M30 254c137-55 272-66 420-34 80 18 151 48 234 54 122 10 226-36 350-23 119 13 213 76 376 42" />
              <path d="M72 334c118-48 221-61 339-36 112 24 202 74 317 82 127 9 234-32 356-21 100 9 192 48 326 18" />
              <path d="M118 422c94-26 176-28 261-10 117 25 221 83 350 91 136 9 253-39 389-30 84 6 158 30 252 17" />
              <path d="M142 516c87-12 166-4 251 22 106 33 198 83 318 94 152 14 288-32 438-20 60 5 117 15 190 11" />
            </g>
            <g stroke="#94A3B8" strokeOpacity="0.2" strokeWidth="1">
              <path d="M160 122h190" />
              <path d="M1094 166h172" />
              <path d="M1016 586h210" />
            </g>
          </svg>
          <div className="absolute left-8 top-8 h-16 w-16 border-l border-t border-slate-300/70" />
          <div className="absolute right-8 top-8 h-16 w-16 border-r border-t border-slate-300/70" />
          <div className="absolute bottom-8 left-8 h-16 w-16 border-b border-l border-slate-300/70" />
          <div className="absolute bottom-8 right-8 h-16 w-16 border-b border-r border-slate-300/70" />
          <div className="absolute inset-y-0 right-[-10rem] hidden w-[38rem] rotate-[-8deg] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.72),rgba(241,245,249,0.42))] shadow-[0_40px_120px_-70px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 lg:block" />
          <div className="absolute left-[44%] top-[16%] hidden h-56 w-80 rotate-[5deg] rounded-[2rem] bg-white/35 shadow-[0_35px_100px_-70px_rgba(15,23,42,0.3)] ring-1 ring-white/70 backdrop-blur-[2px] lg:block" />
          <div className="absolute left-[39%] top-[26%] hidden h-44 w-72 rotate-[-6deg] rounded-[2rem] bg-[linear-gradient(to_bottom,rgba(255,247,237,0.36),rgba(238,242,255,0.24))] shadow-[0_30px_90px_-70px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/70 lg:block" />
          <div className="absolute left-[50%] top-14 hidden text-[10rem] font-semibold uppercase tracking-[0.18em] text-slate-300/[0.08] lg:block">
            SYSTEMS
          </div>
          <div className="absolute right-10 top-[22rem] hidden text-[7rem] font-semibold uppercase tracking-[0.22em] text-indigo-300/[0.07] lg:block">
            WORKFLOW
          </div>
          <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.94),rgba(255,255,255,0))]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,rgba(250,248,244,0.86),rgba(250,248,244,0))]" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:pb-24">
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-10 lg:gap-y-6">
            <div className="relative z-10 flex justify-center lg:col-span-5 lg:justify-start">
              <div className="relative w-full max-w-[min(100%,380px)] lg:max-w-none lg:-mt-10">
                <div className="absolute -left-5 top-8 hidden h-[88%] w-full rounded-[2rem] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.78),rgba(248,250,252,0.52))] shadow-[0_40px_100px_-70px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 lg:block" />
                <div className="absolute -right-4 bottom-6 hidden h-[76%] w-[92%] rounded-[2rem] border border-amber-100/80 bg-[linear-gradient(to_bottom,rgba(255,251,235,0.58),rgba(255,255,255,0.26))] shadow-[0_30px_90px_-72px_rgba(217,119,6,0.28)] lg:block" />
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-white/70 shadow-[0_28px_60px_-15px_rgba(15,23,42,0.26)] ring-1 ring-slate-300/70">
                  {hasHeadshot ? (
                    <Image
                      src="/founder-headshot.jpg"
                      alt="Kyle Joshua Bringhurst"
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      priority
                    />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-100 to-slate-200/90 p-6 text-center">
                      <span className="text-sm font-medium text-slate-600">
                        Headshot placeholder
                      </span>
                      <span className="max-w-[14rem] text-xs leading-relaxed text-slate-500">
                        Add{" "}
                        <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[0.65rem] text-slate-700 ring-1 ring-slate-200">
                          public/founder-headshot.jpg
                        </code>{" "}
                        to show your portrait here.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-col justify-center lg:col-span-7 lg:min-h-[min(52vh,420px)] lg:pl-4">
              <div className="absolute -left-8 top-0 hidden h-full w-px bg-[linear-gradient(to_bottom,rgba(148,163,184,0),rgba(148,163,184,0.36),rgba(148,163,184,0))] lg:block" />
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Founder · BringhurstDO LLC
              </p>
              <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[2.75rem] lg:leading-[1.1] xl:text-6xl">
                Kyle Joshua Bringhurst
              </h1>
              <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-slate-600 sm:text-xl">
                Building software at the intersection of industrial safety,
                osteopathic medical training, and high-stakes documentation
                workflows.
              </p>
              <div className="mt-8 flex max-w-2xl flex-wrap gap-2">
                {founderFacts.map((fact) => (
                  <span
                    key={fact}
                    className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm shadow-slate-900/5 backdrop-blur-sm"
                  >
                    {fact}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder timeline */}
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.94),rgba(248,250,252,0.96))] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Founder timeline
            </p>
            <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              From safety and medicine to software shaped by both
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              The company point of view was not invented in the abstract. It was
              formed in sequence: first safety, then medicine, then products
              shaped by the operational reality of both.
            </p>
          </div>

          <div className="relative mt-12">
            <div
              className="absolute bottom-0 left-[0.8rem] top-0 w-px bg-gradient-to-b from-amber-300 via-indigo-300 to-sky-300 lg:left-0 lg:right-0 lg:top-[1.4rem] lg:h-px lg:w-auto"
              aria-hidden
            />
            <div className="grid gap-8 lg:grid-cols-4 lg:gap-6">
              {founderTimeline.map((item) => (
                <article
                  key={item.step}
                  className="relative pl-8 lg:pl-0"
                >
                  <div
                    className={`absolute left-0 top-1.5 flex size-6 items-center justify-center rounded-full text-[10px] font-semibold tracking-[0.14em] lg:left-1/2 lg:top-0 lg:-translate-x-1/2 ${item.nodeClass}`}
                    aria-hidden
                  >
                    {item.step}
                  </div>
                  <div className={`rounded-2xl border p-6 shadow-sm ring-1 ring-slate-900/5 lg:mt-10 ${item.accentClass}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {item.phase}
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                      {item.timeframe}
                    </p>
                    <h3 className="mt-4 font-serif text-xl font-semibold tracking-tight text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-slate-600">
                      {item.body}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${item.pillClass}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Founder rationale */}
      <section className="border-b border-slate-200/70 bg-[linear-gradient(to_bottom,rgba(248,250,252,0.92),rgba(250,248,244,0.82))] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Why this company exists
          </h2>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-slate-600">
            <p>
              BringhurstDO LLC exists because the same problem appears in more
              than one domain: high-stakes professionals are too often trapped
              inside software that adds friction exactly where clarity matters
              most.
            </p>
            <p>
              In medicine, that friction shows up as documentation burden,
              delayed chart closure, and systems that compete with clinical
              attention. In safety and compliance, it shows up as duplicated
              records, paperwork drag, and preventable risk created by messy
              process.
            </p>
            <p>
              The studio was built to respond to that pattern directly: design
              tools that reduce avoidable administrative load while preserving
              rigor, traceability, and trust.
            </p>
          </div>
        </div>
      </section>

      {/* Current work */}
      <section className="border-b border-slate-200/70 bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Current work
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              The product work reflects the same founder thesis across
              different environments: remove friction, preserve precision, and
              respect the real workflow.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
            {currentWork.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200/90 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.98),rgba(248,250,252,0.88))] p-6 shadow-sm ring-1 ring-slate-900/5"
              >
                <h3 className="font-serif text-xl font-semibold tracking-tight text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-slate-600">
                  {item.body}
                </p>
                <Link
                  href={item.href}
                  className="mt-5 inline-flex text-sm font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-950 hover:decoration-slate-500"
                >
                  Explore {item.title}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Operating style */}
      <section className="bg-[linear-gradient(to_bottom,rgba(248,250,252,0.44),rgba(255,255,255,0.92))] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <h2 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Operating principles
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                As the company grows, these principles are meant to scale beyond
                one founder and become the standard for the team itself.
              </p>
            </div>
            <div className="grid gap-6 lg:col-span-8 md:grid-cols-2">
              {operatingPrinciples.map((principle) => (
                <div
                  key={principle.title}
                  className="rounded-xl border border-slate-200/90 bg-white/90 p-6 shadow-sm ring-1 ring-slate-900/5"
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
          </div>
        </div>
      </section>

      {/* Mission — centered, sage-adjacent frame */}
      <section className="px-4 pb-16 pt-4 sm:px-6 sm:pb-24 sm:pt-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-slate-200/90 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.98),rgba(248,250,252,0.88))] px-8 py-10 shadow-sm ring-1 ring-emerald-950/5 sm:px-12 sm:py-14">
            <h2 className="text-center font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              The mission
            </h2>
            <p className="mt-8 text-center text-lg leading-relaxed text-slate-600">
              BringhurstDO LLC was founded to eliminate the administrative
              friction that leads to burnout and compliance failure. From
              SyncSOAP to SyncSafety, the mission is to build tools that work as
              hard as the practitioners using them.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
