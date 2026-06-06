import { runFireworksChat } from './fireworks';
import { assertTaskType, type AITaskType } from './taskTypes';

export type ExecuteAITaskOptions = {
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'json' | 'text';
};

export type ExecuteAITaskResult = {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
};

/** Run an AI task via Fireworks DeepSeek V4 Flash (Lore-style single-provider routing). */
export async function executeAITask(
  taskType: AITaskType,
  prompt: string,
  options: ExecuteAITaskOptions = {},
): Promise<ExecuteAITaskResult> {
  assertTaskType(taskType);
  return runFireworksChat(prompt, taskType, options);
}
