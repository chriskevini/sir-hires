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
  duration: number;
  charCount: number;
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
