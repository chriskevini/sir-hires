/**
 * Profile Optimization Task
 * Generate suggestions to improve the profile based on the job in focus.
 */

import type { TaskConfig } from './types';

export const profileOptimization = {
  systemPrompt: `You are an elite career strategist.
The user will send their PROFILE and a JOB listing.
You will analyze fit, gaps, company culture, ATS keywords, transferable achievements, etc.
Complete the TASK using any auxiliary info that is sent.`,

  context: ['job', 'profile', 'task'] as const,
  temperature: 0,
  maxTokens: 1000,

  defaultTask: `You are helping the user refine their profile. This is not a final document. Do not focus on the structure.
Suggest 5 edits to a specific bullet point, experience or project. Output only a list with this exact format:
## Heading in imperative tense
- New or improved bullet

*This ...*

## Heading ...`,
} satisfies TaskConfig & { defaultTask: string };
