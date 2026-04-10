import type { ReactNode } from "react";

import { CheckCircle2 } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductPrimaryCta } from "@/components/product-primary-cta";
import { isPendingHref } from "@/lib/pending-link";

export type ProductStoryLayoutProps = {
  heroHeadline: string;
  /** Optional subheadline under the hero title. */
  heroSubheadline?: string;
  problem: string;
  solution: string;
  features: readonly (string | { title: string; icon?: ReactNode })[];
  outcome: string;
  ctaLabel: string;
  ctaHref: string;
  /** Anchor id for the outcome / CTA block (must match hash in `ctaHref` if used). */
  ctaSectionId: string;
  /** Tooltip when `ctaHref` is still `#` or empty (bright-red CTA). */
  ctaPendingTitle?: string;
  /** When true, primary CTA opens in a new tab (e.g. external GitHub URL). */
  ctaExternal?: boolean;
  /** Small badges/ribbons shown above the hero title. */
  heroBadges?: readonly string[];
  /** Page-specific visual treatment while preserving default styling elsewhere. */
  theme?: "default" | "editorial";
  /** Optional extra class for the hero section background treatment. */
  heroSectionClassName?: string;
};

function StoryBlock({
  kicker,
  body,
  theme = "default",
}: {
  kicker: string;
  body: string;
  theme?: "default" | "editorial";
}) {
  const kickerClass =
    theme === "editorial"
      ? "text-sm font-semibold uppercase tracking-[0.18em] text-[#4338CA]"
      : "text-sm font-medium uppercase tracking-wide text-primary";
  const bodyClass =
    theme === "editorial"
      ? "text-lg leading-relaxed text-slate-600"
      : "text-lg leading-relaxed text-muted-foreground";

  return (
    <div className="space-y-3">
      <h2 className={kickerClass}>{kicker}</h2>
      <p className={bodyClass}>{body}</p>
    </div>
  );
}

export function ProductStoryLayout({
  heroHeadline,
  heroSubheadline,
  problem,
  solution,
  features,
  outcome,
  ctaLabel,
  ctaHref,
  ctaSectionId,
  ctaPendingTitle,
  ctaExternal,
  heroBadges,
  theme = "default",
  heroSectionClassName,
}: ProductStoryLayoutProps) {
  const isEditorial = theme === "editorial";
  const shellClass = isEditorial ? "bg-[#F8F7F3] text-[#1E293B]" : "";
  const heroSectionClass = isEditorial
    ? "border-b border-[#ddd7cc] bg-[linear-gradient(to_bottom,rgba(79,70,229,0.06),#F8F7F3)] px-4 py-16 sm:px-6 sm:py-24"
    : "border-b border-border/60 bg-gradient-to-b from-card/40 to-background px-4 py-16 sm:px-6 sm:py-24";
  const heroTitleClass = isEditorial
    ? "max-w-4xl text-4xl font-semibold tracking-tight text-[#1E293B] sm:text-5xl sm:leading-tight"
    : "max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-tight";
  const heroSubClass = isEditorial
    ? "mt-6 max-w-3xl text-xl leading-relaxed text-slate-600 sm:text-2xl"
    : "mt-6 max-w-3xl text-xl leading-relaxed text-muted-foreground sm:text-2xl";
  const bodySectionClass = isEditorial
    ? "mx-auto max-w-6xl bg-[#F8F7F3] px-4 py-16 sm:px-6 sm:py-20"
    : "mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20";
  const outcomeCardClass = isEditorial
    ? "scroll-mt-28 space-y-5 rounded-2xl border border-[#ddd7cc] bg-[linear-gradient(to_bottom,rgba(79,70,229,0.05),rgba(255,255,255,0.72))] p-6 shadow-sm shadow-[#4338CA]/[0.05] sm:p-8"
    : "scroll-mt-28 space-y-5 rounded-xl border border-border/80 bg-card/40 p-6 sm:p-8";
  const outcomeKickerClass = isEditorial
    ? "text-sm font-semibold uppercase tracking-[0.18em] text-[#4338CA]"
    : "text-sm font-medium uppercase tracking-wide text-primary";
  const outcomeTextClass = isEditorial
    ? "text-lg leading-relaxed text-[#1E293B]"
    : "text-lg leading-relaxed text-foreground";
  const featureHeadingClass = isEditorial
    ? "mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#7C3AED]"
    : "mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground";
  const featureCardClass = isEditorial
    ? "border-[#ddd7cc] bg-[rgba(79,70,229,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#4338CA]/30 hover:bg-[rgba(192,132,252,0.08)] hover:shadow-md hover:shadow-[#4338CA]/[0.06]"
    : "border-border/80 bg-card/60 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md";
  const featureTitleClass = isEditorial
    ? "text-base leading-snug text-[#1E293B]"
    : "text-base leading-snug";
  const defaultFeatureIconClass = isEditorial
    ? "mt-0.5 size-5 shrink-0 text-[#4338CA]"
    : "mt-0.5 size-5 shrink-0 text-primary";
  const customFeatureIconWrapClass = isEditorial
    ? "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[rgba(67,56,202,0.08)] text-[#4338CA]"
    : "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary";
  const badgeClass = isEditorial
    ? "inline-flex items-center rounded-full border border-[#ddd7cc] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#1E293B] shadow-sm shadow-[#4338CA]/[0.04]"
    : "inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground";

  return (
    <div className={shellClass}>
      <section
        className={`${heroSectionClass}${heroSectionClassName ? ` ${heroSectionClassName}` : ""}`}
      >
        <div className="mx-auto max-w-6xl">
          {heroBadges && heroBadges.length > 0 ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {heroBadges.map((badge) => (
                <span key={badge} className={badgeClass}>
                  {badge}
                </span>
              ))}
            </div>
          ) : null}
          <h1 className={heroTitleClass}>
            {heroHeadline}
          </h1>
          {heroSubheadline ? (
            <p className={heroSubClass}>
              {heroSubheadline}
            </p>
          ) : null}
        </div>
      </section>

      <section className={bodySectionClass}>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-14 lg:col-span-7">
            <StoryBlock kicker="Problem" body={problem} theme={theme} />
            <StoryBlock kicker="Solution" body={solution} theme={theme} />

            <div
              id={ctaSectionId}
              tabIndex={-1}
              className={outcomeCardClass}
            >
              <h2 className={outcomeKickerClass}>Outcome</h2>
              <p className={outcomeTextClass}>{outcome}</p>
              {isPendingHref(ctaHref) ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                  Primary CTA — link not configured (red control is not wired)
                </p>
              ) : null}
              <ProductPrimaryCta
                href={ctaHref}
                pendingTitle={ctaPendingTitle}
                external={ctaExternal}
              >
                {ctaLabel}
              </ProductPrimaryCta>
            </div>
          </div>

          <aside className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
            <h2 className={featureHeadingClass}>Core features</h2>
            <ul className="m-0 list-none space-y-4 p-0" role="list">
              {features.map((feature) => (
                <li key={typeof feature === "string" ? feature : feature.title}>
                  <Card className={featureCardClass}>
                    <CardHeader className="gap-0 border-0 py-4">
                      <div className="flex items-start gap-3">
                        {typeof feature === "string" || !feature.icon ? (
                          <CheckCircle2
                            className={defaultFeatureIconClass}
                            aria-hidden
                          />
                        ) : (
                          <span className={customFeatureIconWrapClass} aria-hidden>
                            {feature.icon}
                          </span>
                        )}
                        <CardTitle className={featureTitleClass}>
                          {typeof feature === "string" ? feature : feature.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </div>
  );
}
