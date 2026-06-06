export const AI_TASK_TYPES = {
  job_structure: 'job_structure',
  cv_rewrite: 'cv_rewrite',
  cover_letter: 'cover_letter',
} as const;

export type AITaskType = (typeof AI_TASK_TYPES)[keyof typeof AI_TASK_TYPES];

export function assertTaskType(taskType: string): asserts taskType is AITaskType {
  if (!Object.values(AI_TASK_TYPES).includes(taskType as AITaskType)) {
    throw new Error(`Unknown AI task type: ${taskType}`);
  }
}
