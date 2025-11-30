/**
 * FreeformTaskPanel Component
 *
 * A custom task panel that lets developers define arbitrary context fields
 * and their order. Unlike the predefined task panels, this allows full control
 * over the prompt structure.
 *
 * Features:
 * - Editable system prompt
 * - Dynamic context fields (add/remove/reorder)
 * - Load from existing task definitions as starting point
 * - Inline temperature/maxTokens controls
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { LLMClient } from '@/utils/llm-client';
import { runTask, startKeepalive } from '@/utils/llm-task-runner';
import {
  jobExtractionConfig,
  profileExtractionConfig,
  synthesisConfig,
  JOB_EXTRACTION_PROMPT,
  PROFILE_EXTRACTION_PROMPT,
  SYNTHESIS_PROMPT,
} from '@/tasks';
import type { TaskConfig } from '@/tasks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { useLLMSettings } from '@/hooks/useLLMSettings';
import type { ContextField, RunStats } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface FreeformTaskPanelProps {
  isVisible: boolean;
  llmSettings: ReturnType<typeof useLLMSettings>;
}

interface PresetTask {
  label: string;
  prompt: string;
  contexts: ContextField[];
  temperature: number;
  maxTokens: number;
}

// =============================================================================
// PRESET TASKS (for "Load from..." dropdown)
// =============================================================================

const PRESET_TASKS: Record<string, PresetTask> = {
  'job-extraction': {
    label: 'Job Extraction',
    prompt: JOB_EXTRACTION_PROMPT,
    contexts: [{ name: 'rawText', content: '' }],
    temperature: jobExtractionConfig.temperature,
    maxTokens: jobExtractionConfig.maxTokens,
  },
  'profile-extraction': {
    label: 'Profile Extraction',
    prompt: PROFILE_EXTRACTION_PROMPT,
    contexts: [{ name: 'rawText', content: '' }],
    temperature: profileExtractionConfig.temperature,
    maxTokens: profileExtractionConfig.maxTokens,
  },
  synthesis: {
    label: 'Synthesis',
    prompt: SYNTHESIS_PROMPT,
    contexts: [
      { name: 'profile', content: '' },
      { name: 'job', content: '' },
      { name: 'template', content: '' },
      { name: 'tone', content: '' },
      { name: 'task', content: '' },
    ],
    temperature: synthesisConfig.temperature,
    maxTokens: synthesisConfig.maxTokens,
  },
};

// =============================================================================
// FREEFORM TASK PANEL COMPONENT
// =============================================================================

export const FreeformTaskPanel: React.FC<FreeformTaskPanelProps> = ({
  isVisible,
  llmSettings,
}) => {
  // Task configuration state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [contexts, setContexts] = useState<ContextField[]>([
    { name: 'input', content: '' },
  ]);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);

  // Output state
  const [output, setOutput] = useState('');
  const [thinking, setThinking] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
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

  // =============================================================================
  // CONTEXT FIELD OPERATIONS
  // =============================================================================

  const addContext = useCallback(() => {
    setContexts((prev) => [...prev, { name: '', content: '' }]);
  }, []);

  const removeContext = useCallback((index: number) => {
    setContexts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateContextName = useCallback((index: number, name: string) => {
    setContexts((prev) =>
      prev.map((ctx, i) => (i === index ? { ...ctx, name } : ctx))
    );
  }, []);

  const updateContextContent = useCallback((index: number, content: string) => {
    setContexts((prev) =>
      prev.map((ctx, i) => (i === index ? { ...ctx, content } : ctx))
    );
  }, []);

  const moveContext = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0) return;
    setContexts((prev) => {
      const newContexts = [...prev];
      if (toIndex >= newContexts.length) return prev;
      const [removed] = newContexts.splice(fromIndex, 1);
      newContexts.splice(toIndex, 0, removed);
      return newContexts;
    });
  }, []);

  // =============================================================================
  // LOAD PRESET
  // =============================================================================

  const loadPreset = useCallback((presetKey: string) => {
    const preset = PRESET_TASKS[presetKey];
    if (!preset) return;

    setSystemPrompt(preset.prompt);
    setContexts(preset.contexts.map((c) => ({ ...c }))); // Clone
    setTemperature(preset.temperature);
    setMaxTokens(preset.maxTokens);
  }, []);

  // =============================================================================
  // RUN TASK
  // =============================================================================

  const canRun = useMemo(() => {
    if (!llmSettings.isConnected) return false;
    if (!systemPrompt.trim()) return false;
    // Need at least one context with name and content
    return contexts.some((c) => c.name.trim() && c.content.trim());
  }, [llmSettings.isConnected, systemPrompt, contexts]);

  const handleRunTest = useCallback(async () => {
    const model = llmSettings.model;
    if (!model) {
      setError('Please select a model in LLM settings');
      return;
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

      // Build context record from array (order preserved)
      const contextRecord: Record<string, string> = {};
      contexts.forEach(({ name, content }) => {
        const trimmedName = name.trim();
        if (trimmedName) {
          contextRecord[trimmedName] = content;
        }
      });

      // Build config
      const config: TaskConfig = {
        prompt: systemPrompt,
        temperature,
        maxTokens,
        context: contexts.map((c) => c.name.trim()).filter(Boolean) as Array<
          (typeof config.context)[number]
        >,
      };

      const result = await runTask({
        config,
        context: contextRecord,
        llmClient,
        model,
        signal: abortControllerRef.current.signal,
        onChunk: (delta) => setOutput((prev) => prev + delta),
        onThinking: (delta) => setThinking((prev) => prev + delta),
      });

      const duration = Date.now() - startTime;

      setStats({
        duration,
        charCount: result.content.length,
      });

      if (result.cancelled) {
        setError('Task was cancelled');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (stopKeepaliveRef.current) {
        stopKeepaliveRef.current();
        stopKeepaliveRef.current = null;
      }
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [
    llmSettings.model,
    llmSettings.endpoint,
    systemPrompt,
    contexts,
    temperature,
    maxTokens,
  ]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div
      className={cn(
        'grid grid-cols-1 lg:grid-cols-2 gap-6',
        !isVisible && 'hidden'
      )}
    >
      {/* Left Column: Inputs */}
      <div className="space-y-4">
        {/* Load Preset */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Load from:</label>
          <select
            className="text-sm p-1 rounded border bg-card"
            onChange={(e) => {
              if (e.target.value) {
                loadPreset(e.target.value);
                e.target.value = '';
              }
            }}
            value=""
          >
            <option value="" disabled>
              Select preset...
            </option>
            {Object.entries(PRESET_TASKS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium mb-2">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full h-64 p-3 rounded-lg border bg-card font-mono text-sm resize-y"
            placeholder="Enter system prompt..."
          />
        </div>

        {/* Model Settings */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">
              Temperature
            </label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
              className="w-full p-2 rounded border bg-card text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              min="1"
              max="128000"
              step="100"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
              className="w-full p-2 rounded border bg-card text-sm"
            />
          </div>
        </div>

        {/* Context Fields */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">
              Context Fields ({contexts.length})
            </label>
            <Button variant="ghost" size="sm" onClick={addContext}>
              + Add Context
            </Button>
          </div>

          <div className="space-y-3">
            {contexts.map((ctx, index) => (
              <div key={index} className="border rounded-lg p-3 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveContext(index, index - 1)}
                      disabled={index === 0}
                      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveContext(index, index + 1)}
                      disabled={index === contexts.length - 1}
                      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Name input */}
                  <input
                    type="text"
                    value={ctx.name}
                    onChange={(e) => updateContextName(index, e.target.value)}
                    placeholder="context name"
                    className="flex-1 p-1.5 rounded border bg-background text-sm font-mono"
                  />

                  {/* XML tag preview */}
                  {ctx.name.trim() && (
                    <span className="text-xs text-muted-foreground font-mono">
                      &lt;{ctx.name.trim().toUpperCase()}&gt;
                    </span>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => removeContext(index)}
                    disabled={contexts.length === 1}
                    className="text-destructive hover:text-destructive/80 disabled:opacity-30 text-sm px-2"
                    title="Remove context"
                  >
                    ×
                  </button>
                </div>

                {/* Content textarea */}
                <textarea
                  value={ctx.content}
                  onChange={(e) => updateContextContent(index, e.target.value)}
                  placeholder="Content..."
                  className="w-full h-64 p-2 rounded border bg-background font-mono text-sm resize-y"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Run Button */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={handleRunTest}
            disabled={!canRun || isRunning}
            className="flex-1"
          >
            {isRunning ? 'Running...' : 'Run Test'}
          </Button>
          {isRunning && (
            <Button variant="danger" onClick={handleCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Right Column: Output */}
      <div className="space-y-4">
        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg border border-destructive bg-destructive/10 text-destructive">
            <p className="text-sm font-medium">Error</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{error}</p>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Duration:</span>{' '}
                <span className="font-mono">
                  {(stats.duration / 1000).toFixed(2)}s
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Output:</span>{' '}
                <span className="font-mono">{stats.charCount} chars</span>
              </div>
            </div>
          </div>
        )}

        {/* Thinking Output (if any) */}
        {thinking && (
          <div>
            <label className="block text-sm font-medium mb-2">Thinking</label>
            <textarea
              readOnly
              value={thinking}
              className="w-full p-3 rounded-lg border bg-muted/30 font-mono text-sm h-32 resize-y overflow-auto"
            />
          </div>
        )}

        {/* LLM Output */}
        <div>
          <label className="block text-sm font-medium mb-2">LLM Output</label>
          <textarea
            readOnly
            value={output}
            placeholder="Output will appear here..."
            className="w-full p-3 rounded-lg border bg-card font-mono text-sm h-64 resize-y overflow-auto"
          />
        </div>
      </div>
    </div>
  );
};

FreeformTaskPanel.displayName = 'FreeformTaskPanel';
