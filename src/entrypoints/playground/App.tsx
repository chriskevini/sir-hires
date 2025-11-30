/**
 * Prompt Playground
 * A testing/iteration tool for LLM prompts
 *
 * Features:
 * - Task selector (Job Extraction / Profile Extraction / Synthesis)
 * - Editable system prompt (in-memory, not persisted)
 * - Test input textarea + fixture loader dropdown
 * - "Run Test" button with streaming output
 * - LLM output display with timing/token stats
 * - Parser validation (runs parser on output, shows valid/invalid + parsed JSON)
 * - "Reset to Default" button per prompt
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
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
import { parseJobTemplate, type JobTemplateData } from '@/utils/job-parser';
import { parseProfileTemplate } from '@/utils/profile-parser';
import { useLLMSettings } from '@/hooks/useLLMSettings';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

// =============================================================================
// TYPES
// =============================================================================

type TaskType = 'job-extraction' | 'profile-extraction' | 'synthesis';

interface TaskDefinition {
  label: string;
  config: TaskConfig;
  defaultPrompt: string;
  contextKeys: string[];
  parser: ((content: string) => unknown) | null;
  parserName: string | null;
}

interface ParseResult {
  valid: boolean;
  data: unknown;
  error?: string;
}

interface RunStats {
  startTime: number;
  endTime: number;
  duration: number;
  charCount: number;
}

// =============================================================================
// FIXTURES
// =============================================================================

const JOB_FIXTURE_COMPLETE = `Software Engineer - Full Stack
TechCorp Inc.
San Francisco, CA (Hybrid - 2 days in office)

Salary: $150,000 - $200,000 per year

About the Role:
We're looking for a Senior Full Stack Engineer to join our growing team. You'll be working on our flagship product, helping to build scalable web applications that serve millions of users.

Requirements:
- 5+ years of experience in software development
- Strong proficiency in React, TypeScript, and Node.js
- Experience with PostgreSQL and Redis
- Familiarity with AWS services (EC2, S3, Lambda)
- Excellent communication skills

Nice to Have:
- Experience with GraphQL
- Knowledge of Kubernetes
- Previous startup experience

Benefits:
- Unlimited PTO
- 401(k) matching
- Health, dental, and vision insurance
- Remote work flexibility

Posted: November 15, 2025
Application Deadline: December 31, 2025`;

const JOB_FIXTURE_MINIMAL = `Hiring: Web Developer at StartupXYZ
Remote position, $80k-$100k
Must know JavaScript and React
Apply now!`;

const JOB_FIXTURE_MESSY = `🚀 AMAZING OPPORTUNITY 🚀

We're looking for a rockstar developer!!!

Position: Maybe Senior? Or Mid? IDK, depends on experience
Company: CoolTech (we're in stealth mode)
Location: Anywhere! Or maybe NYC sometimes? 

Pay: Competitive (trust us bro)

What we need:
* coding skills (duh)
* someone who can work fast
* 10x developer mindset
* must be passionate about disrupting industries

We offer:
- pizza fridays
- ping pong table
- "unlimited" vacation (but don't actually take it lol)

DM us if interested, no deadline, first come first serve!`;

const PROFILE_FIXTURE_COMPLETE = `JANE DOE
123 Main Street, San Francisco, CA 94102
jane.doe@email.com | (555) 123-4567
linkedin.com/in/janedoe | github.com/janedoe

SUMMARY
Experienced software engineer with 8+ years of full-stack development experience. Passionate about building scalable systems and mentoring junior developers.

EXPERIENCE

Senior Software Engineer | TechCorp Inc.
January 2020 - Present
- Led development of microservices architecture serving 2M+ daily users
- Mentored team of 5 junior developers
- Reduced API response time by 40% through optimization
- Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes

Software Engineer | StartupXYZ
June 2016 - December 2019
- Built customer-facing dashboard using React and TypeScript
- Designed and implemented RESTful APIs
- Collaborated with product team to define technical requirements

EDUCATION

Master of Science in Computer Science
Stanford University | 2014 - 2016
GPA: 3.8

Bachelor of Science in Computer Science
UC Berkeley | 2010 - 2014
GPA: 3.6

SKILLS
JavaScript, TypeScript, Python, React, Node.js, PostgreSQL, MongoDB, AWS, Docker, Kubernetes

CERTIFICATIONS
- AWS Certified Solutions Architect
- Google Cloud Professional Data Engineer`;

const PROFILE_FIXTURE_MINIMAL = `John Smith
john@email.com

Developer at SomeCo (2020-present)
- Built stuff
- Fixed bugs

BS Computer Science, State University 2019`;

// Fixture definitions
const FIXTURES: Record<TaskType, Array<{ label: string; content: string }>> = {
  'job-extraction': [
    { label: 'Complete Job Posting', content: JOB_FIXTURE_COMPLETE },
    { label: 'Minimal Job', content: JOB_FIXTURE_MINIMAL },
    { label: 'Messy/Informal Job', content: JOB_FIXTURE_MESSY },
  ],
  'profile-extraction': [
    { label: 'Complete Profile', content: PROFILE_FIXTURE_COMPLETE },
    { label: 'Minimal Profile', content: PROFILE_FIXTURE_MINIMAL },
  ],
  synthesis: [],
};

// =============================================================================
// TASK DEFINITIONS
// =============================================================================

const TASKS: Record<TaskType, TaskDefinition> = {
  'job-extraction': {
    label: 'Job Extraction',
    config: jobExtractionConfig,
    defaultPrompt: JOB_EXTRACTION_PROMPT,
    contextKeys: ['rawText'],
    parser: parseJobTemplate,
    parserName: 'parseJobTemplate',
  },
  'profile-extraction': {
    label: 'Profile Extraction',
    config: profileExtractionConfig,
    defaultPrompt: PROFILE_EXTRACTION_PROMPT,
    contextKeys: ['rawText'],
    parser: parseProfileTemplate,
    parserName: 'parseProfileTemplate',
  },
  synthesis: {
    label: 'Synthesis',
    config: synthesisConfig,
    defaultPrompt: SYNTHESIS_PROMPT,
    contextKeys: ['profile', 'job', 'task', 'template', 'tone'],
    parser: null,
    parserName: null,
  },
};

// =============================================================================
// COMPONENTS
// =============================================================================

export const App: React.FC = () => {
  // Initialize theme
  useTheme();

  // LLM settings
  const llmSettings = useLLMSettings({ autoConnect: true });

  // Task state
  const [selectedTask, setSelectedTask] = useState<TaskType>('job-extraction');
  const [systemPrompt, setSystemPrompt] = useState(
    TASKS['job-extraction'].defaultPrompt
  );
  const [testInput, setTestInput] = useState('');

  // For synthesis task, we need multiple context fields
  const [synthesisContext, setSynthesisContext] = useState({
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

  // Current task definition
  const currentTask = TASKS[selectedTask];

  // Handle task change
  const handleTaskChange = useCallback((task: TaskType) => {
    setSelectedTask(task);
    setSystemPrompt(TASKS[task].defaultPrompt);
    setOutput('');
    setThinking('');
    setStats(null);
    setParseResult(null);
    setError(null);
    setTestInput('');
  }, []);

  // Reset prompt to default
  const handleResetPrompt = useCallback(() => {
    setSystemPrompt(currentTask.defaultPrompt);
  }, [currentTask]);

  // Load fixture
  const handleLoadFixture = useCallback((content: string) => {
    setTestInput(content);
  }, []);

  // Run the test
  const handleRunTest = useCallback(async () => {
    if (!llmSettings.model) {
      setError('Please select a model in LLM settings');
      return;
    }

    // Reset state
    setOutput('');
    setThinking('');
    setStats(null);
    setParseResult(null);
    setError(null);
    setIsRunning(true);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    // Start keepalive
    const stopKeepalive = startKeepalive();

    const startTime = Date.now();

    try {
      // Create LLM client
      const llmClient = new LLMClient({
        endpoint: llmSettings.endpoint,
      });

      // Build context based on task type
      let context: Record<string, string>;
      if (selectedTask === 'synthesis') {
        context = { ...synthesisContext };
      } else {
        context = { rawText: testInput };
      }

      // Create modified config with custom prompt
      const modifiedConfig: TaskConfig = {
        ...currentTask.config,
        prompt: systemPrompt,
      };

      // Run the task
      const result = await runTask({
        config: modifiedConfig,
        context,
        llmClient,
        model: llmSettings.model,
        signal: abortControllerRef.current.signal,
        onChunk: (delta) => setOutput((prev) => prev + delta),
        onThinking: (delta) => setThinking((prev) => prev + delta),
      });

      const endTime = Date.now();

      // Set stats
      setStats({
        startTime,
        endTime,
        duration: endTime - startTime,
        charCount: result.content.length,
      });

      // Run parser if available
      if (currentTask.parser && result.content) {
        try {
          const parsed = currentTask.parser(result.content);
          // Check if parsing produced valid data
          const isValid =
            parsed &&
            typeof parsed === 'object' &&
            ((parsed as JobTemplateData).type !== null ||
              Object.keys((parsed as JobTemplateData).topLevelFields || {})
                .length > 0);
          setParseResult({
            valid: !!isValid,
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

      if (result.cancelled) {
        setError('Task was cancelled');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      stopKeepalive();
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [
    llmSettings.model,
    llmSettings.endpoint,
    selectedTask,
    testInput,
    synthesisContext,
    systemPrompt,
    currentTask,
  ]);

  // Cancel running task
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Check if prompt is modified
  const isPromptModified = systemPrompt !== currentTask.defaultPrompt;

  // Check if can run (has required input)
  const canRun = useMemo(() => {
    if (!llmSettings.isConnected) return false;
    if (selectedTask === 'synthesis') {
      return synthesisContext.profile.trim() && synthesisContext.job.trim();
    }
    return testInput.trim().length > 0;
  }, [llmSettings.isConnected, selectedTask, testInput, synthesisContext]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Prompt Playground</h1>
          <p className="text-muted-foreground">
            Test and iterate on LLM prompts for extraction and synthesis tasks.
          </p>
        </div>

        {/* Connection Status */}
        <div className="mb-4 p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  llmSettings.isConnected ? 'bg-green-500' : 'bg-red-500'
                )}
              />
              <span className="text-sm">
                {llmSettings.isConnected
                  ? `Connected to ${llmSettings.serverUrl}`
                  : 'Not connected'}
              </span>
            </div>
            {llmSettings.model && (
              <div className="text-sm text-muted-foreground">
                Model: <span className="font-mono">{llmSettings.model}</span>
              </div>
            )}
          </div>
          {llmSettings.errorMessage && (
            <p className="text-sm text-destructive mt-2">
              {llmSettings.errorMessage}
            </p>
          )}
        </div>

        {/* Task Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Task Type</label>
          <div className="flex gap-2">
            {(Object.keys(TASKS) as TaskType[]).map((task) => (
              <Button
                key={task}
                variant={selectedTask === task ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleTaskChange(task)}
              >
                {TASKS[task].label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            {/* Test Input */}
            {selectedTask === 'synthesis' ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  Synthesis Context
                </label>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Profile (MarkdownDB)
                  </label>
                  <textarea
                    value={synthesisContext.profile}
                    onChange={(e) =>
                      setSynthesisContext((prev) => ({
                        ...prev,
                        profile: e.target.value,
                      }))
                    }
                    className="w-full h-24 p-2 rounded-lg border bg-card font-mono text-sm resize-y"
                    placeholder="Enter profile content..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Job (MarkdownDB)
                  </label>
                  <textarea
                    value={synthesisContext.job}
                    onChange={(e) =>
                      setSynthesisContext((prev) => ({
                        ...prev,
                        job: e.target.value,
                      }))
                    }
                    className="w-full h-24 p-2 rounded-lg border bg-card font-mono text-sm resize-y"
                    placeholder="Enter job content..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Template
                  </label>
                  <textarea
                    value={synthesisContext.template}
                    onChange={(e) =>
                      setSynthesisContext((prev) => ({
                        ...prev,
                        template: e.target.value,
                      }))
                    }
                    className="w-full h-16 p-2 rounded-lg border bg-card font-mono text-sm resize-y"
                    placeholder="Enter template..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Task Instruction
                    </label>
                    <input
                      type="text"
                      value={synthesisContext.task}
                      onChange={(e) =>
                        setSynthesisContext((prev) => ({
                          ...prev,
                          task: e.target.value,
                        }))
                      }
                      className="w-full p-2 rounded-lg border bg-card text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Tone
                    </label>
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
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    Test Input
                  </label>
                  {FIXTURES[selectedTask].length > 0 && (
                    <select
                      className="text-sm p-1 rounded border bg-card"
                      onChange={(e) => {
                        const fixture = FIXTURES[selectedTask].find(
                          (f) => f.label === e.target.value
                        );
                        if (fixture) handleLoadFixture(fixture.content);
                      }}
                      value=""
                    >
                      <option value="" disabled>
                        Load Fixture...
                      </option>
                      {FIXTURES[selectedTask].map((fixture) => (
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
                  className="w-full h-48 p-3 rounded-lg border bg-card font-mono text-sm resize-y"
                  placeholder={`Enter ${selectedTask === 'job-extraction' ? 'job posting' : 'resume/profile'} text to extract...`}
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
                <label className="block text-sm font-medium mb-2">
                  Thinking
                </label>
                <div className="p-3 rounded-lg border bg-muted/30 font-mono text-sm max-h-32 overflow-auto whitespace-pre-wrap">
                  {thinking}
                </div>
              </div>
            )}

            {/* LLM Output */}
            <div>
              <label className="block text-sm font-medium mb-2">
                LLM Output
              </label>
              <div className="p-3 rounded-lg border bg-card font-mono text-sm h-64 overflow-auto whitespace-pre-wrap">
                {output || (
                  <span className="text-muted-foreground italic">
                    Output will appear here...
                  </span>
                )}
              </div>
            </div>

            {/* Parser Validation */}
            {currentTask.parser && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Parser Validation ({currentTask.parserName})
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
                      <pre className="mt-2 p-2 rounded bg-background overflow-auto max-h-48 text-xs">
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
      </div>
    </div>
  );
};
