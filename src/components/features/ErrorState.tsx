import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

/**
 * ErrorState Component
 * Displays a friendly error message when extraction fails due to stale content script,
 * typically after extension reload while the page's content script is still running.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  // Log technical error for developers
  useEffect(() => {
    console.error('[ErrorState] Extraction error:', error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col relative">
      {/* Main content centered */}
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="mt-2">
            <p>Refresh the page and then try again.</p>
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
