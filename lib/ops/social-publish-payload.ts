import type { OpsSocialMention } from "@/lib/ops/types";
import { appendRequiredSocialMetadata } from "@/lib/ops/social-metadata";

export function buildLinkedInCommentaryPayload(
  commentary: string,
  mentions: OpsSocialMention[] = [],
  hashtags: string[] = [],
) {
  const withMetadata = appendRequiredSocialMetadata({
    body: commentary,
    hashtags,
    mentions,
    platform: "LinkedIn",
  });
  const annotations: string[] = [];
  const tokenized = withMetadata.replace(
    /@\[[^\]\r\n]+\]\(urn:li:(?:person|organization):[A-Za-z0-9_-]+\)/g,
    (annotation) => {
      const token = `OPSLINKEDINANNOTATIONTOKEN${annotations.length}END`;
      annotations.push(annotation);
      return token;
    },
  );
  const escaped = tokenized.replace(/[\\<>~*_{}[\]()|]/g, (match) => `\\${match}`);

  return {
    commentary: annotations.reduce(
      (value, annotation, index) =>
        value.replace(`OPSLINKEDINANNOTATIONTOKEN${index}END`, annotation),
      escaped,
    ),
  };
}

export function buildXTextPayload(
  text: string,
  mediaIds?: string[],
  mentions: OpsSocialMention[] = [],
  hashtags: string[] = [],
) {
  return {
    ...(mediaIds?.length ? { media: { media_ids: mediaIds } } : {}),
    text: appendRequiredSocialMetadata({
      body: text,
      hashtags,
      mentions,
      platform: "X",
    }),
  };
}

export function buildFacebookTextPayload(
  message: string,
  placement: "feed",
): { message: string };
export function buildFacebookTextPayload(
  message: string,
  placement: "photo",
): { caption: string };
export function buildFacebookTextPayload(
  message: string,
  placement: "video",
): { description: string };
export function buildFacebookTextPayload(
  message: string,
  placement: "feed" | "photo" | "video",
) {
  if (placement === "photo") return { caption: message };
  if (placement === "video") return { description: message };
  return { message };
}

export function buildInstagramCaptionPayload(
  caption: string,
  mentions: OpsSocialMention[] = [],
  hashtags: string[] = [],
) {
  return {
    caption: appendRequiredSocialMetadata({
      body: caption,
      hashtags,
      mentions,
      platform: "Instagram",
    }),
  };
}
