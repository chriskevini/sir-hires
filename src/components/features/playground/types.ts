/**
 * Types for Prompt Playground components
 */

import type { TaskConfig } from '@/tasks';

/**
 * Generic task definition that can specify the parser return type.
 * Use TaskDefinition (without type param) for heterogeneous collections.
 *
 * @typeParam TParseResult - The type returned by the parser function
 */
export interface TaskDefinition<TParseResult = unknown> {
  label: string;
  config: TaskConfig;
  defaultPrompt: string;
  parser: ((content: string) => TParseResult) | null;
  parserName: string | null;
}

/**
 * Result of parsing task output.
 *
 * @typeParam TData - The type of the parsed data
 */
export interface ParseResult<TData = unknown> {
  valid: boolean;
  data: TData | null;
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
