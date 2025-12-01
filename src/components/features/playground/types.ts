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
