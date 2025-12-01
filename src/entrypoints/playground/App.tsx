/**
 * Prompt Playground
 * A testing/iteration tool for LLM prompts
 *
 * Features:
 * - Task selector (Job Extraction / Profile Extraction / Synthesis / Custom)
 * - Editable system prompt (in-memory, not persisted)
 * - Test input textarea + fixture loader dropdown
 * - "Run Test" button with streaming output
 * - LLM output display with timing/token stats
 * - Parser validation (runs parser on output, shows valid/invalid + parsed JSON)
 * - "Reset to Default" button per prompt
 * - Custom task panel for freeform prompt experimentation
 *
 * ARCHITECTURE NOTE: All task panels stay mounted simultaneously (visibility
 * controlled via CSS) to preserve user input and state when switching tabs.
 * This is intentional - unmounting would cause users to lose their
 * work-in-progress prompts, test inputs, and outputs.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  jobExtractionConfig,
  profileExtractionConfig,
  synthesisConfig,
  JOB_EXTRACTION_PROMPT,
  PROFILE_EXTRACTION_PROMPT,
  SYNTHESIS_PROMPT,
} from '@/tasks';
import { parseJobTemplate } from '@/utils/job-parser';
import { parseProfileTemplate } from '@/utils/profile-parser';
import { useLLMSettings } from '@/hooks/useLLMSettings';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import {
  TaskPanel,
  FreeformTaskPanel,
  LLMSettingsPanel,
  type TaskPanelHandle,
  type TaskDefinition,
} from '@/components/features/playground';
import type { TaskType } from '@/data/playground-fixtures';

// =============================================================================
// TASK DEFINITIONS
// =============================================================================

// Predefined tasks (have configs, parsers, etc.)
type PredefinedTaskType = 'job-extraction' | 'profile-extraction' | 'synthesis';

const PREDEFINED_TASKS: Record<PredefinedTaskType, TaskDefinition> = {
  'job-extraction': {
    label: 'Job Extraction',
    config: jobExtractionConfig,
    defaultPrompt: JOB_EXTRACTION_PROMPT,
    parser: parseJobTemplate,
    parserName: 'parseJobTemplate',
  },
  'profile-extraction': {
    label: 'Profile Extraction',
    config: profileExtractionConfig,
    defaultPrompt: PROFILE_EXTRACTION_PROMPT,
    parser: parseProfileTemplate,
    parserName: 'parseProfileTemplate',
  },
  synthesis: {
    label: 'Synthesis',
    config: synthesisConfig,
    defaultPrompt: SYNTHESIS_PROMPT,
    parser: null,
    parserName: null,
  },
};

// All task types including custom
const TASK_LABELS: Record<TaskType, string> = {
  'job-extraction': 'Job Extraction',
  'profile-extraction': 'Profile Extraction',
  synthesis: 'Synthesis',
  custom: 'Custom',
};

const ALL_TASK_TYPES: TaskType[] = [
  'job-extraction',
  'profile-extraction',
  'synthesis',
  'custom',
];

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

export const App: React.FC = () => {
  // Initialize theme
  useTheme();

  // LLM settings (shared across all panels)
  const llmSettings = useLLMSettings({ autoConnect: true });

  // Only track which task is visible
  const [selectedTask, setSelectedTask] = useState<TaskType>('job-extraction');

  // Refs for extraction panels to get their output
  const jobExtractionRef = useRef<TaskPanelHandle>(null);
  const profileExtractionRef = useRef<TaskPanelHandle>(null);

  // Callback for synthesis panel to get extraction outputs
  const getExtractionOutput = useCallback(
    (task: 'job-extraction' | 'profile-extraction') => {
      if (task === 'job-extraction') {
        return jobExtractionRef.current?.getOutput() || '';
      }
      return profileExtractionRef.current?.getOutput() || '';
    },
    []
  );

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

        {/* LLM Settings */}
        <LLMSettingsPanel llmSettings={llmSettings} />

        {/* Task Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Task Type</label>
          <div className="flex gap-2">
            {ALL_TASK_TYPES.map((task) => (
              <Button
                key={task}
                variant={selectedTask === task ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedTask(task)}
              >
                {TASK_LABELS[task]}
              </Button>
            ))}
          </div>
        </div>

        {/* Task Panels - all mounted, visibility controlled by CSS */}
        <TaskPanel
          ref={jobExtractionRef}
          taskType="job-extraction"
          taskDef={PREDEFINED_TASKS['job-extraction']}
          isVisible={selectedTask === 'job-extraction'}
          llmSettings={llmSettings}
        />
        <TaskPanel
          ref={profileExtractionRef}
          taskType="profile-extraction"
          taskDef={PREDEFINED_TASKS['profile-extraction']}
          isVisible={selectedTask === 'profile-extraction'}
          llmSettings={llmSettings}
        />
        <TaskPanel
          taskType="synthesis"
          taskDef={PREDEFINED_TASKS['synthesis']}
          isVisible={selectedTask === 'synthesis'}
          llmSettings={llmSettings}
          getExtractionOutput={getExtractionOutput}
        />
        <FreeformTaskPanel
          isVisible={selectedTask === 'custom'}
          llmSettings={llmSettings}
        />
      </div>
    </div>
  );
};
