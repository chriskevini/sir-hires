import { useState } from 'react';
import { useLLMSettings } from '@/hooks/useLLMSettings';
import { useTheme } from '@/hooks/useTheme';
import { DEFAULT_ENDPOINT } from '@/utils/llm-utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function App() {
  // Initialize theme and watch for changes across tabs
  useTheme();

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
    thinkHarder,
    setThinkHarder,
  } = useLLMSettings();

  // Local UI state
  const [saveMessage, setSaveMessage] = useState('');
  const [taskSettingsOpen, setTaskSettingsOpen] = useState('');

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

  const handleResetDefaults = () => {
    resetTaskSettings();
  };

  return (
    <div className="p-4" style={{ width: '380px', minHeight: '250px' }}>
      {/* Header */}
      <header className="flex justify-between items-center mb-4 pb-3 border-b-2 border-border">
        <h1 className="text-lg font-semibold text-primary">
          Sir Hires - LLM Settings
        </h1>
      </header>

      <div className="flex flex-col gap-3">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <span className="text-sm font-medium">
            {status === 'loading'
              ? 'Connecting...'
              : isConnected
                ? 'Connected'
                : 'Not connected'}
          </span>
        </div>

        {/* Server URL */}
        <div className="flex flex-col gap-1">
          <label htmlFor="serverUrl" className="text-xs text-muted-foreground">
            Server URL
          </label>
          <div className="flex gap-2 items-stretch">
            <Input
              type="text"
              id="serverUrl"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:1234"
              className="flex-1 font-mono text-sm"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchModels()}
              disabled={status === 'loading'}
              title="Connect to server"
            >
              {status === 'loading' ? '...' : 'Connect'}
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
                  className="text-xs text-muted-foreground"
                >
                  API Key
                </label>
                <Input
                  type="password"
                  id="apiKey-connected"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full"
                />
              </div>
            )}

            {/* Model Selector */}
            <div className="flex flex-col gap-1">
              <label htmlFor="model" className="text-xs text-muted-foreground">
                Model
              </label>
              {availableModels.length > 0 ? (
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="model" className="w-full h-9">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {!availableModels.includes(model) && model && (
                      <SelectItem value={model}>{model}</SelectItem>
                    )}
                    {availableModels.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full font-mono text-sm"
                  placeholder="Enter model name"
                />
              )}
            </div>

            {/* Think Harder Toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="think-harder"
                checked={thinkHarder}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setThinkHarder(checked === true)
                }
              />
              <label
                htmlFor="think-harder"
                className="text-sm font-medium cursor-pointer"
              >
                Think Harder
              </label>
              <span className="text-xs text-muted-foreground">
                (Requires a thinking model)
              </span>
            </div>

            {/* Task Settings Accordion */}
            <Accordion
              type="single"
              collapsible
              className="w-full"
              value={taskSettingsOpen}
              onValueChange={setTaskSettingsOpen}
            >
              <AccordionItem value="task-settings" className="border-none">
                <AccordionTrigger className="justify-center py-2 text-sm text-primary hover:no-underline">
                  {taskSettingsOpen
                    ? 'Hide Task Settings'
                    : 'See Task Settings'}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-4">
                    {/* Synthesis Settings */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">
                        Synthesis (Resume/Cover Letter)
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Higher creativity for document generation
                      </p>
                      <div className="flex gap-3">
                        <div className="flex-1 flex flex-col gap-1">
                          <label
                            htmlFor="synthesis-tokens"
                            className="text-xs text-muted-foreground"
                          >
                            Max Tokens
                          </label>
                          <Input
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
                            className="w-full"
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <label
                            htmlFor="synthesis-temp"
                            className="text-xs text-muted-foreground"
                          >
                            Temperature
                          </label>
                          <Input
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
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Extraction Settings */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">
                        Extraction (Job Parsing)
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Low creativity for consistent parsing
                      </p>
                      <div className="flex gap-3">
                        <div className="flex-1 flex flex-col gap-1">
                          <label
                            htmlFor="extraction-tokens"
                            className="text-xs text-muted-foreground"
                          >
                            Max Tokens
                          </label>
                          <Input
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
                            className="w-full"
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <label
                            htmlFor="extraction-temp"
                            className="text-xs text-muted-foreground"
                          >
                            Temperature
                          </label>
                          <Input
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
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Reset to Defaults */}
                    <Button
                      variant="link"
                      onClick={handleResetDefaults}
                      className="p-0 h-auto"
                    >
                      Reset to defaults
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Save Button */}
            <Button variant="primary" onClick={handleSave}>
              {saveMessage || 'Save'}
            </Button>
          </>
        )}

        {/* Error State - Show setup guide or API key prompt */}
        {status === 'error' && (
          <div className="bg-muted border border-border rounded p-4">
            {provider === 'local' ? (
              <>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Getting Started with LM Studio
                </h3>
                <ol className="list-decimal pl-5 mb-3 space-y-2">
                  <li className="text-sm text-foreground leading-relaxed">
                    Download from{' '}
                    <a
                      href="https://lmstudio.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      lmstudio.ai
                    </a>
                  </li>
                  <li className="text-sm text-foreground leading-relaxed">
                    Load a model (e.g., Qwen 2.5 7B)
                  </li>
                  <li className="text-sm text-foreground leading-relaxed">
                    Start the server: <strong>Developer → Start Server</strong>
                  </li>
                  <li className="text-sm text-foreground leading-relaxed">
                    Click Connect above
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground mt-3">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setServerUrl('https://api.openai.com');
                    }}
                    className="text-primary hover:underline"
                  >
                    Using OpenAI or another provider?
                  </a>
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  API Key Required
                </h3>
                <div className="flex flex-col gap-1 mb-2">
                  <label
                    htmlFor="apiKey-error"
                    className="text-xs text-muted-foreground"
                  >
                    API Key
                  </label>
                  <Input
                    type="password"
                    id="apiKey-error"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-destructive my-2">{errorMessage}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setServerUrl(DEFAULT_ENDPOINT);
                      setApiKey('');
                    }}
                    className="text-primary hover:underline"
                  >
                    Using LM Studio instead?
                  </a>
                </p>
              </>
            )}
          </div>
        )}

        {/* Idle State - Initial load */}
        {status === 'idle' && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Loading settings...
          </div>
        )}
      </div>
    </div>
  );
}
