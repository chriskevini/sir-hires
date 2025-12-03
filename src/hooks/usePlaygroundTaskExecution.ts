/**
 * usePlaygroundTaskExecution Hook
 *
 * Shared hook for LLM task execution in playground panels.
 * Consolidates common execution logic between TaskPanel and FreeformTaskPanel:
 * - Abort controller management
 * - Keepalive handling (prevents service worker termination)
 * - Stats calculation
 * - Error handling
 * - Output state management
 *
 * @example
 * const {
 *   output, thinking, stats, error, isRunning,
 *   executeContextTask, executeMessagesTask, cancel
 * } = usePlaygroundTaskExecution({ llmSettings });
 *
 * // For context mode (TaskPanel, FreeformTaskPanel context mode)
 * await executeContextTask({
 *   config: taskConfig,
 *   context: { rawText: input },
 *   temperature: 0.7,
 *   maxTokens: 4096,
 * });
 *
 * // For conversation mode (FreeformTaskPanel conversation mode)
 * await executeMessagesTask({
 *   messages: [{ role: 'system', content: '...' }],
 *   temperature: 0.7,
 *   maxTokens: 4096,
 * });
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { LLMClient } from '@/utils/llm-client';
import {
  runTask,
  runTaskWithMessages,
  startKeepalive,
} from '@/utils/llm-task-runner';
import type { TaskConfig } from '@/tasks';
import type { useLLMSettings } from '@/hooks/useLLMSettings';
import type {
  RunStats,
  ConversationMessage,
} from '@/components/features/playground/types';

// =============================================================================
// TYPES
// =============================================================================

export interface UsePlaygroundTaskExecutionOptions {
  /** LLM settings from useLLMSettings hook */
  llmSettings: ReturnType<typeof useLLMSettings>;
}

export interface ExecuteContextTaskOptions {
  /** Task configuration (prompt, temperature, maxTokens, context) */
  config: TaskConfig;
  /** Context values to include in user prompt */
  context: Record<string, string>;
  /** Override temperature from config */
  temperature?: number;
  /** Override maxTokens from config */
  maxTokens?: number;
  /**
   * Skip thinking/reasoning blocks (default: true)
   * Set to false to enable "think harder" mode
   */
  noThink?: boolean;
}

export interface ExecuteMessagesTaskOptions {
  /** Raw messages array (system/user/assistant in any order) */
  messages: ConversationMessage[];
  /** Temperature for completion */
  temperature?: number;
  /** Max tokens for completion */
  maxTokens?: number;
}

export interface TaskExecutionResult {
  /** Whether task completed successfully */
  success: boolean;
  /** Final content (also available via output state) */
  content: string;
  /** Whether task was cancelled */
  cancelled: boolean;
}

export interface UsePlaygroundTaskExecutionResult {
  // Output state
  /** Current LLM output content */
  output: string;
  /** Current thinking content (if model supports it) */
  thinking: string;
  /** Run statistics (duration, tokens, etc.) */
  stats: RunStats | null;
  /** Error message if task failed */
  error: string | null;
  /** Whether a task is currently running */
  isRunning: boolean;

  // Actions
  /** Execute a task using context mode (system prompt + context fields) */
  executeContextTask: (
    options: ExecuteContextTaskOptions
  ) => Promise<TaskExecutionResult>;
  /** Execute a task using raw messages array */
  executeMessagesTask: (
    options: ExecuteMessagesTaskOptions
  ) => Promise<TaskExecutionResult>;
  /** Cancel the currently running task */
  cancel: () => void;
  /** Reset all output state */
  reset: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function usePlaygroundTaskExecution(
  options: UsePlaygroundTaskExecutionOptions
): UsePlaygroundTaskExecutionResult {
  const { llmSettings } = options;

  // Output state
  const [output, setOutput] = useState('');
  const [thinking, setThinking] = useState('');
  const [stats, setStats] = useState<RunStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopKeepaliveRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (stopKeepaliveRef.current) {
        stopKeepaliveRef.current();
      }
    };
  }, []);

  // Reset output state
  const reset = useCallback(() => {
    setOutput('');
    setThinking('');
    setStats(null);
    setError(null);
  }, []);

  // Cancel running task
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Execute task with context mode
  const executeContextTask = useCallback(
    async (
      taskOptions: ExecuteContextTaskOptions
    ): Promise<TaskExecutionResult> => {
      const model = llmSettings.model;
      if (!model) {
        setError('Please select a model in LLM settings');
        return { success: false, content: '', cancelled: false };
      }

      // Reset output state
      setOutput('');
      setThinking('');
      setStats(null);
      setError(null);
      setIsRunning(true);

      abortControllerRef.current = new AbortController();
      stopKeepaliveRef.current = startKeepalive();
      const startTime = Date.now();

      try {
        const llmClient = new LLMClient({
          endpoint: llmSettings.endpoint,
        });

        const result = await runTask({
          config: taskOptions.config,
          context: taskOptions.context,
          llmClient,
          model,
          temperature: taskOptions.temperature,
          maxTokens: taskOptions.maxTokens,
          noThink: taskOptions.noThink,
          signal: abortControllerRef.current.signal,
          onChunk: (delta) => setOutput((prev) => prev + delta),
          onThinking: (delta) => setThinking((prev) => prev + delta),
        });

        const duration = Date.now() - startTime;

        setStats({
          duration,
          ttft: result.timing.ttft,
          ttFirstDocument: result.timing.ttFirstDocument,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
        });

        if (result.cancelled) {
          setError('Task was cancelled');
          return { success: false, content: result.content, cancelled: true };
        }

        return { success: true, content: result.content, cancelled: false };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return { success: false, content: '', cancelled: false };
      } finally {
        if (stopKeepaliveRef.current) {
          stopKeepaliveRef.current();
          stopKeepaliveRef.current = null;
        }
        setIsRunning(false);
        abortControllerRef.current = null;
      }
    },
    [llmSettings.model, llmSettings.endpoint]
  );

  // Execute task with messages mode
  const executeMessagesTask = useCallback(
    async (
      taskOptions: ExecuteMessagesTaskOptions
    ): Promise<TaskExecutionResult> => {
      const model = llmSettings.model;
      if (!model) {
        setError('Please select a model in LLM settings');
        return { success: false, content: '', cancelled: false };
      }

      // Reset output state
      setOutput('');
      setThinking('');
      setStats(null);
      setError(null);
      setIsRunning(true);

      abortControllerRef.current = new AbortController();
      stopKeepaliveRef.current = startKeepalive();
      const startTime = Date.now();

      try {
        const llmClient = new LLMClient({
          endpoint: llmSettings.endpoint,
        });

        const result = await runTaskWithMessages({
          messages: taskOptions.messages,
          llmClient,
          model,
          temperature: taskOptions.temperature,
          maxTokens: taskOptions.maxTokens,
          signal: abortControllerRef.current.signal,
          onChunk: (delta) => setOutput((prev) => prev + delta),
          onThinking: (delta) => setThinking((prev) => prev + delta),
        });

        const duration = Date.now() - startTime;

        setStats({
          duration,
          ttft: result.timing.ttft,
          ttFirstDocument: result.timing.ttFirstDocument,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
        });

        if (result.cancelled) {
          setError('Task was cancelled');
          return { success: false, content: result.content, cancelled: true };
        }

        return { success: true, content: result.content, cancelled: false };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return { success: false, content: '', cancelled: false };
      } finally {
        if (stopKeepaliveRef.current) {
          stopKeepaliveRef.current();
          stopKeepaliveRef.current = null;
        }
        setIsRunning(false);
        abortControllerRef.current = null;
      }
    },
    [llmSettings.model, llmSettings.endpoint]
  );

  return {
    // Output state
    output,
    thinking,
    stats,
    error,
    isRunning,

    // Actions
    executeContextTask,
    executeMessagesTask,
    cancel,
    reset,
  };
}
