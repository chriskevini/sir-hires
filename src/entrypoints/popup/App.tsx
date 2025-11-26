import { useState, useEffect, useCallback } from 'react';
import { browser } from 'wxt/browser';
import { llmSettingsStorage } from '../../utils/storage';
import './styles.css';

interface LLMSettings {
  endpoint: string;
  modelsEndpoint: string;
  model: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
}

type ProviderType = 'local' | 'cloud';
type ConnectionStatus = 'idle' | 'loading' | 'connected' | 'error';

const DEFAULT_ENDPOINT = 'http://localhost:1234';
const DEFAULT_MODEL = 'qwen/qwen3-4b-2507';

/**
 * Detects if the URL points to a local server or cloud provider
 */
function detectProvider(endpoint: string): ProviderType {
  try {
    // Handle URLs without protocol
    const urlString = endpoint.includes('://')
      ? endpoint
      : `http://${endpoint}`;
    const hostname = new URL(urlString).hostname.toLowerCase();

    // Local indicators
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      !hostname.includes('.') // e.g., "charlie:1234" or just "myserver"
    ) {
      return 'local';
    }

    return 'cloud';
  } catch {
    return 'local'; // Default to local if URL parsing fails
  }
}

/**
 * Normalizes an endpoint URL by ensuring it has a protocol prefix
 * and the correct path for chat completions.
 */
function normalizeEndpoint(endpoint: string): string {
  let normalized = endpoint.trim();

  // Add http:// if no protocol specified
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'http://' + normalized;
  }

  // Add /v1/chat/completions if not present
  if (!normalized.includes('/v1/chat/completions')) {
    normalized = normalized.replace(/\/+$/, '');
    normalized += '/v1/chat/completions';
  }

  return normalized;
}

/**
 * Derives the models endpoint from a chat completions endpoint.
 */
function getModelsEndpoint(chatEndpoint: string): string {
  return chatEndpoint.replace('/v1/chat/completions', '/v1/models');
}

export function App() {
  // Connection state
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Settings state
  const [serverUrl, setServerUrl] = useState(DEFAULT_ENDPOINT);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Derived state
  const provider = detectProvider(serverUrl);
  const isConnected = status === 'connected';

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await llmSettingsStorage.getValue();
      if (settings) {
        // Extract base URL from endpoint (remove /v1/chat/completions)
        const baseUrl = settings.endpoint
          .replace('/v1/chat/completions', '')
          .replace(/\/+$/, '');
        setServerUrl(baseUrl || DEFAULT_ENDPOINT);
        setModel(settings.model || DEFAULT_MODEL);
        setApiKey(settings.apiKey || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const fetchModels = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      const endpoint = normalizeEndpoint(serverUrl || DEFAULT_ENDPOINT);
      const modelsEndpoint = getModelsEndpoint(endpoint);

      const response = await browser.runtime.sendMessage({
        action: 'fetchModels',
        endpoint: modelsEndpoint,
        apiKey: apiKey || undefined,
      });

      if (response.success && response.models) {
        setAvailableModels(response.models);
        setStatus('connected');

        // If current model not in list and list has models, keep current or use first
        if (response.models.length > 0 && !response.models.includes(model)) {
          // Keep the current model value - user may have typed it manually
        }
      } else {
        setAvailableModels([]);
        setStatus('error');
        setErrorMessage(response.error || 'Failed to connect');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setAvailableModels([]);
      setStatus('error');
      setErrorMessage((error as Error).message);
    }
  }, [serverUrl, apiKey, model]);

  // Auto-fetch models when server URL or API key changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (serverUrl.trim()) {
        fetchModels();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [serverUrl, apiKey, fetchModels]);

  const handleSave = async () => {
    try {
      const endpoint = normalizeEndpoint(serverUrl || DEFAULT_ENDPOINT);
      const settings: LLMSettings = {
        endpoint,
        modelsEndpoint: getModelsEndpoint(endpoint),
        model: model.trim() || DEFAULT_MODEL,
        apiKey: apiKey.trim() || undefined,
        maxTokens: 2000,
        temperature: 0.3,
      };

      await llmSettingsStorage.setValue(settings);
      setSaveMessage('Saved');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleRefresh = () => {
    fetchModels();
  };

  return (
    <div className="container">
      <header>
        <h1>Sir Hires - LLM Settings</h1>
      </header>

      <div className="settings-form">
        {/* Server URL */}
        <div className="form-row">
          <label htmlFor="serverUrl">Server</label>
          <div className="input-with-button">
            <input
              type="text"
              id="serverUrl"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:1234"
            />
            <button
              type="button"
              className="btn-icon-only"
              onClick={handleRefresh}
              disabled={status === 'loading'}
              title="Refresh connection"
            >
              {status === 'loading' ? '...' : '↻'}
            </button>
          </div>
        </div>

        {/* Connected State - Show model selector */}
        {isConnected && (
          <>
            {/* API Key - Only show for cloud providers */}
            {provider === 'cloud' && (
              <div className="form-row">
                <label htmlFor="apiKey">API Key</label>
                <input
                  type="password"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
            )}

            {/* Model Selector */}
            <div className="form-row">
              <label htmlFor="model">Model</label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {availableModels.length === 0 ? (
                  <option value={model}>{model}</option>
                ) : (
                  <>
                    {!availableModels.includes(model) && model && (
                      <option value={model}>{model}</option>
                    )}
                    {availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Save Button */}
            <button className="btn btn-primary" onClick={handleSave}>
              {saveMessage || 'Save'}
            </button>
          </>
        )}

        {/* Error State - Show setup guide or API key prompt */}
        {status === 'error' && (
          <div className="setup-guide">
            {provider === 'local' ? (
              <>
                <h3>Getting Started with LM Studio</h3>
                <ol>
                  <li>
                    Download from{' '}
                    <a
                      href="https://lmstudio.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      lmstudio.ai
                    </a>
                  </li>
                  <li>Load a model (e.g., Qwen 2.5 7B)</li>
                  <li>
                    Start the server: <strong>Developer → Start Server</strong>
                  </li>
                  <li>Click refresh above</li>
                </ol>
                <p className="alt-provider">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setServerUrl('https://api.openai.com');
                    }}
                  >
                    Using OpenAI or another provider?
                  </a>
                </p>
              </>
            ) : (
              <>
                <h3>API Key Required</h3>
                <div className="form-row">
                  <label htmlFor="apiKey">API Key</label>
                  <input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                </div>
                <p className="error-hint">{errorMessage}</p>
                <p className="alt-provider">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setServerUrl(DEFAULT_ENDPOINT);
                      setApiKey('');
                    }}
                  >
                    Using LM Studio instead?
                  </a>
                </p>
              </>
            )}
          </div>
        )}

        {/* Loading State */}
        {status === 'loading' && (
          <div className="loading-state">Connecting...</div>
        )}

        {/* Idle State - Initial load */}
        {status === 'idle' && (
          <div className="loading-state">Loading settings...</div>
        )}
      </div>
    </div>
  );
}
