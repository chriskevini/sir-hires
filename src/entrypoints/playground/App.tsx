/**
 * Prompt Playground
 * A testing/iteration tool for LLM prompts
 *
 * Features:
 * - Editable system prompt with preset loading
 * - Dynamic context fields (add/remove/reorder)
 * - Conversation mode for raw message array testing
 * - "Run Test" button with streaming output
 * - LLM output display with timing/token stats
 * - Import/export configuration
 */

import React from 'react';
import { useLLMSettings } from '@/hooks/useLLMSettings';
import { useTheme } from '@/hooks/useTheme';
import {
  FreeformTaskPanel,
  LLMSettingsPanel,
} from '@/components/features/playground';

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

export const App: React.FC = () => {
  // Initialize theme
  useTheme();

  // LLM settings (shared across all panels)
  const llmSettings = useLLMSettings({ autoConnect: true });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Prompt Playground</h1>
          <p className="text-muted-foreground">
            Test and iterate on LLM prompts for extraction and synthesis tasks.
          </p>
        </div>

        {/* LLM Settings */}
        <LLMSettingsPanel llmSettings={llmSettings} />

        {/* Freeform Task Panel */}
        <FreeformTaskPanel isVisible={true} llmSettings={llmSettings} />
      </div>
    </div>
  );
};
