/**
 * LLMSettingsForm Component
 *
 * Shared form for LLM settings used by popup and modals.
 * Displays server URL, model selector, and task settings.
 */

import { useState } from 'react';
import { DEFAULT_ENDPOINT } from '@/utils/llm-utils';
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
import type { useLLMSettings } from '@/hooks/useLLMSettings';

interface LLMSettingsFormProps {
  llmSettings: ReturnType<typeof useLLMSettings>;
}

export function LLMSettingsForm({ llmSettings }: LLMSettingsFormProps) {
  const {
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
    thinkHarder,
    setThinkHarder,
  } = llmSettings;

  // Local UI state for accordion
  const [taskSettingsOpen, setTaskSettingsOpen] = useState('');

  return (
    <div className="flex flex-col gap-5">
      {/* Server URL */}
      <div className="flex flex-col gap-2">
        <label htmlFor="serverUrl" className="text-base text-muted-foreground">
          Server URL
        </label>
        <Input
          type="text"
          id="serverUrl"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="http://localhost:1234"
          className="w-full font-mono text-base h-11"
        />
      </div>

      {/* Connected State - Show model selector */}
      {isConnected && (
        <>
          {/* API Key - Only show for cloud providers */}
          {provider === 'cloud' && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="apiKey-connected"
                className="text-base text-muted-foreground"
              >
                API Key
              </label>
              <Input
                type="password"
                id="apiKey-connected"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full text-base h-11"
              />
            </div>
          )}

          {/* Model Selector */}
          <div className="flex flex-col gap-2">
            <label htmlFor="model" className="text-base text-muted-foreground">
              Model
            </label>
            {availableModels.length > 0 ? (
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model" className="w-full h-11 text-base">
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
                className="w-full font-mono text-base h-11"
                placeholder="Enter model name"
              />
            )}
          </div>

          {/* Think Harder Toggle */}
          <div className="flex items-center gap-3 py-1">
            <Checkbox
              id="think-harder"
              checked={thinkHarder}
              onCheckedChange={(checked: boolean | 'indeterminate') =>
                setThinkHarder(checked === true)
              }
              className="h-5 w-5"
            />
            <label
              htmlFor="think-harder"
              className="text-base font-medium cursor-pointer"
            >
              Think Harder
            </label>
            <span className="text-sm text-muted-foreground">
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
              <AccordionTrigger
                className="justify-center py-2 text-sm text-primary hover:no-underline"
                hideChevron
              >
                {taskSettingsOpen ? 'Hide Task Settings' : 'See Task Settings'}
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
                    onClick={resetTaskSettings}
                    className="p-0 h-auto"
                  >
                    Reset to defaults
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}

      {/* Not connected - Show setup guide or API key prompt */}
      {!isConnected && (
        <>
          {provider === 'local' ? (
            <>
              <h3 className="text-base font-semibold text-foreground mb-4">
                Getting Started with LM Studio
              </h3>
              <ol className="list-decimal pl-5 mb-4 space-y-3">
                <li className="text-base text-foreground leading-relaxed">
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
                <li className="text-base text-foreground leading-relaxed">
                  Load a model (e.g., qwen/qwen3-4b-2507)
                </li>
                <li className="text-base text-foreground leading-relaxed">
                  Start the server: <strong>Developer → Start Server</strong>
                </li>
              </ol>
              <p className="text-base text-muted-foreground">
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
              <h3 className="text-base font-semibold text-foreground mb-4">
                API Key Required
              </h3>
              <div className="flex flex-col gap-2 mb-3">
                <label
                  htmlFor="apiKey-error"
                  className="text-base text-muted-foreground"
                >
                  API Key
                </label>
                <Input
                  type="password"
                  id="apiKey-error"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full text-base h-11"
                />
              </div>
              {errorMessage && (
                <p className="text-base text-destructive my-3">
                  {errorMessage}
                </p>
              )}
              <p className="text-base text-muted-foreground">
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
        </>
      )}
    </div>
  );
}
