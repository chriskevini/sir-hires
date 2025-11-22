import { useCallback } from 'react';
import { statusOrder, defaults } from '../config';
import type { Job } from './useJobState';

export interface NavigationHookParams {
  allJobs: Job[];
  setAllJobs: (_jobs: Job[]) => void;
  isAnimating: boolean;
  setAnimating: (_value: boolean) => void;
  setPendingReload: (_value: boolean) => void;
  hasPendingReload: boolean;
  updateJobInStorage: (_jobId: string, _jobData: Job) => Promise<void>;
}

/**
 * React hook for handling navigation between job status states
 * Simplified version that works with React state management
 */
export function useNavigation(params: NavigationHookParams) {
  const {
    allJobs,
    setAllJobs,
    isAnimating,
    hasPendingReload,
    updateJobInStorage,
  } = params;

  /**
   * Get the order index of a status
   */
  const getStatusOrder = useCallback((status: string): number => {
    const index = statusOrder.indexOf(status);
    return index === -1 ? 0 : index;
  }, []);

  /**
   * Check if navigation is moving backward
   */
  const isBackward = useCallback(
    (fromStatus: string, toStatus: string): boolean => {
      return getStatusOrder(toStatus) < getStatusOrder(fromStatus);
    },
    [getStatusOrder]
  );

  /**
   * Get the next status in the progression
   */
  const getNextStatus = useCallback(
    (currentStatus: string): string | null => {
      const currentIndex = getStatusOrder(currentStatus);
      if (currentIndex < statusOrder.length - 1) {
        return statusOrder[currentIndex + 1];
      }
      return null;
    },
    [getStatusOrder]
  );

  /**
   * Get the previous status in the progression
   */
  const getPreviousStatus = useCallback(
    (currentStatus: string): string | null => {
      const currentIndex = getStatusOrder(currentStatus);
      if (currentIndex > 0) {
        return statusOrder[currentIndex - 1];
      }
      return null;
    },
    [getStatusOrder]
  );

  /**
   * Update job status and status history
   */
  const updateJobStatus = useCallback((job: Job, newStatus: string): Job => {
    const oldStatus = job.applicationStatus || defaults.status;

    // Initialize status history if it doesn't exist
    if (!job.statusHistory) {
      job.statusHistory = [
        {
          status: oldStatus,
          date: job.updatedAt || new Date().toISOString(),
        },
      ];
    }

    // Add new status to history
    job.statusHistory.push({
      status: newStatus,
      date: new Date().toISOString(),
    });

    // Return updated job
    return {
      ...job,
      applicationStatus: newStatus,
      updatedAt: new Date().toISOString(),
    };
  }, []);

  /**
   * Navigate to a new state (status)
   * This is a simplified version - animation logic will be handled by React components
   */
  const navigateToState = useCallback(
    async (
      jobIndex: number,
      newStatus: string,
      direction: 'forward' | 'backward'
    ): Promise<boolean> => {
      const job = allJobs[jobIndex];

      if (!job) {
        console.error('Job not found at index:', jobIndex);
        return false;
      }

      const oldStatus = job.applicationStatus || defaults.status;

      console.info(
        `Navigating from ${oldStatus} to ${newStatus} (${direction})`
      );

      // Update job status and history (in memory)
      const updatedJob = updateJobStatus(job, newStatus);

      // Update state immediately
      const newJobs = [...allJobs];
      newJobs[jobIndex] = updatedJob;
      setAllJobs(newJobs);

      // Save to storage
      await updateJobInStorage(updatedJob.id, updatedJob);
      console.info(`Job status saved to storage: ${newStatus}`);

      return hasPendingReload;
    },
    [allJobs, setAllJobs, updateJobStatus, updateJobInStorage, hasPendingReload]
  );

  /**
   * Handle navigation button click
   */
  const handleNavigationClick = useCallback(
    async (
      jobIndex: number,
      targetStatus: string,
      direction: 'forward' | 'backward'
    ): Promise<void> => {
      // Don't navigate if animation is active
      if (isAnimating) {
        console.warn('Animation in progress, ignoring navigation click');
        return;
      }

      await navigateToState(jobIndex, targetStatus, direction);
    },
    [isAnimating, navigateToState]
  );

  return {
    // Status order methods
    getStatusOrder,
    isBackward,
    getNextStatus,
    getPreviousStatus,

    // Navigation methods
    updateJobStatus,
    navigateToState,
    handleNavigationClick,
  };
}
