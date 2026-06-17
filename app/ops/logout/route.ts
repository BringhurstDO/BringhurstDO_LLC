import { NextResponse } from "next/server";

import {
  opsAuthSessionCookieName,
  opsAuthSessionCookieOptions,
} from "@/lib/ops/ops-auth-session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const OPS_REALM = "BringhurstDO Ops";

// HTTP Basic Auth has no real logout: the browser caches credentials for the
// realm. Returning 401 with a WWW-Authenticate challenge forces the browser to
// drop the cached credentials and re-prompt. Dismissing that prompt (Cancel /
// Escape) completes the logout.
const loggedOutHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Logged out - BringhurstDO Ops</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; background: #f5f7fa; color: #0f172a; margin: 0; }
      main { max-width: 32rem; margin: 12vh auto; padding: 2rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #475569; line-height: 1.5; }
      a { color: #b91c1c; font-weight: 600; }
    </style>
  </head>
  <body>
    <main>
      <h1>You are logged out</h1>
      <p>
        Your browser was asked to discard its saved credentials for the operator
        console. If a sign-in prompt appeared, press Cancel or Escape to stay
        logged out.
      </p>
      <p><a href="/ops">Sign back in to BringhurstDO Ops</a></p>
    </main>
  </body>
</html>`;

export function GET(request: Request) {
  const url = new URL(request.url);
  const response = new NextResponse(loggedOutHtml, {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${OPS_REALM}", charset="UTF-8"`,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });

  response.cookies.set(
    opsAuthSessionCookieName(),
    "",
    {
      ...opsAuthSessionCookieOptions(
        url.hostname,
        url.protocol === "https:",
      ),
      maxAge: 0,
    },
  );

  return response;
}
