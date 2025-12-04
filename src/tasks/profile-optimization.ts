/**
 * Profile Optimization Task
 * Generate suggestions to improve the profile based on the job in focus.
 */

import type { TaskConfig } from './types';
import { CAREER_STRATEGIST_SYSTEM_PROMPT } from './shared';

export const profileOptimization = {
  systemPrompt: CAREER_STRATEGIST_SYSTEM_PROMPT,

  context: ['job', 'profile', 'task'] as const,
  temperature: 0.7,
  maxTokens: 2000,

  defaultTask: `Optimize the profile by modifying or creating new bullets.
Target 15-20 words per bullet.
Output up to 7 bullets with this exact format:

## Experience Title or Project Name
- Optimized bullet
*Explanation of bullet*

- Optimized bullet
*Explanation*

## Experience ...`,
} satisfies TaskConfig & { defaultTask: string };
