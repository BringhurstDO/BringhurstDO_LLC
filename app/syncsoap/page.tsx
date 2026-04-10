import type { Metadata } from "next";

import { ProductStoryLayout } from "@/components/product-story-layout";
import { SyncSoapHeroCarousel } from "@/components/syncsoap-hero-carousel";

export const metadata: Metadata = {
  title: "SyncSOAP",
  description:
    "AI-powered medical scribe for the modern MD/DO workflow. Gated beta, inactivity lock, HIPAA-ready architecture.",
};

const CTA_SECTION_ID = "join-gated-beta";

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
        heroHeadline="SyncSOAP: The Scribe is the Bottleneck."
        problem="Physicians spend hours after their shift typing notes, risking burnout and documentation errors."
        solution="An AI-powered medical scribe application engineered specifically for the modern MD/DO workflow."
        features={[
          "Secure Gated Beta",
          "Auto-Inactivity Lock",
          "HIPAA-Ready Architecture",
        ]}
        outcome="Chart from home, not the hospital. Reclaim your time."
        ctaLabel="Join the Gated Beta"
        ctaHref={`/syncsoap#${CTA_SECTION_ID}`}
        ctaSectionId={CTA_SECTION_ID}
      />
    </>
  );
}
