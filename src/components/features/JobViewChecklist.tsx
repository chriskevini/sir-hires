import React from 'react';
import { Checklist } from '@/entrypoints/job-details/components/checklist';
import { ChecklistItem } from '@/entrypoints/job-details/hooks/useJobState';

interface JobViewChecklistProps {
  checklist: Record<string, ChecklistItem[]> | undefined;
  applicationStatus: string;
  jobIndex: number;
  isExpanded?: boolean;
  onToggleExpand: (index: number, isExpanded: boolean) => void;
  onToggleItem: (index: number, itemId: string) => void;
}

/**
 * JobViewChecklist - Wrapper for Checklist component in job views
 * Standardizes checklist rendering across ResearchingView and DraftingView
 */
export const JobViewChecklist: React.FC<JobViewChecklistProps> = ({
  checklist,
  applicationStatus,
  jobIndex,
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
      jobIndex={jobIndex}
      isExpanded={isExpanded}
      animate={false}
      onToggleExpand={onToggleExpand}
      onToggleItem={onToggleItem}
    />
  );
};
