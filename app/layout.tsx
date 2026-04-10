import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BringhurstDO LLC",
    template: "%s · BringhurstDO LLC",
  },
  description:
    "Engineering documentation for the high-stakes practitioner. Clinical, industrial, and learning tools.",
  metadataBase: new URL("https://www.bringhurstdo.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "BringhurstDO LLC",
    title: "BringhurstDO LLC",
    description:
      "Engineering documentation for the high-stakes practitioner. Clinical, industrial, and learning tools.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "BringhurstDO LLC",
    description:
      "Engineering documentation for the high-stakes practitioner. Clinical, industrial, and learning tools.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/Icon-BringhurstDOLLC.svg",
    apple: "/Icon-BringhurstDOLLC.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} min-h-dvh antialiased`}
      >
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
