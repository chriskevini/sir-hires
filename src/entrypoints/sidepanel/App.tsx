import React, { useEffect, useCallback, useState, useRef } from 'react';
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
  }, [storage, jobState]); // storage is stable (from useJobStorage), jobState setters are stable

  // Use extraction hook
  const extraction = useJobExtraction(storage, loadJobInFocus);

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
  }, [loadJobInFocus]);

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
   * Render the appropriate view
   */
  const renderJobView = () => {
    return (
      <ParsedJobProvider jobs={jobState.allJobs}>
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
      </ParsedJobProvider>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container">
        <div className="loading">Loading job details...</div>
      </div>
    );
  }

  // Extracting state (ephemeral - not yet saved to storage)
  if (extraction.extractingJob) {
    const chunkCount = extraction.extractingJob.chunks.length;
    const previewText =
      extraction.extractingJob.chunks.length > 0
        ? extraction.extractingJob.chunks.join('').substring(0, 200) + '...'
        : 'Waiting for data...';

    return (
      <div className="container">
        <div className="job-card">
          <div className="detail-panel-content">
            <div className="job-header">
              <div>
                <div className="job-title">Extracting Job Data...</div>
                <div className="company">{extraction.extractingJob.url}</div>
              </div>
            </div>

            <div
              style={{
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚡</div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  marginBottom: '10px',
                }}
              >
                Streaming extraction in progress...
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Received {chunkCount} chunk{chunkCount !== 1 ? 's' : ''}
              </div>

              {previewText && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    maxHeight: '200px',
                    overflow: 'auto',
                  }}
                >
                  {previewText}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (extraction.error) {
    return (
      <div className="container">
        <div className="app-error">
          <p style={{ color: 'red' }}>{extraction.error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!currentJob) {
    return (
      <EmptyState
        extracting={extraction.extracting}
        onExtractJob={extraction.handleExtractJob}
        onRestoreBackup={backup.handleRestoreBackup}
      />
    );
  }

  // Main job view
  return (
    <div className="container">
      <div id="jobDetails" className="job-details">
        <div id="jobContent" className="job-content">
          {renderJobView()}
        </div>
      </div>

      <footer id="footer" className="footer">
        <button
          id="viewAllJobsBtn"
          className="btn btn-primary"
          onClick={handleOpenJobDetails}
        >
          Manage
        </button>
      </footer>
    </div>
  );
};
