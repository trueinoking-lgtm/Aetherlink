export const FIREWORKS_API_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';

export const FW_FLASH =
  process.env.FIREWORKS_FLASH_MODEL || 'accounts/fireworks/models/deepseek-v4-flash';

export const TASK_MAX_TOKENS: Record<string, number> = {
  job_structure: 512,
  cv_rewrite: 1024,
  cover_letter: 600,
  cv_interview: 4096,
  cv_generate: 4096,
};
