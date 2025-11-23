import React, {
  useEffect,
  useCallback,
  useState,
  useRef,
  useMemo,
} from 'react';
import { browser } from 'wxt/browser';
import { ResearchingView } from '../job-details/views/researching-view';
import { DraftingView } from '../job-details/views/drafting-view';
import {
  useJobState,
  useJobStorage,
  useJobHandlers,
} from '../job-details/hooks';
import { JobViewRouter } from '../../components/features/JobViewRouter';
import { ParsedJobProvider } from '../../components/features/ParsedJobProvider';
import type { Job } from '../job-details/hooks';
import { useJobExtraction, useBackupRestore } from './hooks';
import { EmptyState } from './components/EmptyState';
import { ExtractionLoadingView } from '../job-details/components/ExtractionLoadingView';
import { ErrorState } from './components/ErrorState';
import { DuplicateJobModal } from './components/DuplicateJobModal';
import { parseJobTemplate } from '../../utils/job-parser';

/**
 * Sidepanel App - Shows the "job in focus" for quick editing
 * Reuses all React components from job-details entrypoint
 */
export const App: React.FC = () => {
  const jobState = useJobState();
  const storage = useJobStorage();

  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoadRef = useRef(true);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);

  // Suppress reload flag for document auto-save (needed by useJobHandlers)
  const [suppressReloadUntil, setSuppressReloadUntil] = useState<number | null>(
    null
  );

  /**
   * Load the job in focus from storage
   */
  const loadJobInFocus = useCallback(async () => {
    console.info('[Sidepanel] Loading job in focus...');

    try {
      // Only show loading screen on initial load, not on subsequent reloads
      if (isInitialLoadRef.current) {
        setIsLoading(true);
      }

      // Load job in focus ID and all jobs
      const [jobInFocusId, allJobs, checklistExpanded] = await Promise.all([
        storage.getJobInFocus(),
        storage.getAllJobs(),
        storage.getChecklistExpanded(),
      ]);

      // Update state
      jobState.setAllJobs(allJobs);
      jobState.setChecklistExpanded(checklistExpanded);

      // Find the job in focus
      if (!jobInFocusId) {
        console.info('[Sidepanel] No job in focus');
        setCurrentJob(null);
        setIsLoading(false);
        return;
      }

      const job = allJobs.find((j) => j.id === jobInFocusId);
      if (!job) {
        console.warn('[Sidepanel] Job in focus not found:', jobInFocusId);
        // Clear stale jobInFocus from storage to prevent repeated lookups
        await storage.clearJobInFocus();
        setCurrentJob(null);
        setIsLoading(false);
        return;
      }

      console.info('[Sidepanel] Loaded job in focus:', job.id);
      setCurrentJob(job);

      // Find global index for event handlers
      const globalIndex = allJobs.findIndex((j) => j.id === jobInFocusId);
      jobState.setSelectedIndex(globalIndex);
    } catch (err) {
      console.error('[Sidepanel] Error loading job in focus:', err);
    } finally {
      setIsLoading(false);
      isInitialLoadRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage]); // jobState setters are stable but cause false re-renders if included

  // Use extraction hook
  const extraction = useJobExtraction(storage, loadJobInFocus, currentJob);

  // Use backup/restore hook
  const backup = useBackupRestore(storage);

  // Initialize shared job handlers
  const handlers = useJobHandlers(
    jobState,
    storage,
    loadJobInFocus,
    suppressReloadUntil,
    setSuppressReloadUntil
  );

  /**
   * Open job details in full page
   */
  const handleOpenJobDetails = useCallback(() => {
    browser.tabs.create({ url: 'job-details.html' });
    window.close();
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    console.info('[Sidepanel] Initializing...');
    loadJobInFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - storage changes handled by listener

  /**
   * Register storage change listener
   */
  useEffect(() => {
    storage.onStorageChange(handlers.handleStorageChange);

    return () => {
      storage.offStorageChange(handlers.handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers.handleStorageChange]);

  /**
   * Render the job view (without ParsedJobProvider wrapper)
   * Provider is now at the top level to avoid conditional hook rendering
   */
  const renderJobView = () => {
    return (
      <JobViewRouter
        job={currentJob}
        index={jobState.selectedJobIndex}
        isChecklistExpanded={jobState.checklistExpanded}
        ResearchingView={ResearchingView}
        DraftingView={DraftingView}
        onDeleteJob={handlers.handleDeleteJob}
        onSaveField={handlers.handleSaveField}
        onSaveDocument={handlers.handleSaveDocument}
        onInitializeDocuments={handlers.handleInitializeDocuments}
        onToggleChecklistExpand={handlers.handleChecklistToggleExpand}
        onToggleChecklistItem={handlers.handleChecklistToggleItem}
        emptyStateMessage="No job selected"
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
    <ParsedJobProvider jobs={jobState.allJobs}>
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
