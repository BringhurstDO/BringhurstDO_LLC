export type SeriesPlanRecommendation = {
  postsPerWeek: number;
  reasoning: string;
  source: "ai" | "heuristic";
  totalPosts: number;
  weekCount: number;
};

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Deterministic fallback when AI plan is unavailable. */
export function estimateSeriesPlanHeuristic(
  summary: string,
  targetCount: number,
): SeriesPlanRecommendation {
  const trimmed = summary.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const paragraphs = trimmed.split(/\n\s*\n/).filter((part) => part.trim()).length;
  const bulletLines = trimmed
    .split(/\n/)
    .filter((line) => /^\s*[-*•]\s+/.test(line)).length;
  const headingLines = trimmed
    .split(/\n/)
    .filter((line) => /^#{1,3}\s+/.test(line)).length;

  const angleEstimate = Math.max(
    paragraphs,
    bulletLines,
    headingLines,
    Math.ceil(wordCount / 120),
    1,
  );

  let totalPosts = clampInt(angleEstimate, 1, 12);

  if (wordCount < 80) {
    totalPosts = Math.min(totalPosts, 2);
  } else if (wordCount < 200) {
    totalPosts = Math.min(totalPosts, 4);
  }

  const postsPerWeek =
    totalPosts <= 2 ? totalPosts : wordCount > 600 ? 3 : 2;
  const normalizedPostsPerWeek = clampInt(postsPerWeek, 1, 5);

  let weekCount = clampInt(Math.ceil(totalPosts / normalizedPostsPerWeek), 1, 8);

  while (totalPosts * Math.max(1, targetCount) > 40 && totalPosts > 1) {
    totalPosts -= 1;
    weekCount = clampInt(Math.ceil(totalPosts / normalizedPostsPerWeek), 1, 8);
  }

  return {
    postsPerWeek: normalizedPostsPerWeek,
    reasoning: `Estimated ~${angleEstimate} distinct angles from ${wordCount} words. Scheduling ${totalPosts} post${totalPosts === 1 ? "" : "s"} at ${postsPerWeek}/week over ${weekCount} week${weekCount === 1 ? "" : "s"} to avoid repetition.`,
    source: "heuristic",
    totalPosts,
    weekCount,
  };
}

export function normalizeSeriesPlan(
  plan: {
    postsPerWeek?: number;
    reasoning?: string;
    totalPosts?: number;
    weekCount?: number;
  },
  targetCount: number,
  fallbackReasoning: string,
): SeriesPlanRecommendation {
  let totalPosts = clampInt(plan.totalPosts ?? 3, 1, 12);
  const postsPerWeek = clampInt(plan.postsPerWeek ?? 3, 1, 5);
  let weekCount = clampInt(plan.weekCount ?? 1, 1, 8);

  while (totalPosts * Math.max(1, targetCount) > 40 && totalPosts > 1) {
    totalPosts -= 1;
  }

  const minimumWeeks = Math.ceil(totalPosts / postsPerWeek);

  if (weekCount < minimumWeeks) {
    weekCount = clampInt(minimumWeeks, 1, 8);
  }

  if (postsPerWeek * weekCount < totalPosts) {
    weekCount = clampInt(Math.ceil(totalPosts / postsPerWeek), 1, 8);
  }

  return {
    postsPerWeek,
    reasoning:
      typeof plan.reasoning === "string" && plan.reasoning.trim()
        ? plan.reasoning.trim()
        : fallbackReasoning,
    source: "ai",
    totalPosts,
    weekCount,
  };
}
