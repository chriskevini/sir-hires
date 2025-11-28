import React from 'react';
import { Button } from './Button';
import './SynthesisFooter.css';

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
    <div className="synthesis-footer">
      <div className="synthesis-tone-group">
        <Button
          variant="ghost"
          className="btn-refresh-tone"
          onClick={onRefreshTone}
          disabled={disabled || isSynthesizing}
          title="Random tone"
          aria-label="Random tone"
        >
          <span className="refresh-icon">&#x21bb;</span>
        </Button>
        <label htmlFor="synthesisFooterTone" className="tone-label">
          Tone:
        </label>
        <input
          type="text"
          id="synthesisFooterTone"
          className="tone-input"
          value={tone}
          onChange={(e) => onToneChange(e.target.value)}
          disabled={disabled || isSynthesizing}
          placeholder="e.g., professional"
        />
      </div>
      {isSynthesizing ? (
        <Button
          variant="secondary"
          className="btn-cancel-synthesis"
          onClick={onCancel}
        >
          Cancel
        </Button>
      ) : (
        <Button
          variant="primary"
          className="btn-synthesize-footer"
          onClick={onSynthesize}
          disabled={disabled}
        >
          Synthesize
        </Button>
      )}
    </div>
  );
};
