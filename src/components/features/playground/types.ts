/**
 * Types for Prompt Playground components
 */

import type { TaskConfig } from '@/tasks';

export interface TaskDefinition {
  label: string;
  config: TaskConfig;
  defaultPrompt: string;
  parser: ((content: string) => unknown) | null;
  parserName: string | null;
}

export interface ParseResult {
  valid: boolean;
  data: unknown;
  error?: string;
}

export interface RunStats {
  /** Total duration in ms */
  duration: number;
  /** Time to first token in ms */
  ttft: number | null;
  /** Time to first document token in ms (after thinking) */
  ttFirstDocument: number | null;
  /** Number of prompt tokens (from API) */
  promptTokens: number | null;
  /** Number of completion tokens (from API) */
  completionTokens: number | null;
}

export interface SynthesisContext {
  profile: string;
  job: string;
  task: string;
  template: string;
  tone: string;
}

/**
 * A single context field for freeform/custom tasks
 * Array order determines order in the user prompt
 */
export interface ContextField {
  name: string; // XML tag name (e.g., "input", "examples")
  content: string; // The actual content
}

/**
 * A message in conversation mode
 * Used for full control over the message sequence sent to the LLM
 */
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Playground input mode
 * - context: System prompt + context fields (ergonomic for most tasks)
 * - conversation: Raw message list (full control, supports assistant prefill)
 */
export type PlaygroundMode = 'context' | 'conversation';
