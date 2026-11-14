const HASHTAG_PATTERN = /#[\p{L}\p{N}_]+/gu;

const PLATFORM_HASHTAG_LIMITS: Record<string, number> = {
  Facebook: 3,
  Instagram: 5,
  LinkedIn: 3,
  X: 2,
};

const PLATFORM_BODY_LIMITS: Record<string, number> = {
  Facebook: 63206,
  Instagram: 2200,
  LinkedIn: 3000,
  X: 280,
};

function visibleLength(value: string) {
  return value.length;
}

function clipAtWord(value: string, maxLength: number) {
  if (visibleLength(value) <= maxLength) {
    return value.trim();
  }

  let clipped = value.slice(0, Math.max(1, maxLength - 1));

  if (/[\uD800-\uDBFF]$/.test(clipped)) {
    clipped = clipped.slice(0, -1);
  }
  const lastSpace = clipped.lastIndexOf(" ");
  const body = clipped.slice(0, lastSpace > maxLength * 0.45 ? lastSpace : undefined);

  return `${body.trim().replace(/[,:;\s-]+$/g, "")}…`;
}

export function extractSocialHashtags(...values: string[]) {
  const seen = new Set<string>();
  const hashtags: string[] = [];

  for (const value of values) {
    for (const match of value.match(HASHTAG_PATTERN) ?? []) {
      const key = match.toLocaleLowerCase();

      if (!seen.has(key)) {
        seen.add(key);
        hashtags.push(match);
      }
    }
  }

  return hashtags;
}

/**
 * Keep user-supplied hashtags through deterministic and AI adaptations.
 * Output-only tags are retained only when the source had no explicit tags.
 */
export function preserveSourceHashtags({
  body,
  maxLength,
  platform,
  sourceText,
}: {
  body: string;
  maxLength?: number;
  platform: string;
  sourceText: string;
}) {
  const sourceHashtags = extractSocialHashtags(sourceText);
  const platformLimit = PLATFORM_HASHTAG_LIMITS[platform] ?? 3;
  const selectedSourceHashtags = sourceHashtags.slice(0, platformLimit);
  const allowedSourceKeys = new Set(
    selectedSourceHashtags.map((hashtag) => hashtag.toLocaleLowerCase()),
  );
  const seenBodyHashtags = new Set<string>();

  let cleanedBody = body.replace(HASHTAG_PATTERN, (hashtag) => {
    const key = hashtag.toLocaleLowerCase();

    if (seenBodyHashtags.has(key)) {
      return "";
    }

    if (sourceHashtags.length > 0 && !allowedSourceKeys.has(key)) {
      return "";
    }

    seenBodyHashtags.add(key);
    return hashtag;
  });

  cleanedBody = cleanedBody
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (selectedSourceHashtags.length === 0) {
    return cleanedBody;
  }

  const hashtagLine = selectedSourceHashtags.join(" ");
  const bodyWithoutTrailingTags = cleanedBody
    .replace(HASHTAG_PATTERN, (hashtag) =>
      allowedSourceKeys.has(hashtag.toLocaleLowerCase()) ? "" : hashtag,
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const bodyMaxLength = maxLength ?? PLATFORM_BODY_LIMITS[platform] ?? 3000;
  const separator = bodyWithoutTrailingTags ? "\n\n" : "";
  const availableBodyLength = Math.max(
    0,
    bodyMaxLength - visibleLength(separator) - visibleLength(hashtagLine),
  );
  const fittedBody = clipAtWord(bodyWithoutTrailingTags, availableBodyLength);

  return `${fittedBody}${fittedBody ? "\n\n" : ""}${hashtagLine}`.trim();
}
