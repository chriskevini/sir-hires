/**
 * Fit Calculation Task
 * Calculate candidate-job fit score
 */

import type { TaskConfig } from './types';
import { CAREER_STRATEGIST_SYSTEM_PROMPT } from './shared';

export const fitCalculation = {
  systemPrompt: CAREER_STRATEGIST_SYSTEM_PROMPT,

  context: ['job', 'profile', 'task'] as const,
  temperature: 0,
  maxTokens: 1000,

  defaultTask: `/no_think DO NOT make any assumptions.
Based ONLY on explicitly stated bullet points,
calculate a precise fit score for this candidate.
Output only a number between 0 and 100.
You will be punished for bad judgement.`,
} satisfies TaskConfig & { defaultTask: string };
