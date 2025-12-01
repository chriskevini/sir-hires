/**
 * TaskPanel Component
 *
 * Individual task panel for the Prompt Playground that maintains its own state.
 * Each panel (job-extraction, profile-extraction, synthesis) is rendered independently
 * and visibility is controlled via CSS.
 *
 * IMPORTANT: All task panels stay mounted simultaneously to preserve user input
 * and state when switching between tabs. This is intentional - unmounting would
 * cause users to lose their work-in-progress prompts, test inputs, and outputs.
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { LLMClient } from '@/utils/llm-client';
import { runTask, startKeepalive } from '@/utils/llm-task-runner';
import type { TaskConfig } from '@/tasks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { FIXTURES, type TaskType } from '@/data/playground-fixtures';
import { getRandomTone } from '@/utils/synthesis-utils';
import type { useLLMSettings } from '@/hooks/useLLMSettings';
import type {
  TaskDefinition,
  ParseResult,
  RunStats,
  SynthesisContext,
} from './types';
import { isValidJobData, isValidProfileData } from './validation';

// =============================================================================
// TYPES
// =============================================================================

export interface TaskPanelProps {
  taskType: TaskType;
  taskDef: TaskDefinition;
  isVisible: boolean;
  llmSettings: ReturnType<typeof useLLMSettings>;
  /** Function to get output from other extraction panels (for synthesis) */
  getExtractionOutput?: (
    task: 'job-extraction' | 'profile-extraction'
  ) => string;
}

/** Ref handle for TaskPanel to expose output getter */
export interface TaskPanelHandle {
  getOutput: () => string;
}

// =============================================================================
// TASK PANEL COMPONENT
// =============================================================================

export const TaskPanel = forwardRef<TaskPanelHandle, TaskPanelProps>(
  ({ taskType, taskDef, isVisible, llmSettings, getExtractionOutput }, ref) => {
    // Task-specific state
    const [systemPrompt, setSystemPrompt] = useState(taskDef.defaultPrompt);
    const [testInput, setTestInput] = useState('');
    const [synthesisContext, setSynthesisContext] = useState<SynthesisContext>({
      profile: '',
      job: '',
      task: 'Follow the TEMPLATE and TONE and output only the final document.',
      template: '',
      tone: 'professional',
    });

    // Output state
    const [output, setOutput] = useState('');
    const [thinking, setThinking] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<RunStats | null>(null);
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Abort controller ref
    const abortControllerRef = useRef<AbortController | null>(null);
    // Keepalive cleanup ref
    const stopKeepaliveRef = useRef<(() => void) | null>(null);

    // Cleanup AbortController and keepalive on unmount
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

    // Expose output getter via ref (for parent to access)
    useImperativeHandle(
      ref,
      () => ({
        getOutput: () => output,
      }),
      [output]
    );

    // Reset prompt to default
    const handleResetPrompt = useCallback(() => {
      setSystemPrompt(taskDef.defaultPrompt);
    }, [taskDef.defaultPrompt]);

    // Load fixture
    const handleLoadFixture = useCallback((content: string) => {
      setTestInput(content);
    }, []);

    // Run the test
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
      setParseResult(null);
      setError(null);
      setIsRunning(true);

      abortControllerRef.current = new AbortController();
      stopKeepaliveRef.current = startKeepalive();
      const startTime = Date.now();

      try {
        const llmClient = new LLMClient({
          endpoint: llmSettings.endpoint,
        });

        // Build context based on task type
        let context: Record<string, string>;
        if (taskType === 'synthesis') {
          context = {
            profile: synthesisContext.profile,
            job: synthesisContext.job,
            task: synthesisContext.task,
            template: synthesisContext.template,
            tone: synthesisContext.tone,
          };
        } else {
          context = { rawText: testInput };
        }

        // Create modified config with custom prompt
        const modifiedConfig: TaskConfig = {
          ...taskDef.config,
          prompt: systemPrompt,
        };

        const result = await runTask({
          config: modifiedConfig,
          context,
          llmClient,
          model,
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

        // Run parser if available with task-specific validation
        if (taskDef.parser && result.content) {
          try {
            const parsed = taskDef.parser(result.content);

            let isValid = false;
            if (taskType === 'job-extraction') {
              isValid = isValidJobData(parsed);
            } else if (taskType === 'profile-extraction') {
              isValid = isValidProfileData(parsed);
            }

            setParseResult({
              valid: isValid,
              data: parsed,
            });
          } catch (parseError) {
            setParseResult({
              valid: false,
              data: null,
              error:
                parseError instanceof Error
                  ? parseError.message
                  : 'Parse error',
            });
          }
        }

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
      taskType,
      testInput,
      synthesisContext.profile,
      synthesisContext.job,
      synthesisContext.task,
      synthesisContext.template,
      synthesisContext.tone,
      systemPrompt,
      taskDef,
    ]);

    // Cancel running task
    const handleCancel = useCallback(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, []);

    // Check if prompt is modified
    const isPromptModified = systemPrompt !== taskDef.defaultPrompt;

    // Check if can run (has required input)
    const canRun = useMemo(() => {
      if (!llmSettings.isConnected) return false;
      if (taskType === 'synthesis') {
        // Synthesis requires profile, job, and template
        return (
          synthesisContext.profile.trim() &&
          synthesisContext.job.trim() &&
          synthesisContext.template.trim()
        );
      }
      return testInput.trim().length > 0;
    }, [
      llmSettings.isConnected,
      taskType,
      testInput,
      synthesisContext.profile,
      synthesisContext.job,
      synthesisContext.template,
    ]);

    return (
      <div
        className={cn(
          'grid grid-cols-1 lg:grid-cols-2 gap-6',
          !isVisible && 'hidden'
        )}
      >
        {/* Left Column: Inputs */}
        <div className="space-y-4">
          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                System Prompt
                {isPromptModified && (
                  <span className="ml-2 text-xs text-amber-500">
                    (modified)
                  </span>
                )}
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetPrompt}
                disabled={!isPromptModified}
              >
                Reset to Default
              </Button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-64 p-3 rounded-lg border bg-card font-mono text-sm resize-y"
              placeholder="Enter system prompt..."
            />
          </div>

          {/* Test Input - varies by task type */}
          {taskType === 'synthesis' ? (
            <SynthesisInputs
              synthesisContext={synthesisContext}
              setSynthesisContext={setSynthesisContext}
              getExtractionOutput={getExtractionOutput}
            />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Test Input</label>
                {FIXTURES[taskType].length > 0 && (
                  <select
                    className="text-sm p-1 rounded border bg-card"
                    onChange={(e) => {
                      const fixture = FIXTURES[taskType].find(
                        (f) => f.label === e.target.value
                      );
                      if (fixture) handleLoadFixture(fixture.content);
                    }}
                    value=""
                  >
                    <option value="" disabled>
                      Load Fixture...
                    </option>
                    {FIXTURES[taskType].map((fixture) => (
                      <option key={fixture.label} value={fixture.label}>
                        {fixture.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="w-full h-64 p-3 rounded-lg border bg-card font-mono text-sm resize-y"
                placeholder={`Enter ${taskType === 'job-extraction' ? 'job posting' : 'resume/profile'} text to extract...`}
              />
            </div>
          )}

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
          <div className="p-3 rounded-lg border bg-card min-h-11">
            {stats ? (
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Duration:</span>{' '}
                  <span className="font-mono">
                    {(stats.duration / 1000).toFixed(2)}s
                  </span>
                </div>
                {stats.ttft !== null && (
                  <div>
                    <span className="text-muted-foreground">TTFT:</span>{' '}
                    <span className="font-mono">
                      {(stats.ttft / 1000).toFixed(2)}s
                    </span>
                  </div>
                )}
                {stats.ttFirstDocument !== null && (
                  <div>
                    <span className="text-muted-foreground">First output:</span>{' '}
                    <span className="font-mono">
                      {(stats.ttFirstDocument / 1000).toFixed(2)}s
                    </span>
                  </div>
                )}
                {(stats.promptTokens !== null ||
                  stats.completionTokens !== null) && (
                  <div>
                    <span className="text-muted-foreground">Tokens:</span>{' '}
                    <span className="font-mono">
                      {stats.promptTokens ?? '?'} in →{' '}
                      {stats.completionTokens ?? '?'} out
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                Stats will appear here after running...
              </div>
            )}
          </div>
          {/* Thinking Output (if any) */}
          {thinking && (
            <div>
              <label className="block text-sm font-medium mb-2">Thinking</label>
              <textarea
                readOnly
                value={thinking}
                className="w-full p-3 rounded-lg border bg-muted/30 font-mono text-sm h-96 resize-y overflow-auto"
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
              className="w-full p-3 rounded-lg border bg-card font-mono text-sm h-96 resize-y overflow-auto"
            />
          </div>

          {/* Parser Validation */}
          {taskDef.parser && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Parser Validation ({taskDef.parserName})
              </label>
              {parseResult ? (
                <div
                  className={cn(
                    'p-3 rounded-lg border',
                    parseResult.valid
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-destructive bg-destructive/10'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        parseResult.valid
                          ? 'text-green-600'
                          : 'text-destructive'
                      )}
                    >
                      {parseResult.valid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                  {parseResult.error && (
                    <p className="text-sm text-destructive mb-2">
                      {parseResult.error}
                    </p>
                  )}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View parsed data
                    </summary>
                    <pre className="mt-2 p-2 rounded bg-background overflow-auto max-h-64 text-xs">
                      {JSON.stringify(parseResult.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="p-3 rounded-lg border bg-card text-sm text-muted-foreground italic">
                  Parser results will appear here after running...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

TaskPanel.displayName = 'TaskPanel';

// =============================================================================
// SYNTHESIS INPUTS SUBCOMPONENT
// =============================================================================

interface SynthesisInputsProps {
  synthesisContext: SynthesisContext;
  setSynthesisContext: React.Dispatch<React.SetStateAction<SynthesisContext>>;
  getExtractionOutput?: (
    task: 'job-extraction' | 'profile-extraction'
  ) => string;
}

const SynthesisInputs: React.FC<SynthesisInputsProps> = ({
  synthesisContext,
  setSynthesisContext,
  getExtractionOutput,
}) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Synthesis Context</label>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs text-muted-foreground">
            Profile (MarkdownDB)
          </label>
          {getExtractionOutput && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-xs px-2"
              onClick={() => {
                const output = getExtractionOutput('profile-extraction');
                if (output) {
                  setSynthesisContext((prev) => ({
                    ...prev,
                    profile: output,
                  }));
                }
              }}
            >
              Copy from Extraction
            </Button>
          )}
        </div>
        <textarea
          value={synthesisContext.profile}
          onChange={(e) =>
            setSynthesisContext((prev) => ({
              ...prev,
              profile: e.target.value,
            }))
          }
          className="w-full h-64 p-2 rounded-lg border bg-card font-mono text-sm resize-y"
          placeholder="Enter profile content..."
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs text-muted-foreground">
            Job (MarkdownDB)
          </label>
          {getExtractionOutput && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-xs px-2"
              onClick={() => {
                const output = getExtractionOutput('job-extraction');
                if (output) {
                  setSynthesisContext((prev) => ({
                    ...prev,
                    job: output,
                  }));
                }
              }}
            >
              Copy from Extraction
            </Button>
          )}
        </div>
        <textarea
          value={synthesisContext.job}
          onChange={(e) =>
            setSynthesisContext((prev) => ({
              ...prev,
              job: e.target.value,
            }))
          }
          className="w-full h-64 p-2 rounded-lg border bg-card font-mono text-sm resize-y"
          placeholder="Enter job content..."
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs text-muted-foreground">
            Template
          </label>
          {FIXTURES.synthesis.length > 0 && (
            <select
              className="text-xs p-1 rounded border bg-card"
              onChange={(e) => {
                const fixture = FIXTURES.synthesis.find(
                  (f) => f.label === e.target.value
                );
                if (fixture) {
                  setSynthesisContext((prev) => ({
                    ...prev,
                    template: fixture.content,
                  }));
                }
              }}
              value=""
            >
              <option value="" disabled>
                Load Template...
              </option>
              {FIXTURES.synthesis.map((fixture) => (
                <option key={fixture.label} value={fixture.label}>
                  {fixture.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <textarea
          value={synthesisContext.template}
          onChange={(e) =>
            setSynthesisContext((prev) => ({
              ...prev,
              template: e.target.value,
            }))
          }
          className="w-full h-64 p-2 rounded-lg border bg-card font-mono text-sm resize-y"
          placeholder="Enter template..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Task Instruction
          </label>
          <textarea
            value={synthesisContext.task}
            onChange={(e) =>
              setSynthesisContext((prev) => ({
                ...prev,
                task: e.target.value,
              }))
            }
            className="w-full h-16 p-2 rounded-lg border bg-card text-sm resize-y"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-muted-foreground">Tone</label>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-xs px-2"
              onClick={() => {
                setSynthesisContext((prev) => ({
                  ...prev,
                  tone: getRandomTone(),
                }));
              }}
            >
              Randomize
            </Button>
          </div>
          <input
            type="text"
            value={synthesisContext.tone}
            onChange={(e) =>
              setSynthesisContext((prev) => ({
                ...prev,
                tone: e.target.value,
              }))
            }
            className="w-full p-2 rounded-lg border bg-card text-sm"
          />
        </div>
      </div>
    </div>
  );
};
