import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn't connect to LLM</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p>
              Right-click the extension icon and select "
              <strong className="text-destructive">Open LLM Settings</strong>"
            </p>
            <p className="text-destructive/70">
              New to LM Studio?{' '}
              <a
                href={QUICK_START_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-destructive"
              >
                Quick Start Guide ↗
              </a>
            </p>
          </AlertDescription>
        </Alert>
      </div>

      {/* Footer with retry button */}
      <div className="absolute bottom-0 left-0 right-0 h-14 flex items-center justify-center px-4 bg-background border-t border-border">
        <Button variant="primary" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    </div>
  );
};
