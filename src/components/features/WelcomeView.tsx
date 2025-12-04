/**
 * WelcomeView Component
 *
 * Full-page onboarding view for new users. Shows a 3-step guide:
 * 1. Connect LLM (required - shows inline form)
 * 2. Extract your first job (main CTA after connected)
 * 3. Create profile (optional - for synthesis features)
 *
 * Takes over the entire sidepanel/page - not a modal.
 */

import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LLMSettingsForm } from './LLMSettingsForm';
import type { useLLMSettings } from '@/hooks/useLLMSettings';

interface WelcomeViewProps {
  llmSettings: ReturnType<typeof useLLMSettings>;
  onGetStarted: () => void;
}

interface StepProps {
  number: number;
  title: string;
  description: string;
  isComplete: boolean;
  isActive: boolean;
  children?: React.ReactNode;
}

function Step({
  number,
  title,
  description,
  isComplete,
  isActive,
  children,
}: StepProps) {
  return (
    <div
      className={`flex gap-4 ${isActive ? '' : isComplete ? 'opacity-70' : 'opacity-50'}`}
    >
      {/* Step indicator */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
            isComplete
              ? 'bg-primary text-primary-foreground'
              : isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground border border-border'
          }`}
        >
          {isComplete ? <Check className="w-4 h-4" /> : number}
        </div>
        {/* Connector line */}
        {number < 3 && (
          <div
            className={`w-0.5 flex-1 min-h-4 mt-2 ${isComplete ? 'bg-primary' : 'bg-border'}`}
          />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 pb-6">
        <h3
          className={`text-base font-semibold mb-1 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        {children}
      </div>
    </div>
  );
}

export function WelcomeView({ llmSettings, onGetStarted }: WelcomeViewProps) {
  const isConnected = llmSettings.isConnected;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Welcome to Sir Hires
        </h1>
        <p className="text-muted-foreground">
          Your privacy-first job search assistant. Extract job postings, track
          applications, and generate tailored documents.
        </p>
      </div>

      {/* Steps */}
      <div className="flex-1 px-6">
        {/* Step 1: Connect LLM */}
        <Step
          number={1}
          title="Connect to an LLM"
          description="Sir Hires uses a local LLM to process job postings privately on your machine."
          isComplete={isConnected}
          isActive={!isConnected}
        >
          {!isConnected && (
            <div className="mt-2">
              <LLMSettingsForm llmSettings={llmSettings} />
            </div>
          )}
          {isConnected && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Check className="w-4 h-4" />
              <span>Connected to {llmSettings.model || 'LLM'}</span>
            </div>
          )}
        </Step>

        {/* Step 2: Extract a job */}
        <Step
          number={2}
          title="Extract your first job"
          description="Navigate to any job posting and click Extract to parse it automatically."
          isComplete={false}
          isActive={isConnected}
        >
          {isConnected && (
            <Button onClick={onGetStarted} className="mt-1">
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </Step>

        {/* Step 3: Create profile */}
        <Step
          number={3}
          title="Add your profile"
          description="Import your resume to unlock fit scoring and tailored document generation."
          isComplete={false}
          isActive={false}
        >
          <p className="text-xs text-muted-foreground italic">
            You can do this later from the Profile page
          </p>
        </Step>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          All data stays on your device. No cloud accounts required.
        </p>
      </div>
    </div>
  );
}
