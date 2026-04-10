/**
 * True when a link should not be treated as a real destination yet.
 * Used to show bright-red “configure this URL” styling in the UI.
 */
export function isPendingHref(href: string): boolean {
  const h = href.trim();
  return h === "" || h === "#";
}
