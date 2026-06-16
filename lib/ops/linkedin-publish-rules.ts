export const LINKEDIN_TEXT_ONLY_LINK_CARD_ERROR =
  "LinkedIn publishing is text-only. Link cards and attached URLs are blocked.";

export const LINKEDIN_TEXT_ONLY_BODY_URL_ERROR =
  "LinkedIn publishing is text-only. Remove URLs from the draft body before posting.";

const PUBLIC_URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/i;

export function containsLinkedInPublishUrl(body: string) {
  return PUBLIC_URL_PATTERN.test(body);
}
