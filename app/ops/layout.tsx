import type { Metadata } from "next";

import { OpsTopNav } from "@/app/ops/_components/ops-ui";

export const metadata: Metadata = {
  title: "Operator Console",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OpsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // TODO: Basic Auth is temporary. Before adding mutation features, use
  // Vercel Deployment Protection/SSO or a real auth provider with audit trails.
  return (
    <div className="min-h-dvh bg-[#f5f7fa] text-slate-950">
      <OpsTopNav />
      {children}
    </div>
  );
}
