import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { browser } from 'wxt/browser';
import { ResearchingView } from '../job-details/views/ResearchingView';
import { DraftingView } from '../job-details/views/DraftingView';
import { useJobStore } from '../job-details/hooks/useJobStore';
import { JobViewRouter } from '../../components/features/JobViewRouter';
import { ParsedJobProvider } from '../../components/features/ParsedJobProvider';
import type { Job, ChecklistItem } from '../job-details/hooks';
import { useJobExtraction, useBackupRestore } from './hooks';
import { EmptyState } from './components/EmptyState';
import { ExtractionLoadingView } from '../job-details/components/ExtractionLoadingView';
import { ErrorState } from './components/ErrorState';
import { DuplicateJobModal } from './components/DuplicateJobModal';
import { parseJobTemplate } from '../../utils/job-parser';
import { checklistTemplates, defaults } from '@/config';
import { jobsStorage, restoreStorageFromBackup } from '../../utils/storage';
import { generateItemId } from '../../utils/shared-utils';

/**
 * Create default checklist for all statuses (adapter for useJobExtraction)
 */
function createDefaultChecklist(): Record<string, ChecklistItem[]> {
  const checklist: Record<string, ChecklistItem[]> = {};

  Object.keys(checklistTemplates).forEach((status) => {
    const template =
      checklistTemplates[status as keyof typeof checklistTemplates];
    checklist[status] = template.map((item, index) => ({
      id: generateItemId(status, index),
      text: item.text,
      checked: false,
      order: item.order,
    }));
  });

  return checklist;
}

/**
 * Sidepanel App - Shows the "job in focus" for quick editing
 * Reuses all React components from job-details entrypoint
 *
 * Uses unified useJobStore for state management with adapter interfaces
 * for useJobExtraction and useBackupRestore hooks.
 */
export const App: React.FC = () => {
  // Use the unified job store
  const store = useJobStore();

  // Local UI state
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Derive current job from store
  const currentJob = useMemo(() => {
    if (!store.jobInFocusId) return null;
    return store.jobs.find((j) => j.id === store.jobInFocusId) || null;
  }, [store.jobInFocusId, store.jobs]);

  /**
   * Adapter: Storage interface for useJobExtraction
   * Bridges the store to the interface expected by useJobExtraction
   */
  const extractionStorageAdapter = useMemo(
    () => ({
      getAllJobs: async (): Promise<Job[]> => {
        // Read fresh from storage (extraction needs latest)
        const jobsObj = await jobsStorage.getValue();
        return Object.values(jobsObj);
      },
      saveAllJobs: async (jobs: Job[]): Promise<void> => {
        // Convert array to object and save
        const jobsObj: Record<string, Job> = {};
        jobs.forEach((job) => {
          if (job.id) {
            jobsObj[job.id] = job;
          }
        });
        await jobsStorage.setValue(jobsObj);
      },
      initializeAllChecklists: (): Job['checklist'] => {
        return createDefaultChecklist();
      },
    }),
    []
  );

  /**
   * Adapter: Storage interface for useBackupRestore
   */
  const backupStorageAdapter = useMemo(
    () => ({
      restoreBackup: async (data: {
        jobs: Record<string, unknown>;
        userProfile: unknown;
        llmSettings: unknown;
        jobInFocus: string | null;
      }): Promise<void> => {
        await restoreStorageFromBackup(data);
      },
    }),
    []
  );

  /**
   * Reload job in focus (for extraction completion callback)
   */
  const loadJobInFocus = useCallback(async () => {
    console.info('[Sidepanel] Reloading job in focus...');
    await store.reload();
  }, [store]);

  // Use extraction hook with adapter
  const extraction = useJobExtraction(
    extractionStorageAdapter,
    loadJobInFocus,
    currentJob
  );

  // Use backup/restore hook with adapter
  const backup = useBackupRestore(backupStorageAdapter);

  /**
   * Open job details in full page
   */
  const handleOpenJobDetails = useCallback(() => {
    browser.tabs.create({ url: 'job-details.html' });
    window.close();
  }, []);

  /**
   * Handle deleting the current job
   */
  const handleDeleteJob = useCallback(async () => {
    if (!currentJob) return;
    await store.deleteJob(currentJob.id);
  }, [currentJob, store]);

  /**
   * Handle saving a field on a job (ID-based)
   */
  const handleSaveField = useCallback(
    async (jobId: string, fieldName: string, value: string) => {
      // Use updateJobField for persistence
      await store.updateJobField(jobId, fieldName, value);
    },
    [store]
  );

  /**
   * Handle saving a document (ID-based)
   */
  const handleSaveDocument = useCallback(
    async (
      jobId: string,
      documentKey: string,
      data: { title: string; text: string }
    ) => {
      await store.saveDocument(jobId, documentKey, data);
    },
    [store]
  );

  /**
   * Handle deleting a document (ID-based)
   */
  const handleDeleteDocument = useCallback(
    async (jobId: string, documentKey: string) => {
      await store.deleteDocument(jobId, documentKey);
    },
    [store]
  );

  /**
   * Handle toggling checklist expansion
   */
  const handleChecklistToggleExpand = useCallback(async () => {
    await store.setChecklistExpanded(!store.checklistExpanded);
  }, [store]);

  /**
   * Handle toggling a checklist item (ID-based)
   */
  const handleChecklistToggleItem = useCallback(
    async (jobId: string, itemId: string) => {
      const job = store.jobs.find((j) => j.id === jobId);
      if (!job) return;
      const status = job.applicationStatus || defaults.status;
      await store.toggleChecklistItem(jobId, status, itemId);
    },
    [store]
  );

  /**
   * Mark initial load as complete when store finishes loading
   */
  useEffect(() => {
    if (!store.isLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [store.isLoading, isInitialLoad]);

  /**
   * Render the job view
   */
  const renderJobView = () => {
    return (
      <JobViewRouter
        job={currentJob}
        isChecklistExpanded={store.checklistExpanded}
        ResearchingView={ResearchingView}
        DraftingView={DraftingView}
        onDeleteJob={handleDeleteJob}
        onSaveField={handleSaveField}
        onSaveDocument={handleSaveDocument}
        onDeleteDocument={handleDeleteDocument}
        onToggleChecklistExpand={handleChecklistToggleExpand}
        onToggleChecklistItem={handleChecklistToggleItem}
        emptyStateMessage="No job selected"
        hideOverlay={true}
      />
    );
  };

  // Parse ephemeral extraction content (must be at top level for hooks)
  const ephemeralContent = extraction.extractingJob
    ? extraction.extractingJob.chunks.join('')
    : '';
  const parsedEphemeral = useMemo(
    () => parseJobTemplate(ephemeralContent),
    [ephemeralContent]
  );

  // Handler to cancel extraction
  const handleCancelExtraction = useCallback(() => {
    if (!extraction.extractingJob) return;
    extraction.cancelExtraction();
  }, [extraction]);

  // Determine loading state
  const isLoading = store.isLoading && isInitialLoad;

  // Render main content based on state
  let mainContent;

  // Loading state
  if (isLoading) {
    mainContent = (
      <div className="container">
        <div className="loading">Loading job details...</div>
      </div>
    );
  }
  // Extracting state (ephemeral - not yet saved to storage)
  else if (extraction.extractingJob) {
    mainContent = (
      <ExtractionLoadingView
        content={ephemeralContent}
        jobTitle={parsedEphemeral.topLevelFields['TITLE'] || 'Extracting...'}
        company={
          parsedEphemeral.topLevelFields['COMPANY'] ||
          extraction.extractingJob.source
        }
        jobId={extraction.extractingJob.id}
        onDelete={handleCancelExtraction}
      />
    );
  }
  // Error state
  else if (extraction.error) {
    mainContent = (
      <ErrorState
        error={extraction.error}
        onRetry={() => window.location.reload()}
      />
    );
  }
  // Empty state
  else if (!currentJob) {
    mainContent = (
      <EmptyState
        extracting={extraction.extracting}
        onExtractJob={extraction.handleExtractJob}
        onRestoreBackup={backup.handleRestoreBackup}
      />
    );
  }
  // Main job view
  else {
    mainContent = (
      <>
        {renderJobView()}
        <footer id="footer" className="footer">
          <button
            id="deleteJobBtn"
            className="btn btn-delete"
            onClick={handleDeleteJob}
            title="Delete this job"
          >
            Delete Job
          </button>
          <button
            id="extractJobBtn"
            className="btn btn-secondary"
            onClick={extraction.handleExtractJob}
            disabled={extraction.extracting}
            title="Extract job data from the current tab"
          >
            {extraction.extracting ? 'Extracting...' : 'Extract Job Data'}
          </button>
          <button
            id="viewAllJobsBtn"
            className="btn btn-primary"
            onClick={handleOpenJobDetails}
          >
            Manage
          </button>
        </footer>
      </>
    );
  }

  // Render main content + modal (modal should always be available)
  // Wrap entire app in ParsedJobProvider to avoid conditional hook rendering
  return (
    <ParsedJobProvider jobs={store.jobs}>
      <div className="container">
        {mainContent}

        {/* Duplicate Job Modal - Render outside main content so it works in all states */}
        {extraction.pendingExtraction && (
          <DuplicateJobModal
            isOpen={extraction.showDuplicateModal}
            jobUrl={extraction.pendingExtraction.url}
            onRefresh={extraction.handleRefreshJob}
            onExtractNew={extraction.handleExtractNew}
            onCancel={extraction.handleCancelDuplicate}
          />
        )}
      </div>
    </ParsedJobProvider>
  );
};
