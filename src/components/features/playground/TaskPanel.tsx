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
  useImperativeHandle,
  forwardRef,
} from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { FIXTURES, type TaskType } from '@/data/playground-fixtures';
import { getRandomTone } from '@/utils/synthesis-utils';
import type { useLLMSettings } from '@/hooks/useLLMSettings';
import { usePlaygroundTaskExecution } from '@/hooks/usePlaygroundTaskExecution';
import type { TaskDefinition, ParseResult, SynthesisContext } from './types';
import { isValidJobData, isValidProfileData } from './validation';
import { LLMParametersPanel } from './LLMParametersPanel';
import {
  TaskErrorDisplay,
  TaskStatsDisplay,
  TaskOutputDisplay,
} from './OutputDisplay';
import {
  synthesisTabConfigs,
  extractionTabConfigs,
  type SynthesisTabId,
  type ExtractionTabId,
} from './colors';

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

    // LLM parameters (initialized from task config)
    const [temperature, setTemperature] = useState(taskDef.config.temperature);
    const [maxTokens, setMaxTokens] = useState(taskDef.config.maxTokens);

    // Parser result state (separate from execution state)
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);

    // Use shared task execution hook
    const {
      output,
      thinking,
      stats,
      error,
      isRunning,
      executeContextTask,
      cancel: handleCancel,
    } = usePlaygroundTaskExecution({ llmSettings });

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
      // Reset parse result before running
      setParseResult(null);

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
      const modifiedConfig = {
        ...taskDef.config,
        prompt: systemPrompt,
      };

      const result = await executeContextTask({
        config: modifiedConfig,
        context,
        temperature,
        maxTokens,
      });

      // Run parser if available with task-specific validation
      if (result.success && taskDef.parser && result.content) {
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
              parseError instanceof Error ? parseError.message : 'Parse error',
          });
        }
      }
    }, [
      taskType,
      testInput,
      synthesisContext.profile,
      synthesisContext.job,
      synthesisContext.task,
      synthesisContext.template,
      synthesisContext.tone,
      systemPrompt,
      temperature,
      maxTokens,
      taskDef,
      executeContextTask,
    ]);

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
          {/* Task Inputs - tabbed interface for all task types */}
          {taskType === 'synthesis' ? (
            <SynthesisInputs
              synthesisContext={synthesisContext}
              setSynthesisContext={setSynthesisContext}
              getExtractionOutput={getExtractionOutput}
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
              isPromptModified={isPromptModified}
              onResetPrompt={handleResetPrompt}
            />
          ) : (
            <ExtractionInputs
              taskType={taskType}
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
              isPromptModified={isPromptModified}
              onResetPrompt={handleResetPrompt}
              testInput={testInput}
              setTestInput={setTestInput}
              onLoadFixture={handleLoadFixture}
            />
          )}

          {/* LLM Parameters */}
          <LLMParametersPanel
            temperature={temperature}
            onTemperatureChange={setTemperature}
            maxTokens={maxTokens}
            onMaxTokensChange={setMaxTokens}
            defaultTemperature={taskDef.config.temperature}
            defaultMaxTokens={taskDef.config.maxTokens}
            className="p-3 rounded-lg border bg-card"
          />

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
          <TaskErrorDisplay error={error} />

          {/* Stats */}
          <TaskStatsDisplay stats={stats} />

          {/* Thinking + LLM Output */}
          <TaskOutputDisplay thinking={thinking} output={output} />

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
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  isPromptModified: boolean;
  onResetPrompt: () => void;
}

const SynthesisInputs: React.FC<SynthesisInputsProps> = ({
  synthesisContext,
  setSynthesisContext,
  getExtractionOutput,
  systemPrompt,
  setSystemPrompt,
  isPromptModified,
  onResetPrompt,
}) => {
  const [selectedTab, setSelectedTab] = useState<SynthesisTabId>('system');

  const selectedTabConfig = synthesisTabConfigs.find(
    (t) => t.id === selectedTab
  )!;

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        Synthesis Context
      </label>

      {/* Tab Row */}
      <div className="flex items-end gap-0.5">
        {synthesisTabConfigs.map((tab) => {
          const isSelected = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id)}
              className={cn(
                'relative flex items-center justify-center px-4 py-2',
                'border border-b-0 rounded-t-lg cursor-pointer',
                'text-xs font-medium transition-all duration-150',
                '-mb-px',
                isSelected
                  ? cn(
                      tab.panelBg,
                      'text-foreground z-[2]',
                      'shadow-[0_-2px_4px_rgba(0,0,0,0.05)]',
                      tab.panelBorder
                    )
                  : 'bg-muted-foreground/10 text-muted-foreground border-border hover:bg-muted-foreground/20 hover:text-foreground'
              )}
            >
              {tab.label}
              {/* Border cover - creates seamless connection to panel */}
              {isSelected && (
                <span className="absolute bottom-0 left-0 right-0 h-px -mb-px bg-background" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div
        className={cn(
          'border rounded-b-lg p-3',
          selectedTabConfig.panelBorder,
          selectedTabConfig.panelBg
        )}
      >
        {selectedTab === 'system' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                System Prompt
                {isPromptModified && (
                  <span className="ml-2 text-amber-500">(modified)</span>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={onResetPrompt}
                disabled={!isPromptModified}
              >
                Reset to Default
              </Button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-96 p-2 rounded border bg-background font-mono text-sm resize-y"
              placeholder="Enter system prompt..."
            />
          </div>
        )}

        {selectedTab === 'profile' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Profile (MarkdownDB)
              </span>
              {getExtractionOutput && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
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
              className="w-full h-96 p-2 rounded border bg-background font-mono text-sm resize-y"
              placeholder="Enter profile content..."
            />
          </div>
        )}

        {selectedTab === 'job' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Job (MarkdownDB)
              </span>
              {getExtractionOutput && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
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
              className="w-full h-96 p-2 rounded border bg-background font-mono text-sm resize-y"
              placeholder="Enter job content..."
            />
          </div>
        )}

        {selectedTab === 'template' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Template</span>
              {FIXTURES.synthesis.length > 0 && (
                <select
                  className="text-xs p-1 rounded border bg-background"
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
              className="w-full h-96 p-2 rounded border bg-background font-mono text-sm resize-y"
              placeholder="Enter template..."
            />
          </div>
        )}

        {selectedTab === 'task' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Task Instruction
              </span>
            </div>
            <textarea
              value={synthesisContext.task}
              onChange={(e) =>
                setSynthesisContext((prev) => ({
                  ...prev,
                  task: e.target.value,
                }))
              }
              className="w-full h-96 p-2 rounded border bg-background text-sm resize-y"
              placeholder="Enter task instruction..."
            />
          </div>
        )}

        {selectedTab === 'tone' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Tone</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
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
              className="w-full p-2 rounded border bg-background text-sm"
              placeholder="Enter tone..."
            />
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// EXTRACTION INPUTS SUBCOMPONENT
// =============================================================================

interface ExtractionInputsProps {
  taskType: Exclude<TaskType, 'synthesis'>;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  isPromptModified: boolean;
  onResetPrompt: () => void;
  testInput: string;
  setTestInput: (value: string) => void;
  onLoadFixture: (content: string) => void;
}

const ExtractionInputs: React.FC<ExtractionInputsProps> = ({
  taskType,
  systemPrompt,
  setSystemPrompt,
  isPromptModified,
  onResetPrompt,
  testInput,
  setTestInput,
  onLoadFixture,
}) => {
  const [selectedTab, setSelectedTab] = useState<ExtractionTabId>('system');

  const selectedTabConfig = extractionTabConfigs.find(
    (t) => t.id === selectedTab
  )!;

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {taskType === 'job-extraction'
          ? 'Job Extraction'
          : taskType === 'profile-extraction'
            ? 'Profile Extraction'
            : 'Custom Task'}
      </label>

      {/* Tab Row */}
      <div className="flex items-end gap-0.5">
        {extractionTabConfigs.map((tab) => {
          const isSelected = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id)}
              className={cn(
                'relative flex items-center justify-center px-4 py-2',
                'border border-b-0 rounded-t-lg cursor-pointer',
                'text-xs font-medium transition-all duration-150',
                '-mb-px',
                isSelected
                  ? cn(
                      tab.panelBg,
                      'text-foreground z-[2]',
                      'shadow-[0_-2px_4px_rgba(0,0,0,0.05)]',
                      tab.panelBorder
                    )
                  : 'bg-muted-foreground/10 text-muted-foreground border-border hover:bg-muted-foreground/20 hover:text-foreground'
              )}
            >
              {tab.label}
              {/* Border cover - creates seamless connection to panel */}
              {isSelected && (
                <span className="absolute bottom-0 left-0 right-0 h-px -mb-px bg-background" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div
        className={cn(
          'border rounded-b-lg p-3',
          selectedTabConfig.panelBorder,
          selectedTabConfig.panelBg
        )}
      >
        {selectedTab === 'system' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                System Prompt
                {isPromptModified && (
                  <span className="ml-2 text-amber-500">(modified)</span>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={onResetPrompt}
                disabled={!isPromptModified}
              >
                Reset to Default
              </Button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-96 p-2 rounded border bg-background font-mono text-sm resize-y"
              placeholder="Enter system prompt..."
            />
          </div>
        )}

        {selectedTab === 'input' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {taskType === 'job-extraction'
                  ? 'Job Posting'
                  : taskType === 'profile-extraction'
                    ? 'Resume/Profile'
                    : 'Raw Text'}
              </span>
              {FIXTURES[taskType].length > 0 && (
                <select
                  className="text-xs p-1 rounded border bg-background"
                  onChange={(e) => {
                    const fixture = FIXTURES[taskType].find(
                      (f) => f.label === e.target.value
                    );
                    if (fixture) onLoadFixture(fixture.content);
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
              className="w-full h-96 p-2 rounded border bg-background font-mono text-sm resize-y"
              placeholder={
                taskType === 'job-extraction'
                  ? 'Enter job posting text to extract...'
                  : taskType === 'profile-extraction'
                    ? 'Enter resume/profile text to extract...'
                    : 'Enter text...'
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};
