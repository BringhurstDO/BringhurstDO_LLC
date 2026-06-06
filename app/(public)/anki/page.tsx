import type { Metadata } from "next";
import { BookOpenText, GraduationCap, KeyRound } from "lucide-react";

import { ProductStoryLayout } from "@/components/product-story-layout";

const ANKI_WEB_URL = "https://ankiweb.net/shared/info/304567120";

const CTA_SECTION_ID = "ankiweb-link";

export const metadata: Metadata = {
  title: {
    absolute: "Anki Add-on | BringhurstDO LLC",
  },
  description:
    "A giving-back project from BringhurstDO LLC for COMLEX learners: a BYOK Anki add-on that adds NBOME-focused pearls to UWorld-tagged cards inside an AnKing workflow.",
};

export default function AnkiPage() {
  return (
    <ProductStoryLayout
      theme="editorial"
      heroSectionClassName="bg-anki-editorial-lattice"
      heroHeadline="NBOME Pearl Injector: Built to Help DO Students Study, Not Wrestle Their Decks."
      heroSubheadline="A small giving-back project from BringhurstDO LLC for COMLEX learners who want more reinforcement and less flashcard maintenance."
      heroBadges={[
        "Open source",
        "Bring your own API key",
        "Built for COMLEX learners",
      ]}
      problem="High-yield NBOME nuance is often scattered across question banks, tags, and half-remembered review sessions. Students lose time hunting for patterns they should be consolidating."
      solution="NBOME Pearl Injector brings those pearls closer to the cards you already use. Inside an AnKing-style UWorld workflow, it helps surface concise COMLEX-focused reinforcement directly where you study."
      features={[
        {
          title:
            "Bring-your-own-key workflow: you use your own Gemini key, your own quota, and keep control of usage",
          icon: <KeyRound className="size-4" />,
        },
        {
          title:
            "Built around the common AnKing Step 1, Step 2, and Step 3 UWorld tag structure described in the README",
          icon: <BookOpenText className="size-4" />,
        },
        {
          title:
            "Supports focused review workflows such as pasted UWorld IDs, Today's Reviews, and optional batch scheduling actions",
          icon: <GraduationCap className="size-4" />,
        },
      ]}
      outcome="The strategy is simple: reduce friction, reinforce what matters, and give COMLEX students a practical study aid that feels native to the deck workflow they already rely on. It is a service-minded tool, not a monetized platform."
      ctaLabel="View on AnkiWeb"
      ctaHref={ANKI_WEB_URL}
      ctaSectionId={CTA_SECTION_ID}
      ctaPendingTitle="Set ANKI_WEB_URL in app/anki/page.tsx to the public AnkiWeb add-on URL."
      ctaExternal
    />
  );
}
