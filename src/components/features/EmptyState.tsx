import React from 'react';
import { Button } from '@/components/ui/Button';
import { ArrowUpLeft } from 'lucide-react';

interface EmptyStateProps {
  onRestoreBackup: () => void;
}

/**
 * EmptyState Component
 * Displays when no jobs exist, with instructions and a restore backup option.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ onRestoreBackup }) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 relative">
      {/* Bouncing arrow pointing to Extract button */}
      <div className="absolute top-4 right-12 text-gray-500 animate-bounce-diagonal">
        <ArrowUpLeft className="h-8 w-8" />
      </div>

      <p className="text-sm text-gray-500 text-center leading-relaxed">
        Navigate to a job posting, then click{' '}
        <strong className="text-gray-700">Extract</strong>
      </p>

      {/* Footer with restore backup link */}
      <div className="absolute bottom-0 left-0 right-0 h-14 flex items-center justify-end px-4 bg-white border-t border-gray-200">
        <Button
          variant="link"
          onClick={onRestoreBackup}
          title="Import a JSON backup (will overwrite current data)"
        >
          Restore Backup
        </Button>
      </div>
    </div>
  );
};
