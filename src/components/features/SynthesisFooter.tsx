import React from 'react';
import { Button } from '../ui/Button';

// 20 hardcoded tones for document synthesis
export const SYNTHESIS_TONES = [
  'professional',
  'funny',
  'enthusiastic',
  'casual',
  'confident',
  'friendly',
  'formal',
  'conversational',
  'bold',
  'humble',
  'energetic',
  'sincere',
  'witty',
  'warm',
  'assertive',
  'approachable',
  'persuasive',
  'authentic',
  'inspiring',
  'direct',
] as const;

export type SynthesisTone = (typeof SYNTHESIS_TONES)[number];

/**
 * Get a random tone from the predefined list
 */
export function getRandomTone(): string {
  const randomIndex = Math.floor(Math.random() * SYNTHESIS_TONES.length);
  return SYNTHESIS_TONES[randomIndex];
}

interface SynthesisFooterProps {
  tone: string;
  onToneChange: (tone: string) => void;
  onRefreshTone: () => void;
  onSynthesize: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  isSynthesizing?: boolean;
}

export const SynthesisFooter: React.FC<SynthesisFooterProps> = ({
  tone,
  onToneChange,
  onRefreshTone,
  onSynthesize,
  onCancel,
  disabled = false,
  isSynthesizing = false,
}) => {
  return (
    <div className="flex justify-between items-center px-4 py-2 bg-card border-t border-border gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="flex items-center justify-center w-8 h-8 p-0 bg-primary text-primary-foreground border-none rounded hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200"
          onClick={onRefreshTone}
          disabled={disabled || isSynthesizing}
          title="Random tone"
          aria-label="Random tone"
        >
          <span className="text-lg leading-none">&#x21bb;</span>
        </Button>
        <label
          htmlFor="synthesisFooterTone"
          className="text-sm font-medium text-muted-foreground"
        >
          Tone:
        </label>
        <input
          type="text"
          id="synthesisFooterTone"
          className="px-3 py-1.5 text-sm border border-input rounded min-w-[150px] transition-all duration-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
          value={tone}
          onChange={(e) => onToneChange(e.target.value)}
          disabled={disabled || isSynthesizing}
          placeholder="e.g., professional"
        />
      </div>
      {isSynthesizing ? (
        <Button
          variant="secondary"
          className="bg-destructive text-destructive-foreground px-5 py-2 border-none rounded cursor-pointer text-sm font-medium hover:bg-destructive/90 hover:shadow-md transition-all duration-200"
          onClick={onCancel}
        >
          Cancel
        </Button>
      ) : (
        <Button
          variant="primary"
          className="bg-primary text-primary-foreground px-5 py-2 border-none rounded cursor-pointer text-sm font-medium hover:bg-primary/90 hover:shadow-md disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200"
          onClick={onSynthesize}
          disabled={disabled}
        >
          Synthesize
        </Button>
      )}
    </div>
  );
};
