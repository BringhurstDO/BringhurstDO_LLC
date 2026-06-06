export type UtmUrlInput = {
  destinationUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
};

export function buildUtmUrl({
  campaign,
  content,
  destinationUrl,
  medium,
  source,
}: UtmUrlInput) {
  const url = new URL(destinationUrl);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaign);

  if (content) {
    url.searchParams.set("utm_content", content);
  }

  return url.toString();
}
