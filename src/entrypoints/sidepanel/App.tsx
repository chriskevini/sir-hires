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
import { useJobExtraction } from './hooks';

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
   * Restore backup (for empty state)
   */
  const handleRestoreBackup = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const backup = JSON.parse(text);

        // Validate backup structure (support both old nested and new flat format)
        const isOldFormat = backup.data !== undefined;
        const backupData = isOldFormat ? backup.data : backup;

        if (!backup.version) {
          alert('Invalid backup file format.');
          return;
        }

        // Confirm overwrite
        const jobCount = Object.keys(backupData.jobs || {}).length;
        const confirmMsg = `This will overwrite all your current data with the backup from ${new Date(backup.exportDate).toLocaleString()}.\n\nBackup contains ${jobCount} job(s).\n\nThis cannot be undone. Continue?`;

        // eslint-disable-next-line no-undef
        if (!confirm(confirmMsg)) {
          return;
        }

        // Normalize old format to new format if needed
        const normalizedData = {
          jobs: backupData.jobs || {},
          userProfile:
            backupData.userProfile || backupData.masterResume || null,
          llmSettings: backupData.llmSettings || null,
          jobInFocus: backupData.jobInFocus || null,
        };

        // Restore all data using storage helper
        await storage.restoreBackup(normalizedData);

        console.info('[Sidepanel] Backup restored successfully');
        alert('Backup restored successfully! Reloading...');

        // Reload
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error('[Sidepanel] Error restoring backup:', error);
        alert('Error restoring backup: ' + (error as Error).message);
      }
    };

    input.click();
  }, [storage]);

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
      <div className="container">
        <div id="emptyState" className="empty-state">
          <div className="welcome-content">
            <h2>👋 Welcome to Sir Hires!</h2>

            <div className="instructions">
              <p>
                <strong>To get started:</strong>
              </p>
              <ol>
                <li>
                  Pin this extension for quick access (click the puzzle piece
                  icon 🧩 in your toolbar, then pin Sir Hires)
                </li>
                <li>Navigate to a job posting (LinkedIn, Indeed, etc.)</li>
                <li>Click the extension icon</li>
                <li>Click "Extract Job Data" in the popup</li>
              </ol>
              <p className="instructions-note">
                The job will appear here for editing.
              </p>
            </div>

            <div className="tips">
              <p>
                <strong>💡 Tips:</strong>
              </p>
              <ul>
                <li>Open this panel anytime from Chrome's side panel menu</li>
                <li>All job fields are editable - just click to edit!</li>
              </ul>
            </div>

            <div className="supported-sites">
              <p>Works on LinkedIn, Indeed, Glassdoor, and more!</p>
            </div>

            <div
              style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}
            >
              <button
                id="extractJobBtn"
                className="btn btn-primary"
                onClick={extraction.handleExtractJob}
                disabled={extraction.extracting}
                title="Extract job data from the current tab"
              >
                {extraction.extracting ? 'Extracting...' : 'Extract Job Data'}
              </button>

              <button
                id="restoreBackupBtn"
                className="btn-restore-backup"
                onClick={handleRestoreBackup}
                title="Will import a JSON backup and overwrite all current data"
              >
                Restore Backup
              </button>
            </div>
          </div>
        </div>
      </div>
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
