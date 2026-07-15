import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How BringhurstDO LLC collects, uses, and protects information on bringhurstdo.com and related internal tools.",
  alternates: {
    canonical: "/privacy",
  },
};

const lastUpdated = "July 15, 2026";

const sections = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      "BringhurstDO LLC (\"BringhurstDO,\" \"we,\" \"us\") operates bringhurstdo.com and related internal business tools. This Privacy Policy explains what information we collect, how we use it, and the choices available to you.",
      "This policy applies to visitors of our public website and to authorized operators who use our private internal operations tools. It does not replace product-specific privacy terms that may apply to separate applications such as SyncSOAP or SyncSafety when those products offer their own user accounts or clinical workflows.",
    ],
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    paragraphs: [
      "Public website. When you visit bringhurstdo.com, our hosting provider may automatically receive standard technical information such as your IP address, browser type, device type, referring URL, and the pages you request. We do not use third-party advertising cookies on the public marketing site.",
      "Website analytics. We use Vercel Web Analytics to understand anonymous, aggregate website traffic such as page views, referring sites, approximate geography, browser, and device type. Vercel Web Analytics does not use third-party cookies, and we exclude visits to the private /ops console from this collection.",
      "Contact and business inquiries. If you contact us by email or through a business channel, we receive the information you choose to send, such as your name, email address, organization, and message content.",
      "Authorized internal tools. Access to our private operations dashboard is restricted to authorized personnel. Those tools may store business metadata such as content drafts, campaign labels, publication targets, and operational notes. They are designed not to store protected health information, patient identifiers, clinical encounter content, or similar sensitive records.",
      "LinkedIn integration (authorized operators only). If an authorized operator connects a LinkedIn account to our internal publishing tools, LinkedIn may share account and authorization information with us through OAuth, such as a member identifier, display name, authorized scopes, and tokens needed to publish or reshare content on behalf of accounts the operator administers. We use this integration only for operator-approved social publishing workflows initiated inside our internal tools.",
    ],
  },
  {
    id: "how-we-use-information",
    title: "How we use information",
    paragraphs: [
      "We use information to operate and improve our website, respond to inquiries, maintain security, and support authorized internal business operations.",
      "For LinkedIn-connected workflows, we use authorization data solely to maintain the connection, publish or reshare content after explicit operator approval, refresh access when required, and maintain a metadata-only audit record of publishing actions. We do not sell personal information or use LinkedIn authorization data for unrelated advertising.",
    ],
  },
  {
    id: "sharing",
    title: "Sharing and service providers",
    paragraphs: [
      "We may share information with service providers that help us host the website, operate infrastructure, store encrypted credentials, or deliver authorized publishing actions. These providers process information on our instructions and for business purposes such as hosting, database storage, and API connectivity.",
      "When an authorized operator publishes through LinkedIn, the content and associated account action are transmitted to LinkedIn under LinkedIn's own terms and privacy policy.",
      "We may also disclose information if required by law, to protect our rights or safety, or in connection with a business transfer subject to appropriate safeguards.",
    ],
  },
  {
    id: "retention-security",
    title: "Retention and security",
    paragraphs: [
      "We retain information only as long as reasonably necessary for the purposes described in this policy, unless a longer retention period is required by law or legitimate business need.",
      "We apply administrative, technical, and organizational safeguards designed to protect information, including restricted access to internal tools, encryption of sensitive OAuth tokens at rest, and separation between public marketing content and private operational systems. No method of transmission or storage is completely secure.",
    ],
  },
  {
    id: "your-choices",
    title: "Your choices and rights",
    paragraphs: [
      "You may choose not to provide information beyond what is automatically collected when browsing the public website.",
      "Authorized operators may disconnect LinkedIn accounts from our internal tools at any time through the accounts management interface. Disconnecting removes stored connection credentials from our systems, subject to routine backup and audit retention windows.",
      "Depending on where you live, you may have rights to access, correct, delete, or restrict certain processing of personal information. To make a request, contact us using the information below.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "Our website and internal business tools are not directed to children under 13, and we do not knowingly collect personal information from children.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. When we do, we will revise the \"Last updated\" date at the top of this page. Material changes may also be noted on the website or through other reasonable notice.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "Questions about this Privacy Policy or our data practices may be sent to BringhurstDO LLC at office@bringhurstdo.com.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/[0.04] via-card/40 to-background px-4 py-14 sm:px-6 sm:py-20">
        <div className="relative mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Legal
          </p>
          <h1 className="mt-3 max-w-4xl font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-tight">
            Privacy Policy
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            How BringhurstDO LLC handles information on our public website and
            in authorized internal business tools, including our private social
            publishing integration.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <aside className="lg:col-span-4">
            <div className="rounded-xl border border-border/80 bg-card/40 p-5 lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                On this page
              </p>
              <nav className="mt-4 grid gap-2 text-sm" aria-label="Privacy policy sections">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
              <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                For LinkedIn Developer app registration, use{" "}
                <span className="font-mono text-foreground">
                  https://www.bringhurstdo.com/privacy
                </span>
                .
              </p>
            </div>
          </aside>

          <div className="lg:col-span-8">
            <div className="space-y-10">
              {sections.map((section) => (
                <article
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24 rounded-xl border border-border/80 bg-background/80 p-6 sm:p-8"
                >
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-4 text-base leading-relaxed text-muted-foreground">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-10 rounded-xl border border-border/80 bg-card/30 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-foreground">
                Related pages
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Return to the{" "}
                <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
                  homepage
                </Link>{" "}
                or learn more about our work on the{" "}
                <Link
                  href="/innovation"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Innovation
                </Link>{" "}
                page.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
