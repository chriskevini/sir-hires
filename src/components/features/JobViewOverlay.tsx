import React from 'react';
import { Checklist } from '../../entrypoints/job-details/components/checklist';
import { NavigationButtons } from '../ui/NavigationButtons';
import { getNavigationButtons, statusStyles } from '@/config';
import type { ChecklistItem } from '@/entrypoints/job-details/hooks';
import './JobViewOverlay.css';

/**
 * @deprecated This component is replaced by the JobViewRouter + JobFooter architecture.
 * Navigation and checklist are now handled by JobFooter with an integrated drawer.
 * Will be removed in a future release.
 *
 * JobViewOverlay - Shared overlay for Checklist and NavigationButtons
 *
 * Provides consistent bottom-aligned UI elements across all job views.
 * Eliminates duplication between ResearchingView, DraftingView, and future views.
 *
 * Layout (bottom to top):
 * - NavigationButtons: Left/right buttons for status progression
 * - Checklist: Expandable task checklist for current status
 *
 * Note: ProgressBar is rendered at the JobViewRouter level to persist across
 * view transitions and enable CSS animations when status changes.
 *
 * Note: Save is handled by useImmediateSave hook in each view which saves
 * immediately on every change, so no onBeforeNavigate callback is needed.
 *
 * @param props - Overlay configuration
 * @returns Overlay container with Checklist and NavigationButtons
 */

interface JobViewOverlayProps {
  job: {
    id: string;
    checklist?: Record<string, ChecklistItem[]>;
    applicationStatus: string;
  };
  isChecklistExpanded?: boolean;
  onSaveField: (jobId: string, fieldName: string, value: string) => void;
  onToggleChecklistExpand: (isExpanded: boolean) => void;
  onToggleChecklistItem: (jobId: string, itemId: string) => void;
  hidden?: boolean;
}

export const JobViewOverlay: React.FC<JobViewOverlayProps> = ({
  job,
  isChecklistExpanded = false,
  onSaveField,
  onToggleChecklistExpand,
  onToggleChecklistItem,
  hidden = false,
}) => {
  // Navigation handler for status progression
  const handleNavigate = (
    targetStatus: string,
    _direction: 'backward' | 'forward'
  ) => {
    onSaveField(job.id, 'applicationStatus', targetStatus);
  };

  // Get navigation buttons for current status
  const currentStatus = job.applicationStatus || 'Researching';
  const navButtons = getNavigationButtons(currentStatus);

  // Don't render if hidden (e.g., in sidepanel context)
  if (hidden) {
    return null;
  }

  return (
    <div className="overlay-container">
      <Checklist
        checklist={job.checklist || {}}
        status={job.applicationStatus || 'researching'}
        jobId={job.id}
        isExpanded={isChecklistExpanded}
        animate={false}
        onToggleExpand={onToggleChecklistExpand}
        onToggleItem={onToggleChecklistItem}
      />

      <NavigationButtons
        status={currentStatus}
        leftButton={navButtons.left}
        rightButtons={navButtons.right}
        onNavigate={handleNavigate}
      />
    </div>
  );
};
