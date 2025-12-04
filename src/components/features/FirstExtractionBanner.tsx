/**
 * FirstExtractionBanner Component
 *
 * A dismissible banner shown after the user's first successful extraction.
 * Guides users on next steps: continue extracting or create a profile.
 * Only shown once (persisted to storage on dismiss).
 */

import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface FirstExtractionBannerProps {
  onDismiss: () => void;
}

export function FirstExtractionBanner({
  onDismiss,
}: FirstExtractionBannerProps) {
  return (
    <div className="px-4 py-3 bg-muted/50 border-t border-border">
      <div className="flex items-start gap-3">
        <div className="flex-1 text-sm text-muted-foreground">
          You can continue extracting jobs or create a profile to begin
          synthesizing documents.
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="shrink-0 h-auto p-1 text-muted-foreground hover:text-foreground"
        >
          <span className="sr-only">Dismiss</span>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
