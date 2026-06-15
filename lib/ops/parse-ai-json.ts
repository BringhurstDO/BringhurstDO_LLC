/** Extract the first complete JSON object/array from an LLM response. */
export function extractAiJsonText(raw: string) {
  let text = raw.trim();

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    text = fencedMatch[1].trim();
  }

  const start = text.search(/[{\[]/);

  if (start < 0) {
    return text;
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char === "{" ? "}" : "]");
      continue;
    }

    if (char === "}" || char === "]") {
      const expected = stack[stack.length - 1];

      if (!expected || char !== expected) {
        continue;
      }

      stack.pop();

      if (stack.length === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return text.slice(start);
}

export function parseAiJsonResponse<T>(raw: string): T {
  const jsonText = extractAiJsonText(raw);
  return JSON.parse(jsonText) as T;
}
