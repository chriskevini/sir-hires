import React from 'react';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

/**
 * ErrorState Component
 * Displays extraction error message with retry button
 */
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="app-error">
      <p style={{ color: 'red' }}>{error}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  );
};
