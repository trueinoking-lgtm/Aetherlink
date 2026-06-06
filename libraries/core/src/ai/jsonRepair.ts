/** Strip reasoning transcripts from model output. */
export function stripThinkBlocks(text: string): string {
  if (!text) return text;
  return String(text)
    .replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

/** Strip fences, think blocks, trailing commas, and isolate a JSON array for parse. */
export function repairJSONArray(raw: string): string {
  let cleaned = stripThinkBlocks(raw);
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) cleaned = fenced[1].trim();
  else cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim();

  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  const arrayStart = cleaned.indexOf('[');
  if (arrayStart > 0) cleaned = cleaned.slice(arrayStart);
  if (!cleaned.includes(']')) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1) {
      cleaned = cleaned.slice(0, lastBrace + 1) + ']';
    }
  }
  return cleaned;
}

/** Strip fences and isolate a JSON object for parse. */
export function repairJSONObject(raw: string): string {
  let cleaned = stripThinkBlocks(raw);
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) cleaned = fenced[1].trim();
  else cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim();

  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  const objectStart = cleaned.indexOf('{');
  if (objectStart > 0) cleaned = cleaned.slice(objectStart);
  const objectEnd = cleaned.lastIndexOf('}');
  if (objectEnd !== -1) cleaned = cleaned.slice(0, objectEnd + 1);
  return cleaned;
}

export function parseJSONArray<T>(raw: string): T {
  return JSON.parse(repairJSONArray(raw)) as T;
}

export function parseJSONObject<T>(raw: string): T {
  return JSON.parse(repairJSONObject(raw)) as T;
}
