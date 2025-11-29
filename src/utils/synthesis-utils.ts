// 20 hardcoded tones for document synthesis
export const SYNTHESIS_TONES = [
  'professional',
  'funny',
  'enthusiastic',
  'casual',
  'confident',
  'friendly',
  'formal',
  'conversational',
  'bold',
  'humble',
  'energetic',
  'sincere',
  'witty',
  'warm',
  'assertive',
  'approachable',
  'persuasive',
  'authentic',
  'inspiring',
  'direct',
] as const;

export type SynthesisTone = (typeof SYNTHESIS_TONES)[number];

/**
 * Get a random tone from the predefined list
 */
export function getRandomTone(): string {
  const randomIndex = Math.floor(Math.random() * SYNTHESIS_TONES.length);
  return SYNTHESIS_TONES[randomIndex];
}
