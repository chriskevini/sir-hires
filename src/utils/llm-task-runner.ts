/**
 * LLM Task Runner
 * Unified helper for running LLM tasks from components
 *
 * This module provides a single pattern for all LLM tasks:
 * 1. Define task config in src/tasks/ (prompt, temperature, context)
 * 2. Call runTask() from component with context + callbacks
 * 3. Handle UI (progress, errors) in component
 *
 * @example
 * // In a component:
 * const { runTask, cancel } = useTask();
 *
 * const result = await runTask({
 *   config: synthesisConfig,
 *   context: { profile, job, template, tone, task },
 *   onChunk: (delta) => setContent(prev => prev + delta),
 * });
 *
 * @example
 * // Cancellation on unmount:
 * useEffect(() => {
 *   return () => cancel();
 * }, [cancel]);
 */

import type { TaskConfig } from '../tasks/types';
import type { LLMClient } from './llm-client';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for running an LLM task
 */
export interface RunTaskOptions {
  /** Task configuration (from src/tasks/) */
  config: TaskConfig;

  /** Context values to include in user prompt */
  context: Record<string, string>;

  /** LLM client instance */
  llmClient: LLMClient;

  /** Override model from config */
  model?: string;

  /** Override maxTokens from config */
  maxTokens?: number;

  /** Override temperature from config */
  temperature?: number;

  /** Callback for document content chunks */
  onChunk?: (delta: string) => void;

  /** Callback for thinking content chunks (if model supports it) */
  onThinking?: (delta: string) => void;

  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Result from running an LLM task
 */
export interface TaskResult {
  /** Final document content */
  content: string;

  /** Thinking content (if model supports it) */
  thinking: string;

  /** Why the stream ended: 'stop', 'length', 'cancelled', etc. */
  finishReason: string | null;

  /** Whether the task was cancelled */
  cancelled: boolean;
}

// =============================================================================
// PROMPT BUILDING
// =============================================================================

/**
 * Build user prompt from context values
 * Wraps each context field in <TAG> blocks (unless already wrapped)
 *
 * @param context - Key-value pairs to include in prompt
 * @returns Formatted user prompt string
 *
 * @example
 * buildUserPrompt({ profile: '...', job: '...' })
 * // Returns:
 * // <PROFILE>
 * // ...
 * // </PROFILE>
 * //
 * // <JOB>
 * // ...
 * // </JOB>
 */
export function buildUserPrompt(context: Record<string, string>): string {
  return Object.entries(context)
    .filter(([_, value]) => value && value.trim())
    .map(([key, value]) => {
      const tag = key.toUpperCase();
      // Skip wrapping if content already starts with the tag
      if (value.trimStart().startsWith(`<${tag}>`)) {
        return value.trim();
      }
      return `<${tag}>\n${value}\n</${tag}>`;
    })
    .join('\n\n');
}

/**
 * Validate that all required context items are present
 *
 * @param config - Task config with context requirements
 * @param context - Provided context values
 * @throws Error if required context is missing
 */
export function validateContext(
  config: TaskConfig,
  context: Record<string, string>
): void {
  const missing = config.context.filter((key) => {
    const value = context[key];
    return !value || !value.trim();
  });

  if (missing.length > 0) {
    throw new Error(`Missing required context: ${missing.join(', ')}`);
  }
}

// =============================================================================
// TASK RUNNER
// =============================================================================

/**
 * Run an LLM task with streaming
 *
 * This is the main entry point for all LLM tasks. It handles:
 * - Building the user prompt from context
 * - Calling the LLM with streaming
 * - Routing chunks to callbacks
 * - Cancellation via AbortSignal
 *
 * @param options - Task options
 * @returns Promise resolving to task result
 *
 * @example
 * // Basic usage
 * const result = await runTask({
 *   config: jobExtractionConfig,
 *   context: { rawText: pageContent },
 *   llmClient,
 *   onChunk: (delta) => setContent(prev => prev + delta),
 * });
 *
 * @example
 * // With cancellation
 * const controller = new AbortController();
 * const result = await runTask({
 *   config: synthesisConfig,
 *   context: { profile, job, template, tone, task },
 *   llmClient,
 *   signal: controller.signal,
 *   onChunk: handleChunk,
 * });
 * // To cancel: controller.abort();
 *
 * @example
 * // With overrides
 * const result = await runTask({
 *   config: synthesisConfig,
 *   context: { profile, job, template, tone, task },
 *   llmClient,
 *   model: 'gpt-4',  // Override config.model
 *   maxTokens: 4000, // Override config.maxTokens
 *   onChunk: handleChunk,
 * });
 */
export async function runTask(options: RunTaskOptions): Promise<TaskResult> {
  const {
    config,
    context,
    llmClient,
    model,
    maxTokens,
    temperature,
    onChunk,
    onThinking,
    signal,
  } = options;

  // Validate required context (if config specifies requirements)
  if (config.context && config.context.length > 0) {
    validateContext(config, context);
  }

  // Build prompts
  const systemPrompt = config.prompt;
  const userPrompt = buildUserPrompt(context);

  // Generate unique stream ID for cancellation tracking
  const streamId = crypto.randomUUID();

  // Set up abort handling
  if (signal) {
    signal.addEventListener(
      'abort',
      () => {
        llmClient.cancelStream(streamId);
      },
      { once: true }
    );
  }

  // Call LLM with streaming
  const result = await llmClient.streamCompletion({
    streamId,
    model: model || config.model || '',
    systemPrompt,
    userPrompt,
    maxTokens: maxTokens ?? config.maxTokens,
    temperature: temperature ?? config.temperature,
    onDocumentUpdate: onChunk || null,
    onThinkingUpdate: onThinking || null,
  });

  return {
    content: result.documentContent,
    thinking: result.thinkingContent,
    finishReason: result.finishReason,
    cancelled: result.cancelled,
  };
}

// =============================================================================
// KEEPALIVE HELPER
// =============================================================================

/**
 * Start a keepalive interval to prevent service worker termination
 * Use this for long-running tasks in extension pages (sidepanel, etc.)
 *
 * @param intervalMs - Interval between pings (default 20000ms)
 * @returns Cleanup function to stop keepalive
 *
 * @example
 * // Start keepalive before long task
 * const stopKeepalive = startKeepalive();
 *
 * try {
 *   await runTask({ ... });
 * } finally {
 *   stopKeepalive();
 * }
 */
export function startKeepalive(intervalMs: number = 20000): () => void {
  // Ping storage to keep service worker alive
  const ping = () => {
    browser.storage.local.get('keepalive').catch(() => {
      // Ignore errors
    });
  };

  // Fire immediately
  ping();

  // Continue at interval
  const intervalId = setInterval(ping, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}
