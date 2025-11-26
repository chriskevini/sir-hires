import { useState } from 'react';
import { useLLMSettings } from '../../hooks/useLLMSettings';
import { DEFAULT_ENDPOINT } from '../../utils/llm-utils';
import './styles.css';

export function App() {
  // Use shared LLM settings hook
  const {
    status,
    errorMessage,
    isConnected,
    serverUrl,
    setServerUrl,
    apiKey,
    setApiKey,
    model,
    setModel,
    provider,
    availableModels,
    fetchModels,
    saveSettings,
  } = useLLMSettings();

  // Local UI state
  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = async () => {
    const success = await saveSettings();
    if (success) {
      setSaveMessage('Saved');
      setTimeout(() => setSaveMessage(''), 2000);
    } else {
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
                <label htmlFor="apiKey-connected">API Key</label>
                <input
                  type="password"
                  id="apiKey-connected"
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
                  <label htmlFor="apiKey-error">API Key</label>
                  <input
                    type="password"
                    id="apiKey-error"
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
