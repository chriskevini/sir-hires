import React from 'react';
import { Checklist } from '../../entrypoints/job-details/components/checklist';
import { NavigationButtons } from '../ui/NavigationButtons';
import {
  getNavigationButtons,
  progressConfig,
} from '../../entrypoints/job-details/config';
import './JobViewOverlay.css';

/**
 * JobViewOverlay - Shared overlay for Checklist + NavigationButtons
 *
 * Provides consistent bottom-aligned UI elements across all job views.
 * Eliminates duplication between ResearchingView, DraftingView, and future views.
 *
 * @param props - Overlay configuration
 * @returns Overlay container with Checklist and NavigationButtons
 */
interface JobViewOverlayProps {
  job: {
    id: string;
    checklist?: Record<string, any>;
    applicationStatus: string;
  };
  jobIndex: number;
  isChecklistExpanded?: boolean;
  onSaveField: (index: number, fieldName: string, value: string) => void;
  onToggleChecklistExpand: (index: number, isExpanded: boolean) => void;
  onToggleChecklistItem: (index: number, itemId: string) => void;
}

export const JobViewOverlay: React.FC<JobViewOverlayProps> = ({
  job,
  jobIndex,
  isChecklistExpanded = false,
  onSaveField,
  onToggleChecklistExpand,
  onToggleChecklistItem,
}) => {
  // Navigation handler for status progression
  const handleNavigate = (
    targetStatus: string,
    _direction: 'backward' | 'forward'
  ) => {
    onSaveField(jobIndex, 'applicationStatus', targetStatus);
  };

  // Get navigation buttons for current status
  const currentStatus = job.applicationStatus || 'Researching';
  const navButtons = getNavigationButtons(currentStatus);

  return (
    <div className="overlay-container">
      <Checklist
        checklist={job.checklist || {}}
        status={job.applicationStatus || 'researching'}
        jobIndex={jobIndex}
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
        progressConfig={progressConfig}
      />
    </div>
  );
};
