/**
 * Shared hook for LLM settings management
 *
 * Provides:
 * - Loading/saving settings from llmSettingsStorage
 * - Fetching available models via background message
 * - Connection status state machine
 *
 * Used by:
 * - Popup (LLM settings configuration UI)
 * - SynthesisForm (document generation)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { browser } from 'wxt/browser';
import { llmSettingsStorage, LLMSettings } from '../utils/storage';
import {
  DEFAULT_ENDPOINT,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  normalizeEndpoint,
  getModelsEndpoint,
  getBaseUrl,
  detectProvider,
  ProviderType,
} from '../utils/llm-utils';

// ===== Types =====

export type ConnectionStatus = 'idle' | 'loading' | 'connected' | 'error';

export interface UseLLMSettingsOptions {
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
}

export interface UseLLMSettingsResult {
  // Connection state
  status: ConnectionStatus;
  errorMessage: string;
  isConnected: boolean;

  // Settings (editable in UI)
  serverUrl: string;
  setServerUrl: (url: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;
  maxTokens: number;
  setMaxTokens: (tokens: number) => void;
  temperature: number;
  setTemperature: (temp: number) => void;

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
  const { autoConnect = true, debounceMs = 500 } = options;

  // Connection state
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Settings state
  const [serverUrl, setServerUrl] = useState(DEFAULT_ENDPOINT);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Derived state
  const provider = detectProvider(serverUrl);
  const isConnected = status === 'connected';

  // Computed endpoints
  const endpoint = useMemo(
    () => normalizeEndpoint(serverUrl || DEFAULT_ENDPOINT),
    [serverUrl]
  );
  const modelsEndpoint = useMemo(() => getModelsEndpoint(endpoint), [endpoint]);

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
          setMaxTokens(settings.maxTokens || DEFAULT_MAX_TOKENS);
          setTemperature(settings.temperature || DEFAULT_TEMPERATURE);
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
    }
  }, [serverUrl, apiKey]);

  // Auto-fetch models when server URL or API key changes (debounced)
  useEffect(() => {
    if (!autoConnect || isLoading) return;

    const timer = setTimeout(() => {
      if (serverUrl.trim()) {
        fetchModels();
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [serverUrl, apiKey, fetchModels, autoConnect, isLoading, debounceMs]);

  // Save settings to storage
  const saveSettings = useCallback(async (): Promise<boolean> => {
    try {
      const currentEndpoint = normalizeEndpoint(serverUrl || DEFAULT_ENDPOINT);
      const settings: LLMSettings = {
        endpoint: currentEndpoint,
        modelsEndpoint: getModelsEndpoint(currentEndpoint),
        model: model.trim() || DEFAULT_MODEL,
        maxTokens: maxTokens || DEFAULT_MAX_TOKENS,
        temperature: temperature || DEFAULT_TEMPERATURE,
        ...(apiKey.trim() && { apiKey: apiKey.trim() }),
      };

      await llmSettingsStorage.setValue(settings);
      return true;
    } catch (error) {
      console.error('[useLLMSettings] Error saving settings:', error);
      return false;
    }
  }, [serverUrl, model, apiKey, maxTokens, temperature]);

  return {
    // Connection state
    status,
    errorMessage,
    isConnected,

    // Settings
    serverUrl,
    setServerUrl,
    apiKey,
    setApiKey,
    model,
    setModel,
    maxTokens,
    setMaxTokens,
    temperature,
    setTemperature,

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

// Note: Import constants/utils directly from '../utils/llm-utils'
// Note: Import LLMSettings type from '../utils/storage'
