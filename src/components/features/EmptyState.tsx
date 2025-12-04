import React from 'react';
import { Info, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface EmptyStateProps {
  onRestoreBackup: () => void;
  onShowHelp?: () => void;
}

/**
 * EmptyState Component
 * Displays when no jobs exist, with instructions and a restore backup option.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  onRestoreBackup,
  onShowHelp,
}) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 relative">
      <Alert variant="info" className="max-w-xs">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Navigate to a job posting, then click{' '}
          <strong className="text-primary">Extract</strong>
        </AlertDescription>
      </Alert>

      {/* Footer with help and restore backup */}
      <div className="absolute bottom-0 left-0 right-0 h-14 flex items-center justify-between px-4 bg-background border-t border-border">
        {onShowHelp && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted active:bg-muted/80"
                onClick={onShowHelp}
                aria-label="Help"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Getting started</TooltipContent>
          </Tooltip>
        )}
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
