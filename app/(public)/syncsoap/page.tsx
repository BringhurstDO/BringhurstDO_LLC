import type { Metadata } from "next";
import Link from "next/link";

import { ProductStoryLayout } from "@/components/product-story-layout";
import { SyncSoapHeroCarousel } from "@/components/syncsoap-hero-carousel";

export const metadata: Metadata = {
  title: "SyncSOAP",
  description:
    "AI-assisted draft SOAP documentation for clinicians. The clinician reviews the draft. Clinical judgment stays with the clinician.",
};

const CTA_SECTION_ID = "see-syncsoap";

export default function SyncSoapPage() {
  return (
    <>
      <div className="relative overflow-hidden border-b border-border/60 bg-syncsoap-hex-lattice">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-background/78 to-background"
          aria-hidden
        />
        <div className="relative">
          <SyncSoapHeroCarousel />
        </div>
      </div>
      <ProductStoryLayout
        heroHeadline="The visit, already in the note."
        heroSubheadline="SyncSOAP drafts the SOAP note from the encounter. You review it, then take it to the chart."
        problem="The note starts after the thinking is done. Clinicians need that work captured while it is fresh: fast enough for a full clinic, accurate enough to trust, and steady enough to rely on every day."
        solution="SyncSOAP builds a draft SOAP note from the encounter. The conversation, your findings, and clinical images land in one structured note. You review it, tighten it, and carry the finished note into the chart."
        features={[
          "Draft SOAP from the conversation",
          "Findings and clinical images in the same note",
          "Your review, then the chart",
        ]}
        outcome="Walk out with the visit already in a draft you can finish the same day. Coming next is the start of the day: read-first pre-charting with one practice and one EHR, so the history you need is waiting, and you place the note in the chart yourself. A closer tie to the EHR follows when it saves more of that work."
        ctaLabel="See SyncSOAP"
        ctaHref="https://syncsoap.com/"
        ctaExternal
        ctaSectionId={CTA_SECTION_ID}
      />
      <section className="border-t border-border/60 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-primary">
            Research
          </h2>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Interim AMIA 2026 findings from a controlled mock-case study are
            preliminary and come from simulated encounters. They show promising
            early results for documentation time and note completeness.
          </p>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link
              href="https://syncsoap.com/research/syncsoap-amia-2026-interim-poster.pdf"
              className="text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the AMIA poster
            </Link>
            <Link
              href="https://syncsoap.com/pilots-investors"
              className="text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Pilots and research
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
