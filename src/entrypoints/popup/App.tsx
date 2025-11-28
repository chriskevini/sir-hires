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
    <div className="p-4">
      {/* Header */}
      <header className="flex justify-between items-center mb-4 pb-3 border-b-2 border-gray-200">
        <h1 className="text-lg font-semibold text-blue-600">
          Sir Hires - LLM Settings
        </h1>
      </header>

      <div className="flex flex-col gap-3">
        {/* Server URL */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="serverUrl"
            className="font-medium text-[13px] text-gray-600"
          >
            Server
          </label>
          <div className="flex gap-2 items-stretch">
            <input
              type="text"
              id="serverUrl"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:1234"
              className="flex-1 px-2 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
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
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="apiKey-connected"
                  className="font-medium text-[13px] text-gray-600"
                >
                  API Key
                </label>
                <input
                  type="password"
                  id="apiKey-connected"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-2 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                />
              </div>
            )}

            {/* Model Selector */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="model"
                className="font-medium text-[13px] text-gray-600"
              >
                Model
              </label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded text-[13px] bg-white cursor-pointer focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
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
              className="mt-1"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </Button>

            {/* Per-Task Settings (collapsible) */}
            {showAdvanced && (
              <div className="bg-gray-50 border border-gray-300 rounded p-3 mt-1">
                {/* Synthesis Settings */}
                <div className="mb-4">
                  <h4 className="text-[13px] font-semibold text-gray-700 mb-1">
                    Synthesis (Resume/Cover Letter)
                  </h4>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Higher creativity for document generation
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <label
                        htmlFor="synthesis-tokens"
                        className="font-medium text-[13px] text-gray-600"
                      >
                        Max Tokens
                      </label>
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
                        className="w-full px-2 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label
                        htmlFor="synthesis-temp"
                        className="font-medium text-[13px] text-gray-600"
                      >
                        Temperature
                      </label>
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
                        className="w-full px-2 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                      />
                    </div>
                  </div>
                </div>

                {/* Extraction Settings */}
                <div className="mb-2">
                  <h4 className="text-[13px] font-semibold text-gray-700 mb-1">
                    Extraction (Job Parsing)
                  </h4>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Low creativity for consistent parsing
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <label
                        htmlFor="extraction-tokens"
                        className="font-medium text-[13px] text-gray-600"
                      >
                        Max Tokens
                      </label>
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
                        className="w-full px-2 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label
                        htmlFor="extraction-temp"
                        className="font-medium text-[13px] text-gray-600"
                      >
                        Temperature
                      </label>
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
                        className="w-full px-2 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
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
          <div className="bg-gray-50 border border-gray-300 rounded p-4">
            {provider === 'local' ? (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Getting Started with LM Studio
                </h3>
                <ol className="list-decimal pl-5 mb-3 space-y-2">
                  <li className="text-[13px] text-gray-600 leading-relaxed">
                    Download from{' '}
                    <a
                      href="https://lmstudio.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      lmstudio.ai
                    </a>
                  </li>
                  <li className="text-[13px] text-gray-600 leading-relaxed">
                    Load a model (e.g., Qwen 2.5 7B)
                  </li>
                  <li className="text-[13px] text-gray-600 leading-relaxed">
                    Start the server: <strong>Developer → Start Server</strong>
                  </li>
                  <li className="text-[13px] text-gray-600 leading-relaxed">
                    Click refresh above
                  </li>
                </ol>
                <p className="text-xs text-gray-500 mt-3">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setServerUrl('https://api.openai.com');
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    Using OpenAI or another provider?
                  </a>
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  API Key Required
                </h3>
                <div className="flex flex-col gap-1 mb-2">
                  <label
                    htmlFor="apiKey-error"
                    className="font-medium text-[13px] text-gray-600"
                  >
                    API Key
                  </label>
                  <input
                    type="password"
                    id="apiKey-error"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-2 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                  />
                </div>
                <p className="text-xs text-red-600 my-2">{errorMessage}</p>
                <p className="text-xs text-gray-500 mt-3">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setServerUrl(DEFAULT_ENDPOINT);
                      setApiKey('');
                    }}
                    className="text-blue-600 hover:underline"
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
          <div className="text-center py-4 text-gray-500 text-[13px]">
            Connecting...
          </div>
        )}

        {/* Idle State - Initial load */}
        {status === 'idle' && (
          <div className="text-center py-4 text-gray-500 text-[13px]">
            Loading settings...
          </div>
        )}
      </div>
    </div>
  );
}
