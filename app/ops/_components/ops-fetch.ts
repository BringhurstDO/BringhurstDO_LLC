/** Browser fetch helper for /ops API routes behind Basic Auth + session cookies. */
export async function opsFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
  });
}
