/**
 * LLMSettingsPanel Component
 *
 * Displays LLM connection status and settings for the Prompt Playground.
 * Allows users to configure the server URL and select a model.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import type { useLLMSettings } from '@/hooks/useLLMSettings';

interface LLMSettingsPanelProps {
  llmSettings: ReturnType<typeof useLLMSettings>;
}

export const LLMSettingsPanel: React.FC<LLMSettingsPanelProps> = React.memo(
  ({ llmSettings }) => {
    return (
      <div className="mb-4 p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              llmSettings.isConnected ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <span className="text-sm font-medium">
            {llmSettings.status === 'loading'
              ? 'Connecting...'
              : llmSettings.isConnected
                ? 'Connected'
                : 'Not connected'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Endpoint */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Server URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={llmSettings.serverUrl}
                onChange={(e) => llmSettings.setServerUrl(e.target.value)}
                className="flex-1 p-2 rounded-lg border bg-background text-sm font-mono"
                placeholder="http://localhost:1234"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => llmSettings.fetchModels()}
                disabled={llmSettings.status === 'loading'}
              >
                {llmSettings.status === 'loading' ? '...' : 'Connect'}
              </Button>
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Model
            </label>
            {llmSettings.availableModels.length > 0 ? (
              <select
                value={llmSettings.model}
                onChange={(e) => llmSettings.setModel(e.target.value)}
                className="w-full p-2 rounded-lg border bg-background text-sm"
              >
                {llmSettings.availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={llmSettings.model}
                onChange={(e) => llmSettings.setModel(e.target.value)}
                className="w-full p-2 rounded-lg border bg-background text-sm font-mono"
                placeholder="Enter model name"
              />
            )}
          </div>
        </div>

        {/* Think Harder Toggle */}
        <div className="flex items-center gap-2 mt-3">
          <Checkbox
            id="think-harder"
            checked={llmSettings.thinkHarder}
            onCheckedChange={(checked: boolean | 'indeterminate') =>
              llmSettings.setThinkHarder(checked === true)
            }
          />
          <label
            htmlFor="think-harder"
            className="text-sm font-medium cursor-pointer"
          >
            Think Harder
          </label>
          <span className="text-sm text-muted-foreground">
            (Requires a thinking model)
          </span>
        </div>

        {llmSettings.errorMessage && (
          <p className="text-sm text-destructive mt-2">
            {llmSettings.errorMessage}
          </p>
        )}
      </div>
    );
  }
);

LLMSettingsPanel.displayName = 'LLMSettingsPanel';
