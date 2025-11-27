import React from 'react';
import { Checklist } from '@/entrypoints/job-details/components/checklist';
import type { ChecklistItem } from '@/entrypoints/job-details/hooks';

interface JobViewChecklistProps {
  checklist: Record<string, ChecklistItem[]> | undefined;
  applicationStatus: string;
  jobId: string;
  isExpanded?: boolean;
  onToggleExpand: (isExpanded: boolean) => void;
  onToggleItem: (jobId: string, itemId: string) => void;
}

/**
 * JobViewChecklist - Wrapper for Checklist component in job views
 * Standardizes checklist rendering across ResearchingView and DraftingView
 */
export const JobViewChecklist: React.FC<JobViewChecklistProps> = ({
  checklist,
  applicationStatus,
  jobId,
  isExpanded = false,
  onToggleExpand,
  onToggleItem,
}) => {
  // Return null if no checklist data
  if (!checklist) {
    return null;
  }

  return (
    <Checklist
      checklist={checklist}
      status={applicationStatus}
      jobId={jobId}
      isExpanded={isExpanded}
      animate={false}
      onToggleExpand={onToggleExpand}
      onToggleItem={onToggleItem}
    />
  );
};
