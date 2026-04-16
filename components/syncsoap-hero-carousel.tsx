"use client";

import { useEffect, useState } from "react";
import { Camera, Mic } from "lucide-react";

import { ProductPrimaryCta } from "@/components/product-primary-cta";
import { SyncSoapLogo } from "@/components/syncsoap-logo";

const CAROUSEL_INTERVAL_MS = 4500;

export function SyncSoapHeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 5);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden bg-transparent px-4 py-16 md:py-24 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-8 rounded-2xl border border-white/50 bg-white/55 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-800 sm:text-5xl md:text-6xl lg:text-6xl">
              From Patient Conversation to Completed SOAP Note in Seconds.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-800/90">
              SyncSOAP is your ambient AI scribe. Just press record, focus on
              your patient, and let our secure network generate perfectly
              formatted clinical documentation.
            </p>
            <div>
              <ProductPrimaryCta href="https://www.syncsoap.com/" external>
                Join the Gated Beta
              </ProductPrimaryCta>
            </div>
          </div>

          <div className="flex justify-center rounded-2xl border border-white/50 bg-white/50 p-4 shadow-sm backdrop-blur-sm lg:justify-end lg:p-6">
            <div
              className="relative flex min-h-[280px] w-full max-w-md flex-col rounded-xl border-2 border-primary/45 bg-card/95 px-5 py-4 shadow-lg backdrop-blur-sm"
              aria-hidden
            >
              {/* Slide 1: Provider Dashboard */}
              <div
                className={`absolute inset-0 bottom-10 flex flex-col px-5 pt-4 transition-opacity duration-700 ease-in-out ${
                  currentSlide === 0
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <div className="mb-3 flex items-center justify-between border-b border-primary/25 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Provider Dashboard
                  </span>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
                    <span className="rounded-md px-2 py-1 text-[10px] font-medium text-slate-500">
                      View All
                    </span>
                    <span className="rounded-md bg-white px-2 py-1 text-[10px] font-medium text-primary shadow-sm">
                      My Patients
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto">
                  <div className="rounded-lg border border-primary/25 bg-white p-2.5 shadow-sm">
                    <p className="text-[10px] font-medium text-slate-800">
                      55yo M | Dermatology | Room 1
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-emerald-200 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800">
                      Ready for Provider
                    </span>
                  </div>
                  <div className="rounded-lg border border-primary/25 bg-white p-2.5 shadow-sm">
                    <p className="text-[10px] font-medium text-slate-800">
                      45yo F | Family Medicine | Room 2
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-medium text-amber-800">
                      MA Intake
                    </span>
                  </div>
                  <div className="rounded-lg border border-primary/25 bg-white p-2.5 shadow-sm">
                    <p className="text-[10px] font-medium text-slate-800">
                      76yo M | Internal Medicine | Room 3
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-700">
                      Scheduled
                    </span>
                  </div>
                </div>
              </div>

              {/* Slide 2: Clinic Waiting Room */}
              <div
                className={`absolute inset-0 bottom-10 flex flex-col px-5 pt-4 transition-opacity duration-700 ease-in-out ${
                  currentSlide === 1
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <div className="mb-3 flex items-center justify-between border-b border-primary/25 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Clinic Waiting Room
                  </span>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
                    <span className="rounded-md bg-white px-2 py-1 text-[10px] font-medium text-primary shadow-sm">
                      View All
                    </span>
                    <span className="rounded-md px-2 py-1 text-[10px] font-medium text-slate-500">
                      My Patients
                    </span>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <div className="rounded-lg border border-primary/25 bg-white p-3 shadow-sm">
                    <div className="mb-1.5 flex items-center justify-between gap-1">
                      <span className="text-[10px] font-medium text-slate-600">
                        Room 2
                      </span>
                      <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                        KB
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-800">
                      55yo M
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-emerald-200 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800">
                      Ready for Provider
                    </span>
                  </div>
                  <div className="rounded-lg border border-primary/25 bg-white p-3 shadow-sm">
                    <div className="mb-1.5 flex items-center justify-between gap-1">
                      <span className="text-[10px] font-medium text-slate-600">
                        Room 4
                      </span>
                      <span className="rounded bg-indigo-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        DB
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-800">
                      42yo F
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-medium text-amber-800">
                      MA Intake
                    </span>
                  </div>
                </div>
              </div>

              {/* Slide 3: Encounter Recording Page */}
              <div
                className={`absolute inset-0 bottom-10 flex flex-col px-5 pt-4 transition-opacity duration-700 ease-in-out ${
                  currentSlide === 2
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <div className="mb-2 flex items-center justify-between border-b border-primary/25 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Active Encounter: 55yo M
                  </span>
                  <span className="rounded-full bg-blue-200 px-1.5 py-0.5 text-[9px] font-medium text-blue-800">
                    Phase: Provider in Room
                  </span>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_24px_rgba(8,145,178,0.35)]">
                    <Mic className="h-8 w-8" aria-hidden />
                  </div>
                  <p className="font-mono text-2xl font-bold tabular-nums text-slate-800">
                    02:14
                  </p>
                  <p className="animate-pulse text-[11px] text-slate-500">
                    Listening...
                  </p>
                  <div className="flex items-end gap-1">
                    <span
                      className="inline-block h-4 w-0.5 origin-bottom rounded-full bg-primary/60 animate-wave"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="inline-block h-4 w-0.5 origin-bottom rounded-full bg-primary/80 animate-wave"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="inline-block h-4 w-0.5 origin-bottom rounded-full bg-primary animate-wave"
                      style={{ animationDelay: "300ms" }}
                    />
                    <span
                      className="inline-block h-4 w-0.5 origin-bottom rounded-full bg-primary/80 animate-wave"
                      style={{ animationDelay: "450ms" }}
                    />
                    <span
                      className="inline-block h-4 w-0.5 origin-bottom rounded-full bg-primary/60 animate-wave"
                      style={{ animationDelay: "600ms" }}
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-1 flex items-center gap-1.5 rounded-lg border border-primary/50 bg-white/80 px-3 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/5"
                    aria-hidden
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Capture
                  </button>
                </div>
              </div>

              {/* Slide 4: AI Scribe → SOAP */}
              <div
                className={`absolute inset-0 bottom-10 flex flex-col px-5 pt-4 transition-opacity duration-700 ease-in-out ${
                  currentSlide === 3
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 border-b border-primary/25 pb-2">
                  <SyncSoapLogo className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    SyncSOAP → SOAP
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                </div>
                <div className="flex-1 space-y-2 overflow-hidden font-mono text-[11px] leading-relaxed text-slate-800 sm:text-xs">
                  <p>
                    <span className="font-semibold text-primary">S:</span>{" "}
                    Patient, 28yo F, presents with new itchy rash on right
                    forearm... Chief complaint: erythema and pruritus for...
                  </p>
                  <p>
                    <span className="font-semibold text-primary">O:</span> Vitals:
                    T 98.6°F, BP 114/76, P 68. Physical Exam: Maculopapular
                    lesions with excoriation on...
                  </p>
                  <p>
                    <span className="font-semibold text-primary">A:</span>{" "}
                    Assessment: New presentation, possible etiologies
                    include... Differential Diagnoses: contact dermatitis,
                    localized eczema...
                  </p>
                  <p>
                    <span className="font-semibold text-primary">P:</span> Plan:
                    Prescribe topical hydrocortisone 1% for... Return prn if no
                    improvement.
                    <span
                      className="ml-0.5 inline-block h-2.5 w-1.5 animate-pulse rounded-sm bg-primary"
                      aria-hidden
                    />
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 border-t border-slate-200/80 pt-2">
                  <svg
                    className="h-3.5 w-3.5 animate-spin text-slate-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-[11px] text-slate-400 sm:text-xs">
                    Generating final assessment details...
                  </span>
                </div>
              </div>

              {/* Slide 5: Final Review & Attestation */}
              <div
                className={`absolute inset-0 bottom-10 flex flex-col px-5 pt-4 transition-opacity duration-700 ease-in-out ${
                  currentSlide === 4
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <div className="mb-2 border-b border-primary/25 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Final Review & Attestation
                  </span>
                </div>
                <div className="flex-1 space-y-1.5 overflow-hidden font-mono text-[10px] leading-relaxed text-slate-800 sm:text-[11px]">
                  <p>
                    <span className="font-semibold text-primary">
                      Assessment:
                    </span>{" "}
                    Contact dermatitis, right forearm. Localized eczema vs
                    irritant dermatitis on differential.
                  </p>
                  <p>
                    <span className="font-semibold text-primary">Plan:</span>{" "}
                    Topical hydrocortisone 1% BID x 2 weeks. Emollients as
                    needed. Avoid known irritants. Return prn if no improvement
                    or worsening.
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(8,145,178,0.35)] transition hover:bg-primary/90"
                  aria-hidden
                >
                  Sign & Export to EHR
                </button>
              </div>

              <div className="relative z-10 mt-auto flex flex-shrink-0 justify-center gap-1.5 pb-1 pt-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentSlide(i)}
                    className={`h-2 w-2 rounded-full transition-all duration-300 ${
                      currentSlide === i
                        ? "w-5 bg-primary"
                        : "bg-slate-300 hover:bg-slate-400"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
