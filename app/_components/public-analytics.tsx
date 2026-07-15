"use client";

import {
  Analytics,
  type BeforeSendEvent,
} from "@vercel/analytics/next";

function isPrivateOpsUrl(value: string) {
  try {
    const pathname = new URL(value).pathname;
    return pathname === "/ops" || pathname.startsWith("/ops/");
  } catch {
    return value === "/ops" || value.startsWith("/ops/");
  }
}

export function PublicAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) =>
        isPrivateOpsUrl(event.url) ? null : event
      }
    />
  );
}
