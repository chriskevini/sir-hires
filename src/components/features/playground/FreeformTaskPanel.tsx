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
import {
  jobExtraction,
  profileExtraction,
  synthesis,
  fitCalculation,
} from '@/tasks';
import {
  RAW_COMPLETE_JOB,
  RAW_MINIMAL_JOB,
  RAW_MESSY_JOB,
  RAW_COMPLETE_PROFILE,
  RAW_MINIMAL_PROFILE,
  EXTRACTED_COMPLETE_JOB,
  EXTRACTED_COMPLETE_PROFILE,
} from '@/data/fixtures';

import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { useLLMSettings } from '@/hooks/useLLMSettings';
import { usePlaygroundTaskExecution } from '@/hooks/usePlaygroundTaskExecution';
import { LLMParametersPanel } from './LLMParametersPanel';
import {
  TaskErrorDisplay,
  TaskStatsDisplay,
  TaskOutputDisplay,
} from './OutputDisplay';
import {
  systemTabColor,
  contextFieldColors,
  conversationRoleColors,
} from './colors';
import type {
  ContextField,
  ConversationMessage,
  PlaygroundMode,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface FreeformTaskPanelProps {
  isVisible: boolean;
  llmSettings: ReturnType<typeof useLLMSettings>;
}

// =============================================================================
// PRESET TASKS (for "Load from..." dropdown)
// =============================================================================

const PRESET_TASKS = {
  'job-extraction': {
    label: 'Job Extraction',
    ...jobExtraction,
    fixtures: { rawText: RAW_COMPLETE_JOB },
  },
  'profile-extraction': {
    label: 'Profile Extraction',
    ...profileExtraction,
    fixtures: { rawText: RAW_COMPLETE_PROFILE },
  },
  synthesis: {
    label: 'Synthesis',
    ...synthesis,
    fixtures: {
      job: EXTRACTED_COMPLETE_JOB,
      profile: EXTRACTED_COMPLETE_PROFILE,
      template: synthesis.templates.tailoredResume,
      tone: synthesis.defaultTone,
      task: synthesis.defaultTask,
    },
  },
  'fit-calculation': {
    label: 'Fit Calculation',
    ...fitCalculation,
    fixtures: {
      job: EXTRACTED_COMPLETE_JOB,
      profile: EXTRACTED_COMPLETE_PROFILE,
      task: fitCalculation.defaultTask,
    },
  },
};

// =============================================================================
// FREEFORM TASK PANEL COMPONENT
// =============================================================================

export const FreeformTaskPanel: React.FC<FreeformTaskPanelProps> = ({
  isVisible,
  llmSettings,
}) => {
  // Mode state (context mode vs conversation mode)
  const [mode, setMode] = useState<PlaygroundMode>('context');

  // Context mode state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [contexts, setContexts] = useState<ContextField[]>([
    { name: 'input', content: '' },
  ]);

  // Conversation mode state (messages with internal IDs for React keys)
  const [messages, setMessages] = useState<
    Array<{ id: string; message: ConversationMessage }>
  >([{ id: crypto.randomUUID(), message: { role: 'system', content: '' } }]);

  // Currently selected message tab
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );

  // Shared settings
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);

  // Import error state (separate from task execution errors)
  const [importError, setImportError] = useState<string | null>(null);

  // Use shared task execution hook
  const {
    output,
    thinking,
    stats,
    error,
    isRunning,
    executeContextTask,
    executeMessagesTask,
    cancel: handleCancel,
  } = usePlaygroundTaskExecution({ llmSettings });

  // File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-select first message when entering conversation mode with no selection
  useEffect(() => {
    if (
      mode === 'conversation' &&
      selectedMessageId === null &&
      messages.length > 0
    ) {
      setSelectedMessageId(messages[0].id);
    }
  }, [mode, selectedMessageId, messages]);

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
  // MESSAGE OPERATIONS (Conversation Mode)
  // =============================================================================

  const addMessage = useCallback(
    (role: ConversationMessage['role'] = 'user') => {
      const newId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: newId, message: { role, content: '' } },
      ]);
      setSelectedMessageId(newId);
    },
    []
  );

  const removeMessage = useCallback(
    (id: string) => {
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === id);
        const filtered = prev.filter((m) => m.id !== id);

        // If we're removing the selected message, select an adjacent one
        if (selectedMessageId === id && filtered.length > 0) {
          const newIndex = Math.min(index, filtered.length - 1);
          setSelectedMessageId(filtered[newIndex].id);
        } else if (filtered.length === 0) {
          setSelectedMessageId(null);
        }

        return filtered;
      });
    },
    [selectedMessageId]
  );

  const updateMessageRole = useCallback(
    (id: string, role: ConversationMessage['role']) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, message: { ...m.message, role } } : m
        )
      );
    },
    []
  );

  const updateMessageContent = useCallback((id: string, content: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, message: { ...m.message, content } } : m
      )
    );
  }, []);

  const moveMessage = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0) return;
    setMessages((prev) => {
      if (toIndex >= prev.length) return prev;
      const newMessages = [...prev];
      const [removed] = newMessages.splice(fromIndex, 1);
      newMessages.splice(toIndex, 0, removed);
      return newMessages;
    });
  }, []);

  const insertThinkTag = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, message: { ...m.message, content: '<think>\n' } }
          : m
      )
    );
  }, []);

  // =============================================================================
  // MODE CONVERSION
  // =============================================================================

  const convertToConversationMode = useCallback(() => {
    // Build messages from context mode state
    const newMessages: Array<{ id: string; message: ConversationMessage }> = [];

    // Add system prompt as system message
    if (systemPrompt.trim()) {
      newMessages.push({
        id: crypto.randomUUID(),
        message: { role: 'system', content: systemPrompt },
      });
    }

    // Combine all contexts into a single user message with XML tags
    const userContent = contexts
      .filter((c) => c.name.trim() && c.content.trim())
      .map(
        (c) =>
          `<${c.name.toUpperCase()}>\n${c.content}\n</${c.name.toUpperCase()}>`
      )
      .join('\n\n');

    if (userContent) {
      newMessages.push({
        id: crypto.randomUUID(),
        message: { role: 'user', content: userContent },
      });
    }

    // If no messages were created, add empty system and user
    if (newMessages.length === 0) {
      newMessages.push({
        id: crypto.randomUUID(),
        message: { role: 'system', content: '' },
      });
      newMessages.push({
        id: crypto.randomUUID(),
        message: { role: 'user', content: '' },
      });
    }

    setMessages(newMessages);
    setSelectedMessageId(newMessages[0].id);
    setMode('conversation');
  }, [systemPrompt, contexts]);

  const convertToContextMode = useCallback(() => {
    // Extract system prompt from first system message
    const systemMsg = messages.find((m) => m.message.role === 'system');
    if (systemMsg) {
      setSystemPrompt(systemMsg.message.content);
    }

    // Extract contexts from user messages (best effort - just use raw content)
    const userMsgs = messages.filter((m) => m.message.role === 'user');
    if (userMsgs.length > 0) {
      setContexts([
        {
          name: 'input',
          content: userMsgs.map((m) => m.message.content).join('\n\n'),
        },
      ]);
    }

    setMode('context');
  }, [messages]);

  // =============================================================================
  // LOAD PRESET
  // =============================================================================

  const loadPreset = useCallback((presetKey: keyof typeof PRESET_TASKS) => {
    const preset = PRESET_TASKS[presetKey];
    if (!preset) return;

    // Presets always load into context mode
    setMode('context');
    setSystemPrompt(preset.systemPrompt);
    setContexts(
      preset.context.map((name) => ({
        name,
        content: preset.fixtures[name as keyof typeof preset.fixtures] ?? '',
      }))
    );
    setTemperature(preset.temperature);
    setMaxTokens(preset.maxTokens);
  }, []);

  // =============================================================================
  // IMPORT / EXPORT
  // =============================================================================

  const handleExport = useCallback(() => {
    const config =
      mode === 'context'
        ? {
            mode: 'context' as const,
            systemPrompt,
            contexts,
            temperature,
            maxTokens,
          }
        : {
            mode: 'conversation' as const,
            messages: messages.map((m) => m.message),
            temperature,
            maxTokens,
          };
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playground-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mode, systemPrompt, contexts, messages, temperature, maxTokens]);

  const handleImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setImportError(null); // Clear any previous import error
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);

          // Detect mode from config
          if (
            config.mode === 'conversation' ||
            Array.isArray(config.messages)
          ) {
            // Conversation mode config
            setMode('conversation');
            if (Array.isArray(config.messages)) {
              const importedMessages = config.messages.map(
                (m: ConversationMessage) => ({
                  id: crypto.randomUUID(),
                  message: m,
                })
              );
              setMessages(importedMessages);
              if (importedMessages.length > 0) {
                setSelectedMessageId(importedMessages[0].id);
              }
            }
          } else {
            // Context mode config (default, for backwards compatibility)
            setMode('context');
            if (config.systemPrompt !== undefined)
              setSystemPrompt(config.systemPrompt);
            if (Array.isArray(config.contexts)) setContexts(config.contexts);
          }

          // Shared settings
          if (typeof config.temperature === 'number')
            setTemperature(config.temperature);
          if (typeof config.maxTokens === 'number')
            setMaxTokens(config.maxTokens);
        } catch {
          setImportError('Failed to parse config file');
        }
      };
      reader.readAsText(file);
      // Reset input so same file can be imported again
      event.target.value = '';
    },
    []
  );

  // =============================================================================
  // RUN TASK
  // =============================================================================

  const canRun = useMemo(() => {
    if (!llmSettings.isConnected) return false;

    if (mode === 'context') {
      // Context mode: need system prompt and at least one context with name and content
      if (!systemPrompt.trim()) return false;
      return contexts.some((c) => c.name.trim() && c.content.trim());
    } else {
      // Conversation mode: need at least one message with content
      return messages.some((m) => m.message.content.trim());
    }
  }, [llmSettings.isConnected, mode, systemPrompt, contexts, messages]);

  const handleRunTest = useCallback(async () => {
    if (mode === 'context') {
      // Context mode: use executeContextTask with systemPrompt + context fields
      // Build context record from array (order preserved)
      const contextRecord: Record<string, string> = {};
      contexts.forEach(({ name, content }) => {
        const trimmedName = name.trim();
        if (trimmedName) {
          contextRecord[trimmedName] = content;
        }
      });

      // Build config with context field names array
      const contextNames = contexts
        .map((c) => c.name.trim())
        .filter(Boolean) as Array<
        'rawText' | 'profile' | 'job' | 'template' | 'tone' | 'task'
      >;

      await executeContextTask({
        config: {
          systemPrompt,
          temperature,
          maxTokens,
          context: contextNames,
        },
        context: contextRecord,
        temperature,
        maxTokens,
        noThink: !llmSettings.thinkHarder,
      });
    } else {
      // Conversation mode: use executeMessagesTask with raw messages
      const rawMessages = messages.map((m) => m.message);

      await executeMessagesTask({
        messages: rawMessages,
        temperature,
        maxTokens,
      });
    }
  }, [
    mode,
    systemPrompt,
    contexts,
    messages,
    temperature,
    maxTokens,
    llmSettings.thinkHarder,
    executeContextTask,
    executeMessagesTask,
  ]);

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
                loadPreset(e.target.value as keyof typeof PRESET_TASKS);
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Import
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            Export
          </Button>
        </div>

        {/* Import Error */}
        {importError && (
          <div className="p-2 rounded border border-destructive bg-destructive/10 text-destructive text-sm">
            {importError}
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Mode:</label>
          <div className="flex rounded-lg border bg-card p-0.5">
            <button
              type="button"
              onClick={() => mode !== 'context' && convertToContextMode()}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-colors',
                mode === 'context'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              Context
            </button>
            <button
              type="button"
              onClick={() =>
                mode !== 'conversation' && convertToConversationMode()
              }
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-colors',
                mode === 'conversation'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              Conversation
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            {mode === 'context'
              ? 'System prompt + named context fields'
              : 'Raw message array (system/user/assistant)'}
          </span>
        </div>

        {/* Context Mode: Tabbed System Prompt + Context Fields */}
        {mode === 'context' && (
          <ContextModeInputs
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            contexts={contexts}
            addContext={addContext}
            removeContext={removeContext}
            updateContextName={updateContextName}
            updateContextContent={updateContextContent}
            moveContext={moveContext}
          />
        )}

        {/* Conversation Mode: Tabbed Message Interface */}
        {mode === 'conversation' && (
          <ConversationModeInputs
            messages={messages}
            selectedMessageId={selectedMessageId}
            setSelectedMessageId={setSelectedMessageId}
            addMessage={addMessage}
            removeMessage={removeMessage}
            updateMessageRole={updateMessageRole}
            updateMessageContent={updateMessageContent}
            moveMessage={moveMessage}
            insertThinkTag={insertThinkTag}
          />
        )}

        {/* Model Settings */}
        <LLMParametersPanel
          temperature={temperature}
          onTemperatureChange={setTemperature}
          maxTokens={maxTokens}
          onMaxTokensChange={setMaxTokens}
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
      </div>
    </div>
  );
};

FreeformTaskPanel.displayName = 'FreeformTaskPanel';

// =============================================================================
// CONTEXT MODE INPUTS SUBCOMPONENT
// =============================================================================

interface ContextModeInputsProps {
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  contexts: ContextField[];
  addContext: () => void;
  removeContext: (index: number) => void;
  updateContextName: (index: number, name: string) => void;
  updateContextContent: (index: number, content: string) => void;
  moveContext: (fromIndex: number, toIndex: number) => void;
}

// Fixture options for the dropdown with category grouping
const FIXTURE_OPTIONS = [
  {
    category: 'Job Extraction',
    items: [
      {
        key: 'job-raw-complete',
        label: 'Complete Job (Raw)',
        content: RAW_COMPLETE_JOB,
      },
      {
        key: 'job-raw-minimal',
        label: 'Minimal Job (Raw)',
        content: RAW_MINIMAL_JOB,
      },
      {
        key: 'job-raw-messy',
        label: 'Messy Job (Raw)',
        content: RAW_MESSY_JOB,
      },
    ],
  },
  {
    category: 'Profile Extraction',
    items: [
      {
        key: 'profile-raw-complete',
        label: 'Complete Profile (Raw)',
        content: RAW_COMPLETE_PROFILE,
      },
      {
        key: 'profile-raw-minimal',
        label: 'Minimal Profile (Raw)',
        content: RAW_MINIMAL_PROFILE,
      },
    ],
  },
  {
    category: 'Synthesis Templates',
    items: [
      {
        key: 'synthesis-job',
        label: 'Extracted Job',
        content: EXTRACTED_COMPLETE_JOB,
      },
      {
        key: 'synthesis-profile',
        label: 'Extracted Profile',
        content: EXTRACTED_COMPLETE_PROFILE,
      },
    ],
  },
];

type ContextModeTab = 'system' | number; // number = context index

const ContextModeInputs: React.FC<ContextModeInputsProps> = ({
  systemPrompt,
  setSystemPrompt,
  contexts,
  addContext,
  removeContext,
  updateContextName,
  updateContextContent,
  moveContext,
}) => {
  const [selectedTab, setSelectedTab] = useState<ContextModeTab>('system');

  // Get current panel config
  const currentPanelConfig =
    selectedTab === 'system'
      ? systemTabColor
      : contextFieldColors[(selectedTab as number) % contextFieldColors.length];

  // Handle adding new context and selecting it
  const handleAddContext = () => {
    addContext();
    // Select the new context tab (which will be at the end)
    setSelectedTab(contexts.length);
  };

  // Handle removing context
  const handleRemoveContext = (index: number) => {
    // If we're removing the selected tab, select something else
    if (selectedTab === index) {
      if (index > 0) {
        setSelectedTab(index - 1);
      } else if (contexts.length > 1) {
        setSelectedTab(0);
      } else {
        setSelectedTab('system');
      }
    } else if (typeof selectedTab === 'number' && selectedTab > index) {
      // Adjust selected index if removing a tab before it
      setSelectedTab(selectedTab - 1);
    }
    removeContext(index);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Context Fields</label>

      {/* Tab Row */}
      <div className="flex items-end gap-0.5">
        {/* System Tab */}
        <button
          type="button"
          onClick={() => setSelectedTab('system')}
          className={cn(
            'relative flex items-center justify-center px-4 py-2',
            'border border-b-0 rounded-t-lg cursor-pointer',
            'text-xs font-medium transition-all duration-150',
            '-mb-px',
            selectedTab === 'system'
              ? cn(
                  'text-foreground z-[2]',
                  'shadow-[0_-2px_4px_rgba(0,0,0,0.05)]',
                  systemTabColor.panelBorder,
                  systemTabColor.panelBg
                )
              : 'bg-muted-foreground/10 text-muted-foreground border-border hover:bg-muted-foreground/20 hover:text-foreground'
          )}
        >
          System
          {/* Border cover - creates seamless connection to panel */}
          {selectedTab === 'system' && (
            <span className="absolute bottom-0 left-0 right-0 h-px -mb-px bg-background" />
          )}
        </button>

        {/* Context Tabs */}
        {contexts.map((ctx, index) => {
          const isSelected = selectedTab === index;
          const colorConfig =
            contextFieldColors[index % contextFieldColors.length];
          return (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedTab(index)}
              className={cn(
                'relative flex items-center justify-center px-4 py-2',
                'border border-b-0 rounded-t-lg cursor-pointer',
                'text-xs font-medium transition-all duration-150',
                '-mb-px',
                isSelected
                  ? cn(
                      'text-foreground z-[2]',
                      'shadow-[0_-2px_4px_rgba(0,0,0,0.05)]',
                      colorConfig.panelBorder,
                      colorConfig.panelBg
                    )
                  : 'bg-muted-foreground/10 text-muted-foreground border-border hover:bg-muted-foreground/20 hover:text-foreground'
              )}
            >
              {ctx.name || `Field ${index + 1}`}
              {/* Border cover - creates seamless connection to panel */}
              {isSelected && (
                <span className="absolute bottom-0 left-0 right-0 h-px -mb-px bg-background" />
              )}
            </button>
          );
        })}

        {/* Add Context Button */}
        <button
          type="button"
          onClick={handleAddContext}
          className="px-3 py-2 text-xs rounded-t-lg border border-b-0 border-dashed border-muted-foreground/50 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground -mb-px"
          title="Add context field"
        >
          +
        </button>
      </div>

      {/* Tab Content */}
      <div
        className={cn(
          'border rounded-b-lg p-3',
          currentPanelConfig.panelBorder,
          currentPanelConfig.panelBg
        )}
      >
        {selectedTab === 'system' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                System Prompt
              </span>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-96 p-2 rounded border bg-background font-mono text-sm resize-y"
              placeholder="Enter system prompt..."
            />
          </div>
        )}

        {typeof selectedTab === 'number' && contexts[selectedTab] && (
          <div>
            {/* Context Controls */}
            <div className="flex items-center gap-2 mb-2">
              {/* Name input */}
              <input
                type="text"
                value={contexts[selectedTab].name}
                onChange={(e) => updateContextName(selectedTab, e.target.value)}
                placeholder="Field name"
                className="w-28 p-1.5 rounded border bg-background text-sm font-mono"
              />

              {/* Load Fixture dropdown */}
              <select
                className="text-xs p-1.5 rounded border bg-card min-w-0"
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  // Find the fixture content
                  for (const group of FIXTURE_OPTIONS) {
                    const item = group.items.find((f) => f.key === value);
                    if (item) {
                      updateContextContent(selectedTab, item.content);
                      break;
                    }
                  }
                  e.target.value = '';
                }}
                value=""
              >
                <option value="" disabled>
                  Load Fixture...
                </option>
                {FIXTURE_OPTIONS.map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.items.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <div className="flex-1" />

              {/* Reorder buttons */}
              <button
                type="button"
                onClick={() => {
                  moveContext(selectedTab, selectedTab - 1);
                  setSelectedTab(selectedTab - 1);
                }}
                disabled={selectedTab === 0}
                className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-30"
                title="Move left"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  moveContext(selectedTab, selectedTab + 1);
                  setSelectedTab(selectedTab + 1);
                }}
                disabled={selectedTab === contexts.length - 1}
                className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-30"
                title="Move right"
              >
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleRemoveContext(selectedTab)}
                disabled={contexts.length === 1}
                className="p-1.5 rounded border border-destructive/50 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                title="Delete field"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content textarea */}
            <textarea
              value={contexts[selectedTab].content}
              onChange={(e) =>
                updateContextContent(selectedTab, e.target.value)
              }
              placeholder="Enter content..."
              className="w-full h-96 p-2 rounded border bg-background font-mono text-sm resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// CONVERSATION MODE INPUTS SUBCOMPONENT
// =============================================================================

interface ConversationModeInputsProps {
  messages: Array<{ id: string; message: ConversationMessage }>;
  selectedMessageId: string | null;
  setSelectedMessageId: (id: string) => void;
  addMessage: (role?: ConversationMessage['role']) => void;
  removeMessage: (id: string) => void;
  updateMessageRole: (id: string, role: ConversationMessage['role']) => void;
  updateMessageContent: (id: string, content: string) => void;
  moveMessage: (fromIndex: number, toIndex: number) => void;
  insertThinkTag: (id: string) => void;
}

const ConversationModeInputs: React.FC<ConversationModeInputsProps> = ({
  messages,
  selectedMessageId,
  setSelectedMessageId,
  addMessage,
  removeMessage,
  updateMessageRole,
  updateMessageContent,
  moveMessage,
  insertThinkTag,
}) => {
  // Get selected message and its config
  const selectedMsg = messages.find((m) => m.id === selectedMessageId);
  const currentPanelConfig = selectedMsg
    ? conversationRoleColors[selectedMsg.message.role]
    : conversationRoleColors.system;

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Messages</label>

      {/* Tab Row */}
      <div className="flex items-end gap-0.5">
        {/* Message Tabs */}
        {messages.map((msg, index) => {
          const isSelected = selectedMessageId === msg.id;
          const colorConfig = conversationRoleColors[msg.message.role];
          return (
            <button
              key={msg.id}
              type="button"
              onClick={() => setSelectedMessageId(msg.id)}
              className={cn(
                'relative flex items-center justify-center px-4 py-2',
                'border border-b-0 rounded-t-lg cursor-pointer',
                'text-xs font-medium transition-all duration-150',
                '-mb-px',
                isSelected
                  ? cn(
                      colorConfig.panelBg,
                      'text-foreground z-[2]',
                      'shadow-[0_-2px_4px_rgba(0,0,0,0.05)]',
                      colorConfig.panelBorder
                    )
                  : 'bg-muted-foreground/10 text-muted-foreground border-border hover:bg-muted-foreground/20 hover:text-foreground'
              )}
            >
              {index + 1}. {msg.message.role}
              {/* Border cover - creates seamless connection to panel */}
              {isSelected && (
                <span className="absolute bottom-0 left-0 right-0 h-px -mb-px bg-background" />
              )}
            </button>
          );
        })}

        {/* Add Message Buttons */}
        <div className="flex gap-0.5 ml-1">
          <button
            type="button"
            onClick={() => addMessage('system')}
            className="px-2 py-2 text-xs rounded-t-lg border border-b-0 border-dashed border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 -mb-px"
            title="Add system message"
          >
            +S
          </button>
          <button
            type="button"
            onClick={() => addMessage('user')}
            className="px-2 py-2 text-xs rounded-t-lg border border-b-0 border-dashed border-green-500/50 text-green-600 dark:text-green-400 hover:bg-green-500/10 -mb-px"
            title="Add user message"
          >
            +U
          </button>
          <button
            type="button"
            onClick={() => addMessage('assistant')}
            className="px-2 py-2 text-xs rounded-t-lg border border-b-0 border-dashed border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 -mb-px"
            title="Add assistant message"
          >
            +A
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div
        className={cn(
          'border rounded-b-lg p-3',
          currentPanelConfig.panelBorder,
          currentPanelConfig.panelBg
        )}
      >
        {!selectedMsg ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Select a message tab to edit
          </div>
        ) : (
          <div>
            {/* Message Controls */}
            <div className="flex items-center gap-2 mb-2">
              {/* Reorder buttons */}
              <button
                type="button"
                onClick={() => {
                  const index = messages.findIndex(
                    (m) => m.id === selectedMessageId
                  );
                  moveMessage(index, index - 1);
                }}
                disabled={
                  messages.findIndex((m) => m.id === selectedMessageId) === 0
                }
                className="px-2 py-1 text-xs rounded border bg-background hover:bg-muted disabled:opacity-30"
                title="Move left"
              >
                ← Move
              </button>
              <button
                type="button"
                onClick={() => {
                  const index = messages.findIndex(
                    (m) => m.id === selectedMessageId
                  );
                  moveMessage(index, index + 1);
                }}
                disabled={
                  messages.findIndex((m) => m.id === selectedMessageId) ===
                  messages.length - 1
                }
                className="px-2 py-1 text-xs rounded border bg-background hover:bg-muted disabled:opacity-30"
                title="Move right"
              >
                Move →
              </button>

              {/* Role selector */}
              <select
                value={selectedMsg.message.role}
                onChange={(e) =>
                  updateMessageRole(
                    selectedMsg.id,
                    e.target.value as ConversationMessage['role']
                  )
                }
                className="p-1.5 rounded border bg-background text-sm font-mono"
              >
                <option value="system">system</option>
                <option value="user">user</option>
                <option value="assistant">assistant</option>
              </select>

              {/* Think tag button for assistant messages */}
              {selectedMsg.message.role === 'assistant' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertThinkTag(selectedMsg.id)}
                  title="Insert <think> tag to skip thinking phase"
                  className="text-xs"
                >
                  Insert &lt;think&gt;
                </Button>
              )}

              <div className="flex-1" />

              {/* Delete button */}
              <button
                type="button"
                onClick={() => removeMessage(selectedMsg.id)}
                disabled={messages.length === 1}
                className="px-2 py-1 text-xs rounded border border-destructive/50 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                title="Delete message"
              >
                Delete
              </button>
            </div>

            {/* Content textarea */}
            <textarea
              value={selectedMsg.message.content}
              onChange={(e) =>
                updateMessageContent(selectedMsg.id, e.target.value)
              }
              placeholder={`${selectedMsg.message.role} message content...`}
              className="w-full h-96 p-2 rounded border bg-background font-mono text-sm resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
};
