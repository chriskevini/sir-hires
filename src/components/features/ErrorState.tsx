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
    <div className="flex flex-1 flex-col relative">
      {/* Main content centered */}
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Couldn't connect to LLM
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Right-click the extension icon
          <br />
          and select "
          <strong className="text-foreground">Open LLM Settings</strong>"
        </p>

        <p className="text-sm text-muted-foreground/70">
          New to LM Studio?{' '}
          <a
            href={QUICK_START_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Quick Start Guide ↗
          </a>
        </p>
      </div>

      {/* Footer with retry button */}
      <div className="absolute bottom-0 left-0 right-0 h-14 flex items-center justify-center px-4 bg-white border-t border-border">
        <Button variant="primary" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    </div>
  );
};
