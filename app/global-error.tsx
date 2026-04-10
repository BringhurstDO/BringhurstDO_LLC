"use client";

import "./globals.css";

/**
 * Explicit global error UI so the dev bundler resolves a real client module.
 * (Webpack + RSC sometimes loses the built-in global-error in the client manifest.)
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background px-6 py-16 font-sans text-foreground antialiased">
        <div className="mx-auto max-w-md space-y-4">
          <h1 className="text-xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          {process.env.NODE_ENV === "development" && error.digest ? (
            <p className="text-sm text-muted-foreground">
              Digest: <code className="font-mono">{error.digest}</code>
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
