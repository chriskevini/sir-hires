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
import {
  runTask,
  runTaskWithMessages,
  startKeepalive,
} from '@/utils/llm-task-runner';
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
import type {
  ContextField,
  ConversationMessage,
  PlaygroundMode,
  RunStats,
} from './types';

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

  // Output state
  const [output, setOutput] = useState('');
  const [thinking, setThinking] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopKeepaliveRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const loadPreset = useCallback((presetKey: string) => {
    const preset = PRESET_TASKS[presetKey];
    if (!preset) return;

    // Presets always load into context mode
    setMode('context');
    setSystemPrompt(preset.prompt);
    setContexts(preset.contexts.map((c) => ({ ...c }))); // Clone
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
          setError('Failed to parse config file');
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

      let result;

      if (mode === 'context') {
        // Context mode: use runTask with systemPrompt + context fields
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

        result = await runTask({
          config,
          context: contextRecord,
          llmClient,
          model,
          signal: abortControllerRef.current.signal,
          onChunk: (delta) => setOutput((prev) => prev + delta),
          onThinking: (delta) => setThinking((prev) => prev + delta),
        });
      } else {
        // Conversation mode: use runTaskWithMessages with raw messages
        const rawMessages = messages.map((m) => m.message);

        result = await runTaskWithMessages({
          messages: rawMessages,
          llmClient,
          model,
          maxTokens,
          temperature,
          signal: abortControllerRef.current.signal,
          onChunk: (delta) => setOutput((prev) => prev + delta),
          onThinking: (delta) => setThinking((prev) => prev + delta),
        });
      }

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
    mode,
    systemPrompt,
    contexts,
    messages,
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

        {/* Context Mode: System Prompt + Context Fields */}
        {mode === 'context' && (
          <>
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
                        onChange={(e) =>
                          updateContextName(index, e.target.value)
                        }
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
                      onChange={(e) =>
                        updateContextContent(index, e.target.value)
                      }
                      placeholder="Content..."
                      className="w-full h-64 p-2 rounded border bg-background font-mono text-sm resize-y"
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Conversation Mode: Tabbed Message Interface */}
        {mode === 'conversation' && (
          <div>
            {/* Tab Row */}
            <div className="flex items-end gap-0.5 mb-0 border-b border-border">
              {/* Message Tabs */}
              {messages.map((msg, index) => {
                const isSelected = selectedMessageId === msg.id;
                const roleColors = {
                  system:
                    'bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-300',
                  user: 'bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-300',
                  assistant:
                    'bg-purple-500/20 border-purple-500/50 text-purple-700 dark:text-purple-300',
                };
                return (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => setSelectedMessageId(msg.id)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-t-md border border-b-0 -mb-px',
                      'transition-all duration-150',
                      isSelected
                        ? cn(roleColors[msg.message.role], 'z-10')
                        : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {index + 1}. {msg.message.role}
                  </button>
                );
              })}

              {/* Add Message Buttons */}
              <div className="flex gap-0.5 ml-2 pb-1">
                <button
                  type="button"
                  onClick={() => addMessage('system')}
                  className="px-2 py-1 text-xs rounded border border-dashed border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                  title="Add system message"
                >
                  +S
                </button>
                <button
                  type="button"
                  onClick={() => addMessage('user')}
                  className="px-2 py-1 text-xs rounded border border-dashed border-green-500/50 text-green-600 dark:text-green-400 hover:bg-green-500/10"
                  title="Add user message"
                >
                  +U
                </button>
                <button
                  type="button"
                  onClick={() => addMessage('assistant')}
                  className="px-2 py-1 text-xs rounded border border-dashed border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                  title="Add assistant message"
                >
                  +A
                </button>
              </div>
            </div>

            {/* Selected Message Content */}
            {(() => {
              const selectedMsg = messages.find(
                (m) => m.id === selectedMessageId
              );
              if (!selectedMsg) {
                return (
                  <div className="p-4 text-center text-muted-foreground text-sm border border-t-0 rounded-b-lg bg-card">
                    Select a message tab to edit
                  </div>
                );
              }

              const index = messages.findIndex(
                (m) => m.id === selectedMessageId
              );
              const roleColors = {
                system: 'border-blue-500/30 bg-blue-500/5',
                user: 'border-green-500/30 bg-green-500/5',
                assistant: 'border-purple-500/30 bg-purple-500/5',
              };

              return (
                <div
                  className={cn(
                    'border border-t-0 rounded-b-lg p-3',
                    roleColors[selectedMsg.message.role]
                  )}
                >
                  {/* Message Controls */}
                  <div className="flex items-center gap-2 mb-2">
                    {/* Reorder buttons */}
                    <button
                      type="button"
                      onClick={() => moveMessage(index, index - 1)}
                      disabled={index === 0}
                      className="px-2 py-1 text-xs rounded border bg-background hover:bg-muted disabled:opacity-30"
                      title="Move left"
                    >
                      ← Move
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMessage(index, index + 1)}
                      disabled={index === messages.length - 1}
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
              );
            })()}
          </div>
        )}

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
      </div>
    </div>
  );
};

FreeformTaskPanel.displayName = 'FreeformTaskPanel';
