/**
 * Shared hook for LLM settings management
 *
 * Provides:
 * - Loading/saving settings from llmSettingsStorage
 * - Per-task settings (maxTokens, temperature) for synthesis vs extraction
 * - Fetching available models via background message
 * - Connection status state machine
 *
 * Used by:
 * - Popup (LLM settings configuration UI) - no task specified, manages all settings
 * - SynthesisForm (document generation) - task: 'synthesis'
 * - Background extraction - task: 'extraction'
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { browser } from 'wxt/browser';
import {
  llmSettingsStorage,
  LLMSettings,
  TaskSettings,
} from '../utils/storage';
import {
  DEFAULT_ENDPOINT,
  DEFAULT_MODEL,
  DEFAULT_TASK_SETTINGS,
  normalizeEndpoint,
  getModelsEndpoint,
  getBaseUrl,
  detectProvider,
  ProviderType,
  LLMTask,
} from '../utils/llm-utils';

// ===== Types =====

export type ConnectionStatus = 'idle' | 'loading' | 'connected' | 'error';

export interface UseLLMSettingsOptions {
  /**
   * Task type to get settings for (synthesis or extraction)
   * If not specified, returns settings management UI mode (all tasks editable)
   */
  task?: LLMTask;
  /**
   * Whether to auto-fetch models on mount and when settings change
   * @default true
   */
  autoConnect?: boolean;
  /**
   * Debounce delay for auto-connect (ms)
   * @default 500
   */
  debounceMs?: number;
  /**
   * Interval for health checks when connected (ms)
   * Set to 0 to disable periodic health checks
   * @default 30000 (30 seconds)
   */
  healthCheckIntervalMs?: number;
  /**
   * Interval for retry attempts when disconnected/error (ms)
   * Set to 0 to disable auto-retry
   * @default 10000 (10 seconds)
   */
  retryIntervalMs?: number;
}

export interface UseLLMSettingsResult {
  // Connection state
  status: ConnectionStatus;
  errorMessage: string;
  isConnected: boolean;
  /** True after the first connection attempt has completed (success or failure) */
  hasInitialized: boolean;

  // Shared settings (same for all tasks)
  serverUrl: string;
  setServerUrl: (url: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;

  // Task-specific settings (when task is specified)
  // These return the values for the specified task, or synthesis defaults if no task
  maxTokens: number;
  setMaxTokens: (tokens: number) => void;
  temperature: number;
  setTemperature: (temp: number) => void;

  // All task settings (for UI mode - popup)
  taskSettings: Record<LLMTask, TaskSettings>;
  setTaskSettings: (task: LLMTask, settings: Partial<TaskSettings>) => void;
  resetTaskSettings: () => void;

  // Think Harder mode (enables extended reasoning)
  thinkHarder: boolean;
  setThinkHarder: (value: boolean) => void;

  // Derived
  provider: ProviderType;
  availableModels: string[];

  // Computed endpoints (normalized)
  endpoint: string;
  modelsEndpoint: string;

  // Actions
  fetchModels: () => Promise<void>;
  saveSettings: () => Promise<boolean>;

  // Settings loading state
  isLoading: boolean;
}

// ===== Hook Implementation =====

export function useLLMSettings(
  options: UseLLMSettingsOptions = {}
): UseLLMSettingsResult {
  const {
    task,
    autoConnect = true,
    debounceMs = 500,
    healthCheckIntervalMs = 30000,
    retryIntervalMs = 10000,
  } = options;

  // Connection state
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Shared settings state
  const [serverUrl, setServerUrl] = useState(DEFAULT_ENDPOINT);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Per-task settings state
  const [taskSettings, setTaskSettingsState] = useState<
    Record<LLMTask, TaskSettings>
  >({
    synthesis: { ...DEFAULT_TASK_SETTINGS.synthesis },
    extraction: { ...DEFAULT_TASK_SETTINGS.extraction },
  });

  // Think Harder mode state
  const [thinkHarder, setThinkHarder] = useState(false);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  // Track whether initial connection attempt has completed
  const [hasInitialized, setHasInitialized] = useState(false);

  // Derived state
  const provider = detectProvider(serverUrl);
  const isConnected = status === 'connected';

  // Computed endpoints
  const endpoint = useMemo(
    () => normalizeEndpoint(serverUrl || DEFAULT_ENDPOINT),
    [serverUrl]
  );
  const modelsEndpoint = useMemo(() => getModelsEndpoint(endpoint), [endpoint]);

  // Get current task settings (defaults to synthesis if no task specified)
  const currentTaskSettings = task
    ? taskSettings[task]
    : taskSettings.synthesis;

  // Convenience accessors for maxTokens/temperature
  const maxTokens = currentTaskSettings.maxTokens;
  const temperature = currentTaskSettings.temperature;

  // Setters for current task's maxTokens/temperature
  const setMaxTokens = useCallback(
    (tokens: number) => {
      const targetTask = task || 'synthesis';
      setTaskSettingsState((prev) => ({
        ...prev,
        [targetTask]: { ...prev[targetTask], maxTokens: tokens },
      }));
    },
    [task]
  );

  const setTemperature = useCallback(
    (temp: number) => {
      const targetTask = task || 'synthesis';
      setTaskSettingsState((prev) => ({
        ...prev,
        [targetTask]: { ...prev[targetTask], temperature: temp },
      }));
    },
    [task]
  );

  // Generic setter for any task's settings (for popup UI)
  const setTaskSettings = useCallback(
    (targetTask: LLMTask, settings: Partial<TaskSettings>) => {
      setTaskSettingsState((prev) => ({
        ...prev,
        [targetTask]: { ...prev[targetTask], ...settings },
      }));
    },
    []
  );

  // Reset all task settings to defaults in a single state update
  const resetTaskSettings = useCallback(() => {
    setTaskSettingsState({
      synthesis: { ...DEFAULT_TASK_SETTINGS.synthesis },
      extraction: { ...DEFAULT_TASK_SETTINGS.extraction },
    });
  }, []);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await llmSettingsStorage.getValue();
        if (settings) {
          // Extract base URL from endpoint (remove /v1/chat/completions)
          const baseUrl = getBaseUrl(settings.endpoint);
          setServerUrl(baseUrl || DEFAULT_ENDPOINT);
          setModel(settings.model || DEFAULT_MODEL);
          setApiKey(settings.apiKey || '');

          // Load per-task settings (with fallback to defaults)
          if (settings.tasks) {
            setTaskSettingsState({
              synthesis: {
                maxTokens:
                  settings.tasks.synthesis?.maxTokens ??
                  DEFAULT_TASK_SETTINGS.synthesis.maxTokens,
                temperature:
                  settings.tasks.synthesis?.temperature ??
                  DEFAULT_TASK_SETTINGS.synthesis.temperature,
              },
              extraction: {
                maxTokens:
                  settings.tasks.extraction?.maxTokens ??
                  DEFAULT_TASK_SETTINGS.extraction.maxTokens,
                temperature:
                  settings.tasks.extraction?.temperature ??
                  DEFAULT_TASK_SETTINGS.extraction.temperature,
              },
            });
          }

          // Load thinkHarder setting (defaults to false)
          setThinkHarder(settings.thinkHarder ?? false);
        }
      } catch (error) {
        console.error('[useLLMSettings] Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Fetch models from LLM server via background message
  const fetchModels = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      const currentEndpoint = normalizeEndpoint(serverUrl || DEFAULT_ENDPOINT);
      const currentModelsEndpoint = getModelsEndpoint(currentEndpoint);

      const response = await browser.runtime.sendMessage({
        action: 'fetchModels',
        endpoint: currentModelsEndpoint,
        apiKey: apiKey || undefined,
      });

      if (response.success && response.models) {
        setAvailableModels(response.models);
        setStatus('connected');
      } else {
        setAvailableModels([]);
        setStatus('error');
        setErrorMessage(response.error || 'Failed to connect');
      }
    } catch (error) {
      console.error('[useLLMSettings] Error fetching models:', error);
      setAvailableModels([]);
      setStatus('error');
      setErrorMessage((error as Error).message);
    } finally {
      setHasInitialized(true);
    }
  }, [serverUrl, apiKey]);

  // Ref callback pattern: keeps ref updated to latest closure on every render
  // without causing the effect below to re-run (avoiding double-firing)
  const fetchModelsRef = useRef(fetchModels);
  fetchModelsRef.current = fetchModels;

  // Auto-fetch models when server URL or API key changes (debounced)
  // Note: We use fetchModelsRef to avoid double-firing when fetchModels changes
  // (fetchModels depends on serverUrl/apiKey which are already in this effect's deps)
  useEffect(() => {
    if (!autoConnect || isLoading) return;

    const timer = setTimeout(() => {
      if (serverUrl.trim()) {
        fetchModelsRef.current();
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [serverUrl, apiKey, autoConnect, isLoading, debounceMs]);

  // Save settings to storage
  const saveSettings = useCallback(async (): Promise<boolean> => {
    try {
      const currentEndpoint = normalizeEndpoint(serverUrl || DEFAULT_ENDPOINT);
      const settings: LLMSettings = {
        endpoint: currentEndpoint,
        modelsEndpoint: getModelsEndpoint(currentEndpoint),
        model: model.trim() || DEFAULT_MODEL,
        tasks: taskSettings,
        thinkHarder,
        ...(apiKey.trim() && { apiKey: apiKey.trim() }),
      };

      await llmSettingsStorage.setValue(settings);
      return true;
    } catch (error) {
      console.error('[useLLMSettings] Error saving settings:', error);
      return false;
    }
  }, [serverUrl, model, apiKey, taskSettings, thinkHarder]);

  // Ref to latest saveSettings to avoid stale closures in effect
  const saveSettingsRef = useRef(saveSettings);
  saveSettingsRef.current = saveSettings;

  // Auto-save when settings change (debounced)
  // Only saves when connected to avoid saving invalid endpoints
  useEffect(() => {
    if (isLoading || status !== 'connected') return;

    const timer = setTimeout(() => {
      saveSettingsRef.current();
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [
    serverUrl,
    model,
    apiKey,
    taskSettings,
    thinkHarder,
    isLoading,
    status,
    debounceMs,
  ]);

  // Periodic health check / retry effect
  // - When connected: check every healthCheckIntervalMs (30s default) to detect dropped connections
  // - When disconnected: retry every retryIntervalMs (10s default) to auto-reconnect
  useEffect(() => {
    // Don't run health checks during initial loading or if no server URL
    if (isLoading || !serverUrl.trim()) return;

    // Disable if both intervals are 0
    if (healthCheckIntervalMs === 0 && retryIntervalMs === 0) return;

    // Choose interval based on connection status
    const interval =
      status === 'connected' ? healthCheckIntervalMs : retryIntervalMs;

    // Don't set interval if the relevant one is disabled
    if (interval === 0) return;

    const intervalId = setInterval(() => {
      // Use ref to get latest fetchModels without re-running effect
      fetchModelsRef.current();
    }, interval);

    return () => clearInterval(intervalId);
  }, [isLoading, serverUrl, status, healthCheckIntervalMs, retryIntervalMs]);

  return {
    // Connection state
    status,
    errorMessage,
    isConnected,
    hasInitialized,

    // Shared settings
    serverUrl,
    setServerUrl,
    apiKey,
    setApiKey,
    model,
    setModel,

    // Task-specific settings (convenience accessors)
    maxTokens,
    setMaxTokens,
    temperature,
    setTemperature,

    // All task settings (for popup UI)
    taskSettings,
    setTaskSettings,
    resetTaskSettings,

    // Think Harder mode
    thinkHarder,
    setThinkHarder,

    // Derived
    provider,
    availableModels,

    // Computed endpoints
    endpoint,
    modelsEndpoint,

    // Actions
    fetchModels,
    saveSettings,

    // Loading state
    isLoading,
  };
}
