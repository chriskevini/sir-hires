/**
 * LLMParametersPanel Component
 *
 * Reusable panel for configuring LLM parameters (temperature, max tokens).
 * Supports optional default values for reset functionality.
 */

import React from 'react';
import { Button } from '@/components/ui/Button';

// =============================================================================
// TYPES
// =============================================================================

export interface LLMParametersPanelProps {
  /** Current temperature value */
  temperature: number;
  /** Callback when temperature changes */
  onTemperatureChange: (value: number) => void;
  /** Current max tokens value */
  maxTokens: number;
  /** Callback when max tokens changes */
  onMaxTokensChange: (value: number) => void;
  /** Default temperature for reset (if not provided, reset button is hidden) */
  defaultTemperature?: number;
  /** Default max tokens for reset (if not provided, reset button is hidden) */
  defaultMaxTokens?: number;
  /** Optional class name for the wrapper */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const LLMParametersPanel: React.FC<LLMParametersPanelProps> = React.memo(
  ({
    temperature,
    onTemperatureChange,
    maxTokens,
    onMaxTokensChange,
    defaultTemperature,
    defaultMaxTokens,
    className,
  }) => {
    // Determine if reset button should be shown and enabled
    const hasDefaults =
      defaultTemperature !== undefined && defaultMaxTokens !== undefined;
    const isModified =
      hasDefaults &&
      (temperature !== defaultTemperature || maxTokens !== defaultMaxTokens);

    const handleReset = () => {
      if (defaultTemperature !== undefined) {
        onTemperatureChange(defaultTemperature);
      }
      if (defaultMaxTokens !== undefined) {
        onMaxTokensChange(defaultMaxTokens);
      }
    };

    return (
      <div className={className}>
        {/* Header with optional reset button */}
        {hasDefaults && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">LLM Parameters</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-sm px-2"
              onClick={handleReset}
              disabled={!isModified}
            >
              Reset to Defaults
            </Button>
          </div>
        )}

        {/* Parameter inputs */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm text-muted-foreground mb-1">
              Temperature
            </label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.05"
              value={temperature}
              onChange={(e) =>
                onTemperatureChange(parseFloat(e.target.value) || 0)
              }
              className="w-full p-2 rounded border bg-background text-sm font-mono"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-muted-foreground mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              min="100"
              max="128000"
              step="100"
              value={maxTokens}
              onChange={(e) =>
                onMaxTokensChange(parseInt(e.target.value, 10) || 100)
              }
              className="w-full p-2 rounded border bg-background text-sm font-mono"
            />
          </div>
        </div>
      </div>
    );
  }
);

LLMParametersPanel.displayName = 'LLMParametersPanel';
