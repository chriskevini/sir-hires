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
    <div className="px-4 py-3 bg-accent border-y border-accent-foreground/20">
      <div className="flex items-start gap-3">
        <div className="flex-1 text-sm text-accent-foreground">
          You can continue extracting jobs or create a profile to begin
          synthesizing documents.
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="shrink-0 h-auto p-1 text-accent-foreground/70 hover:text-accent-foreground hover:bg-accent-foreground/10"
        >
          <span className="sr-only">Dismiss</span>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
