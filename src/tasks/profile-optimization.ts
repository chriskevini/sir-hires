/**
 * Profile Optimization Task
 * Generate suggestions to improve the profile based on the job in focus.
 */

import type { TaskConfig } from './types';
import { CAREER_STRATEGIST_SYSTEM_PROMPT } from './shared';

export const profileOptimization = {
  systemPrompt: CAREER_STRATEGIST_SYSTEM_PROMPT,

  context: ['job', 'profile', 'task'] as const,
  temperature: 0,
  maxTokens: 1000,

  defaultTask: `You are helping the user refine their profile.
Suggest edits to a specific bullet point, experience or project.
Output only 5 items with this exact format:

## Header in imperative tense
- New or improved bullet (20 words max)

*This ...*

## Header ...`,
} satisfies TaskConfig & { defaultTask: string };
