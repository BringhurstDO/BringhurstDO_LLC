export const GEMINI_DEFAULT_MODEL = "gemini-3.5-flash";

/** Google shut down Gemini 2.0 Flash models on 2026-06-01. */
export function resolveGeminiModel(configured?: string) {
  const model = configured?.trim() || GEMINI_DEFAULT_MODEL;

  if (/^gemini-2\.0-flash/i.test(model)) {
    return GEMINI_DEFAULT_MODEL;
  }

  return model;
}
