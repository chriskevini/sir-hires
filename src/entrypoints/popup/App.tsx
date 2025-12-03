import { useLLMSettings } from '@/hooks/useLLMSettings';
import { useTheme } from '@/hooks/useTheme';
import { LLMSettingsForm } from '@/components/features/LLMSettingsForm';

export function App() {
  // Initialize theme and watch for changes across tabs
  useTheme();

  // Use shared LLM settings hook (no task = UI management mode)
  const llmSettings = useLLMSettings();

  return (
    <div className="p-4" style={{ width: '380px', minHeight: '250px' }}>
      {/* Header */}
      <header className="flex justify-between items-center mb-4 pb-3 border-b-2 border-border">
        <h1 className="text-lg font-semibold text-primary">
          Sir Hires - LLM Settings
        </h1>
      </header>

      <LLMSettingsForm llmSettings={llmSettings} />
    </div>
  );
}
