import type {
  OpsSocialMention,
  PublicationPlatform,
} from "@/lib/ops/types";

const HASHTAG = /^#[\p{L}\p{N}_]+$/u;
const GENERIC_HANDLE = /^[A-Za-z0-9._-]+$/;
const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const LINKEDIN_URN = /^urn:li:(?:person|organization):[A-Za-z0-9_-]+$/;
const SUPPORTED_PLATFORMS = new Set(["Facebook", "Instagram", "LinkedIn", "X"]);
const SUPPORTED_ENTITY_TYPES = new Set(["organization", "person"]);
const INSTAGRAM_PLACEMENTS = new Set(["caption", "collaborator", "media-tag"]);
const PLATFORM_LIMITS: Partial<Record<PublicationPlatform, number>> = {
  Facebook: 63_206,
  Instagram: 2_200,
  LinkedIn: 3_000,
  X: 280,
};

export function normalizeRequiredHashtags(values: string[]) {
  const seen = new Set<string>();

  return values
    .flatMap((value) => value.split(/[\s,]+/))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (value.startsWith("#") ? value : `#${value}`))
    .filter((value) => HASHTAG.test(value))
    .filter((value) => {
      const key = value.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function normalizeSocialMentions(values: OpsSocialMention[]) {
  const seen = new Set<string>();

  return values
    .filter(
      (mention) =>
        mention &&
        typeof mention.id === "string" &&
        typeof mention.label === "string" &&
        typeof mention.platform === "string" &&
        typeof mention.entityType === "string" &&
        typeof mention.approved === "boolean" &&
        SUPPORTED_PLATFORMS.has(mention.platform) &&
        SUPPORTED_ENTITY_TYPES.has(mention.entityType),
    )
    .map((mention) => ({
      ...mention,
      handle:
        typeof mention.handle === "string"
          ? mention.handle.replace(/^@/, "").trim() || undefined
          : undefined,
      label: mention.label.trim(),
      platformId:
        typeof mention.platformId === "string"
          ? mention.platformId.trim() || undefined
          : undefined,
    }))
    .filter((mention) => mention.approved && mention.label)
    .filter((mention) => !/[\[\]()\r\n]/.test(mention.label))
    .filter(
      (mention) =>
        !mention.handle ||
        (mention.platform === "X"
          ? X_HANDLE.test(mention.handle)
          : GENERIC_HANDLE.test(mention.handle)),
    )
    .filter(
      (mention) =>
        mention.platform !== "LinkedIn" ||
        !mention.platformId ||
        LINKEDIN_URN.test(mention.platformId),
    )
    .filter(
      (mention) =>
        mention.platform !== "Instagram" ||
        !mention.instagramPlacement ||
        INSTAGRAM_PLACEMENTS.has(mention.instagramPlacement),
    )
    .filter((mention) => {
      const key = `${mention.platform}:${mention.platformId ?? mention.handle ?? mention.label}`.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function socialMentionIdentityKey(mention: OpsSocialMention) {
  return `${mention.platform}:${mention.platformId ?? mention.handle ?? mention.label}`
    .trim()
    .toLocaleLowerCase();
}

export function collectRememberedSocialMentions(
  groups: Array<OpsSocialMention[] | undefined>,
) {
  return normalizeSocialMentions(groups.flatMap((group) => group ?? [])).sort(
    (left, right) =>
      left.label.localeCompare(right.label) ||
      left.platform.localeCompare(right.platform),
  );
}

export function instagramPublishingTags(mentions: OpsSocialMention[] | undefined) {
  const approved = mentionsForPlatform(mentions, "Instagram").filter(
    (mention) => mention.handle,
  );
  const mediaTags = approved
    .filter((mention) => mention.instagramPlacement !== "caption" && mention.instagramPlacement !== "collaborator")
    .slice(0, 20);

  return {
    collaborators: approved
      .filter((mention) => mention.instagramPlacement === "collaborator")
      .map((mention) => mention.handle!),
    userTags: mediaTags.map((mention, index) => ({
      username: mention.handle!,
      x: mediaTags.length === 1 ? 0.5 : 0.2 + (0.6 * index) / (mediaTags.length - 1),
      y: 0.5,
    })),
  };
}

export function mentionsForPlatform(
  mentions: OpsSocialMention[] | undefined,
  platform: PublicationPlatform,
) {
  return normalizeSocialMentions(mentions ?? []).filter(
    (mention) => mention.platform === platform,
  );
}

export function appendRequiredSocialMetadata(input: {
  body: string;
  hashtags?: string[];
  maxLength?: number;
  mentions?: OpsSocialMention[];
  platform: PublicationPlatform;
}) {
  const hashtags = normalizeRequiredHashtags(input.hashtags ?? []).filter(
    (tag) => !input.body.toLocaleLowerCase().includes(tag.toLocaleLowerCase()),
  );
  const mentions = mentionsForPlatform(input.mentions, input.platform);
  const mentionTokens = mentions
    .map((mention) => {
      if (input.platform === "LinkedIn") {
        return mention.platformId
          ? `@[${mention.label}](${mention.platformId})`
          : mention.label;
      }
      return mention.handle ? `@${mention.handle}` : mention.label;
    })
    .filter(
      (token) => !input.body.toLocaleLowerCase().includes(token.toLocaleLowerCase()),
    );
  const additions = [...mentionTokens, ...hashtags];
  const suffix = additions.join(" ");
  const limit = input.maxLength ?? PLATFORM_LIMITS[input.platform];

  if (!suffix) return input.body.trim();
  if (!limit) return `${input.body.trim()}\n\n${suffix}`.trim();
  if (suffix.length > limit) {
    throw new Error(
      `Approved hashtags and mentions exceed the ${limit}-character ${input.platform} limit.`,
    );
  }

  const availableBodyCharacters = Math.max(0, limit - suffix.length - 2);
  const body = input.body.trim();
  const fittedBody =
    body.length <= availableBodyCharacters
      ? body
      : `${body.slice(0, Math.max(0, availableBodyCharacters - 1)).trimEnd()}…`;

  return `${fittedBody}${fittedBody ? "\n\n" : ""}${suffix}`.trim();
}
