import { useState } from 'react';
import { useLLMSettings } from '@/hooks/useLLMSettings';
import { DEFAULT_ENDPOINT } from '@/utils/llm-utils';
import { Button } from '@/components/ui/Button';
import './styles.css';

export function App() {
  // Use shared LLM settings hook (no task = UI management mode)
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
    taskSettings,
    setTaskSettings,
    resetTaskSettings,
    fetchModels,
    saveSettings,
  } = useLLMSettings();

  // Local UI state
  const [saveMessage, setSaveMessage] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const handleResetDefaults = () => {
    resetTaskSettings();
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
            <Button
              variant="ghost"
              onClick={handleRefresh}
              disabled={status === 'loading'}
              title="Refresh connection"
            >
              {status === 'loading' ? '...' : '↻'}
            </Button>
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

            {/* Advanced Settings Toggle */}
            <Button
              variant="secondary"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ marginTop: '4px' }}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </Button>

            {/* Per-Task Settings (collapsible) */}
            {showAdvanced && (
              <div className="task-settings-section">
                {/* Synthesis Settings */}
                <div className="task-settings-group">
                  <h4>Synthesis (Resume/Cover Letter)</h4>
                  <p className="task-description">
                    Higher creativity for document generation
                  </p>
                  <div className="task-settings-row">
                    <div className="form-row">
                      <label htmlFor="synthesis-tokens">Max Tokens</label>
                      <input
                        type="number"
                        id="synthesis-tokens"
                        value={taskSettings.synthesis.maxTokens}
                        onChange={(e) =>
                          setTaskSettings('synthesis', {
                            maxTokens: parseInt(e.target.value) || 4000,
                          })
                        }
                        min={100}
                        max={32000}
                        step={100}
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor="synthesis-temp">Temperature</label>
                      <input
                        type="number"
                        id="synthesis-temp"
                        value={taskSettings.synthesis.temperature}
                        onChange={(e) =>
                          setTaskSettings('synthesis', {
                            temperature: parseFloat(e.target.value) || 0.7,
                          })
                        }
                        min={0}
                        max={2}
                        step={0.1}
                      />
                    </div>
                  </div>
                </div>

                {/* Extraction Settings */}
                <div className="task-settings-group">
                  <h4>Extraction (Job Parsing)</h4>
                  <p className="task-description">
                    Low creativity for consistent parsing
                  </p>
                  <div className="task-settings-row">
                    <div className="form-row">
                      <label htmlFor="extraction-tokens">Max Tokens</label>
                      <input
                        type="number"
                        id="extraction-tokens"
                        value={taskSettings.extraction.maxTokens}
                        onChange={(e) =>
                          setTaskSettings('extraction', {
                            maxTokens: parseInt(e.target.value) || 2000,
                          })
                        }
                        min={100}
                        max={32000}
                        step={100}
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor="extraction-temp">Temperature</label>
                      <input
                        type="number"
                        id="extraction-temp"
                        value={taskSettings.extraction.temperature}
                        onChange={(e) =>
                          setTaskSettings('extraction', {
                            temperature: parseFloat(e.target.value) || 0,
                          })
                        }
                        min={0}
                        max={2}
                        step={0.1}
                      />
                    </div>
                  </div>
                </div>

                {/* Reset to Defaults */}
                <Button variant="link" onClick={handleResetDefaults}>
                  Reset to defaults
                </Button>
              </div>
            )}

            {/* Save Button */}
            <Button variant="primary" onClick={handleSave}>
              {saveMessage || 'Save'}
            </Button>
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
