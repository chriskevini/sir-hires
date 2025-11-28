import React, { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

const QUICK_START_URL = 'https://github.com/chriskevini/sir-hires#quick-start';

/**
 * ErrorState Component
 * Displays a friendly error message when LLM connection fails,
 * with instructions for accessing LLM Settings and a link to the Quick Start Guide.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  // Log technical error for developers
  useEffect(() => {
    console.error('[ErrorState] LLM connection error:', error);
  }, [error]);

  return (
    <div className="error-state">
      <div className="error-state-content">
        <h2 className="error-state-headline">Couldn't connect to LLM</h2>

        <p className="error-state-instruction">
          Right-click the extension icon
          <br />
          and select "<strong>Open LLM Settings</strong>"
        </p>

        <p className="error-state-help">
          New to LM Studio?{' '}
          <a
            href={QUICK_START_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="error-state-link"
          >
            Quick Start Guide ↗
          </a>
        </p>
      </div>

      <div className="error-state-footer">
        <Button variant="primary" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    </div>
  );
};
