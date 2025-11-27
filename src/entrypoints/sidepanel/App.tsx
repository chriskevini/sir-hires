import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { browser } from 'wxt/browser';
import { ResearchingView } from '../job-details/views/ResearchingView';
import { DraftingView } from '../job-details/views/DraftingView';
import { useJobStore } from '../job-details/hooks/useJobStore';
import { JobViewRouter } from '../../components/features/JobViewRouter';
import { ParsedJobProvider } from '../../components/features/ParsedJobProvider';
import type { Job } from '../job-details/hooks';
import { useJobExtraction, useBackupRestore } from './hooks';
import { EmptyState } from './components/EmptyState';
import { ExtractionLoadingView } from '../job-details/components/ExtractionLoadingView';
import { ErrorState } from './components/ErrorState';
import { DuplicateJobModal } from './components/DuplicateJobModal';
import { parseJobTemplate } from '../../utils/job-parser';
import { checklistTemplates, defaults } from '../job-details/config';
import { jobsStorage, restoreStorageFromBackup } from '../../utils/storage';
import type { ChecklistItem } from '../job-details/hooks/useJobState';

/**
 * Create default checklist for all statuses (adapter for useJobExtraction)
 */
function createDefaultChecklist(): Record<string, ChecklistItem[]> {
  const checklist: Record<string, ChecklistItem[]> = {};
  const timestamp = Date.now();

  Object.keys(checklistTemplates).forEach((status) => {
    const template =
      checklistTemplates[status as keyof typeof checklistTemplates];
    checklist[status] = template.map((item, index) => ({
      id: `item_${timestamp}_${status}_${index}_${Math.random().toString(36).substring(2, 11)}`,
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

  // Find selected index (global index in jobs array)
  const selectedIndex = useMemo(() => {
    if (!store.jobInFocusId) return -1;
    return store.jobs.findIndex((j) => j.id === store.jobInFocusId);
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
   * Handle saving a field on the current job
   */
  const handleSaveField = useCallback(
    async (
      _index: number,
      fieldName: string,
      value: unknown,
      immediate?: boolean
    ) => {
      if (!currentJob) return;

      if (immediate) {
        // For immediate saves (like status changes), use updateJobField
        await store.updateJobField(currentJob.id, fieldName, value);
      } else {
        // For debounced saves (like content changes), use updateJob
        store.updateJob(currentJob.id, { [fieldName]: value } as Partial<Job>);
      }
    },
    [currentJob, store]
  );

  /**
   * Handle saving a document
   */
  const handleSaveDocument = useCallback(
    async (
      _index: number,
      documentKey: string,
      data: { text?: string; title?: string }
    ) => {
      if (!currentJob) return;
      await store.saveDocument(currentJob.id, documentKey, data);
    },
    [currentJob, store]
  );

  /**
   * Handle initializing documents for a job
   */
  const handleInitializeDocuments = useCallback(
    (_index: number) => {
      if (!currentJob) return;
      store.initializeDocuments(currentJob.id);
    },
    [currentJob, store]
  );

  /**
   * Handle toggling checklist expansion
   */
  const handleChecklistToggleExpand = useCallback(async () => {
    await store.setChecklistExpanded(!store.checklistExpanded);
  }, [store]);

  /**
   * Handle toggling a checklist item
   * Adapter: converts index-based call to ID-based store method
   */
  const handleChecklistToggleItem = useCallback(
    async (_index: number, itemId: string) => {
      if (!currentJob) return;
      const status = currentJob.applicationStatus || defaults.status;
      await store.toggleChecklistItem(currentJob.id, status, itemId);
    },
    [currentJob, store]
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
        index={selectedIndex}
        isChecklistExpanded={store.checklistExpanded}
        ResearchingView={ResearchingView}
        DraftingView={DraftingView}
        onDeleteJob={handleDeleteJob}
        onSaveField={handleSaveField}
        onSaveDocument={handleSaveDocument}
        onInitializeDocuments={handleInitializeDocuments}
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
  const handleCancelExtraction = useCallback(async () => {
    if (!extraction.extractingJob) return;

    await browser.runtime.sendMessage({
      action: 'cancelExtraction',
      jobId: extraction.extractingJob.id,
    });
  }, [extraction.extractingJob]);

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
        index={0}
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
