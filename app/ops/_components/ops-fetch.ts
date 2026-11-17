/** Browser fetch helper for /ops API routes behind Basic Auth + session cookies. */
export async function opsFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
  });
}

export async function readOpsJson<T>(
  response: Response,
  fallbackMessage = "Ops request failed.",
): Promise<T> {
  const text = await response.text();
  const requestId = response.headers.get("x-vercel-id")?.trim();
  const status = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;

  if (!text.trim()) {
    throw new Error(
      `${fallbackMessage} (${status}). The server returned an empty response.${
        requestId ? ` Request ID: ${requestId}.` : ""
      }`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const contentType = response.headers.get("content-type")?.trim();
    const returnedHtml = /^\s*(?:<!doctype\s+html|<html)/i.test(text);
    const responseDescription = returnedHtml
      ? "The server returned an HTML error page instead of JSON."
      : `The server returned non-JSON content${contentType ? ` (${contentType})` : ""}.`;

    throw new Error(
      `${fallbackMessage} (${status}). ${responseDescription}${
        requestId ? ` Request ID: ${requestId}.` : ""
      }`,
    );
  }
}
