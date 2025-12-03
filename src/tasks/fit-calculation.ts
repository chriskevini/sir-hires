/**
 * Fit Calculation Task
 * Calculate candidate-job fit score
 */

import type { TaskConfig } from './types';

export const fitCalculation = {
  systemPrompt: `You are an elite career strategist.
The user will send their PROFILE and a JOB listing.
You will analyze fit, gaps, company culture, ATS keywords, transferable achievements, etc.
Complete the TASK using any auxiliary info that is sent.`,

  context: ['job', 'profile', 'task'] as const,
  temperature: 0,
  maxTokens: 20,

  defaultTask:
    '/no_think Based ONLY on explicitly stated bullet points and without assuming additional information, calculate a precise fit score for this candidate. Output only a number between 0 and 100. You will be punished for bad judgement.',
} satisfies TaskConfig & { defaultTask: string };
