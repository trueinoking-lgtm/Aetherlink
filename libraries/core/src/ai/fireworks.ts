import { FIREWORKS_API_URL, FW_FLASH, TASK_MAX_TOKENS } from './models';
import type { AITaskType } from './taskTypes';
import { stripThinkBlocks } from './jsonRepair';

export type FireworksChatOptions = {
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'json' | 'text';
};

export type FireworksResult = {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
};

function extractAssistantText(data: {
  choices?: Array<{
    message?: {
      content?: string;
      reasoning_content?: string;
      reasoning?: string;
    };
  }>;
}): string {
  const msg = data?.choices?.[0]?.message;
  if (!msg) return '';
  let source = msg.content || '';
  if (!source.trim() && typeof msg.reasoning_content === 'string') {
    source = msg.reasoning_content;
  } else if (!source.trim() && typeof msg.reasoning === 'string') {
    source = msg.reasoning;
  }
  return stripThinkBlocks(source);
}

export async function runFireworksChat(
  prompt: string,
  taskType: AITaskType,
  options: FireworksChatOptions = {},
): Promise<FireworksResult> {
  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey) {
    throw new Error('FIREWORKS_API_KEY is not set');
  }

  const maxTokens = options.maxTokens ?? TASK_MAX_TOKENS[taskType] ?? 1024;
  const body: Record<string, unknown> = {
    model: FW_FLASH,
    max_tokens: maxTokens,
    temperature: options.temperature ?? 0.3,
    messages: [{ role: 'user', content: prompt }],
  };

  if (options.responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  const timeoutMs = parseInt(process.env.AETHERLINK_AI_TIMEOUT_MS || '60000', 10);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(FIREWORKS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Fireworks API failed ${res.status}: ${err.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string; reasoning_content?: string; reasoning?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    return {
      text: extractAssistantText(data),
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
