import type { NextRequest } from "next/server";

/** Shared OAuth cookie options so www and apex share PKCE/state on production. */
export function oauthCookieOptions(request: NextRequest, maxAge: number) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const secure = request.nextUrl.protocol === "https:";
  const base = {
    httpOnly: true,
    maxAge,
    path: "/ops",
    sameSite: (secure ? "none" : "lax") as "none" | "lax",
    secure,
  } as const;

  if (
    hostname === "bringhurstdo.com" ||
    hostname.endsWith(".bringhurstdo.com")
  ) {
    return { ...base, domain: ".bringhurstdo.com" };
  }

  return base;
}
