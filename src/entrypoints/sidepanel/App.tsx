import React, { useEffect, useCallback, useState } from 'react';
import { ResearchingView } from '../job-details/views/researching-view';
import { DraftingView } from '../job-details/views/drafting-view';
import {
  useJobState,
  useJobStorage,
  useExtractionEvents,
} from '../job-details/hooks';
import { defaults } from '../job-details/config';
import type { Job } from '../job-details/hooks';
import type { ExtractionEvent } from '../job-details/hooks';

/**
 * Sidepanel App - Shows the "job in focus" for quick editing
 * Reuses all React components from job-details entrypoint
 */
export const App: React.FC = () => {
  const jobState = useJobState();
  const storage = useJobStorage();
  const extractionEvents = useExtractionEvents();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);

  /**
   * Load the job in focus from storage
   */
  const loadJobInFocus = useCallback(async () => {
    console.info('[Sidepanel] Loading job in focus...');

    try {
      setIsLoading(true);
      setError(null);

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
      setError('Failed to load job. Please refresh the panel.');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - uses latest jobState/storage via closure

  /**
   * Handle storage change events
   */
  const handleStorageChange = useCallback(
    (changes: Record<string, unknown>) => {
      console.info('[Sidepanel] Storage changed:', Object.keys(changes));

      // Reload if jobs or job in focus changed
      if (changes.jobs || changes.jobInFocus) {
        console.info('[Sidepanel] Reloading job in focus...');
        loadJobInFocus();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Empty deps - uses latest loadJobInFocus via closure
  );

  /**
   * Handle save field event
   */
  const handleSaveField = useCallback(
    async (_index: number, fieldName: string, value: string) => {
      if (!currentJob) {
        console.error('[Sidepanel] No current job to update');
        return;
      }

      const updatedJob = {
        ...currentJob,
        [fieldName]: value,
        updatedAt: new Date().toISOString(),
      };

      await storage.updateJob(currentJob.id, updatedJob);
      console.info(`[Sidepanel] Updated ${fieldName} for job ${currentJob.id}`);
    },
    [currentJob, storage]
  );

  /**
   * Handle delete job event
   */
  const handleDeleteJob = useCallback(async () => {
    if (!currentJob) {
      console.error('[Sidepanel] No current job to delete');
      return;
    }

    // eslint-disable-next-line no-undef
    if (!confirm('Are you sure you want to delete this job?')) {
      return;
    }

    await storage.deleteJob(currentJob.id);
    await loadJobInFocus();
    console.info(`[Sidepanel] Deleted job ${currentJob.id}`);
  }, [currentJob, storage, loadJobInFocus]);

  /**
   * Handle checklist toggle expand
   */
  const handleChecklistToggleExpand = useCallback(
    async (_index: number, isExpanded: boolean) => {
      jobState.setChecklistExpanded(isExpanded);
      await storage.setChecklistExpanded(isExpanded);
      console.info(`[Sidepanel] Toggled checklist expand to ${isExpanded}`);
    },
    [jobState, storage]
  );

  /**
   * Handle checklist toggle item
   */
  const handleChecklistToggleItem = useCallback(
    async (_index: number, itemId: string) => {
      if (!currentJob || !currentJob.checklist) {
        console.error('[Sidepanel] Job or checklist not found');
        return;
      }

      const currentStatusItems =
        currentJob.checklist[currentJob.applicationStatus || ''];
      if (!currentStatusItems) {
        console.error(
          '[Sidepanel] Checklist not found for status:',
          currentJob.applicationStatus
        );
        return;
      }

      const item = currentStatusItems.find(
        (i: { id: string; checked: boolean }) => i.id === itemId
      );
      if (item) {
        item.checked = !item.checked;

        const updatedJob = {
          ...currentJob,
          updatedAt: new Date().toISOString(),
        };

        await storage.updateJob(currentJob.id, updatedJob);
        console.info(`[Sidepanel] Toggled checklist item ${itemId}`);
      }
    },
    [currentJob, storage]
  );

  /**
   * Handle initialize documents (Drafting view)
   */
  const handleInitializeDocuments = useCallback(async () => {
    if (!currentJob) {
      console.error('[Sidepanel] No current job');
      return;
    }

    if (!currentJob.documents) {
      const initializedDocs = storage.initializeDocuments(currentJob);
      const updatedJob = {
        ...currentJob,
        documents: initializedDocs,
        updatedAt: new Date().toISOString(),
      };

      await storage.updateJob(currentJob.id, updatedJob);
      console.info(
        `[Sidepanel] Initialized documents for job ${currentJob.id}`
      );
    }
  }, [currentJob, storage]);

  /**
   * Handle save document
   */
  const handleSaveDocument = useCallback(
    async (
      _index: number,
      documentKey: string,
      documentData: { title: string; text: string }
    ) => {
      if (!currentJob) {
        console.error('[Sidepanel] No current job');
        return;
      }

      await storage.saveDocument(currentJob.id, documentKey, documentData);
      console.info(
        `[Sidepanel] Saved document ${documentKey} for job ${currentJob.id}`
      );
    },
    [currentJob, storage]
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

        // Validate backup structure
        if (!backup.version || !backup.data) {
          alert('Invalid backup file format.');
          return;
        }

        // Confirm overwrite
        const jobCount = Object.keys(backup.data.jobs || {}).length;
        const confirmMsg = `This will overwrite all your current data with the backup from ${new Date(backup.exportDate).toLocaleString()}.\n\nBackup contains ${jobCount} job(s).\n\nThis cannot be undone. Continue?`;

        // eslint-disable-next-line no-undef
        if (!confirm(confirmMsg)) {
          return;
        }

        // Restore all data
        await browser.storage.local.set({
          jobs: backup.data.jobs || {},
          userProfile:
            backup.data.userProfile || backup.data.masterResume || null,
          llmSettings: backup.data.llmSettings || null,
          jobInFocus: backup.data.jobInFocus || null,
        });

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
    storage.onStorageChange(handleStorageChange);

    return () => {
      storage.offStorageChange(handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleStorageChange]); // Only watch handleStorageChange - storage methods are stable

  /**
   * Register extraction event listener
   */
  useEffect(() => {
    const handleExtraction = (event: ExtractionEvent) => {
      console.info('[Sidepanel] Received extraction event:', event.action);

      switch (event.action) {
        case 'extractionStarted':
          console.info('[Sidepanel] Extraction started for job:', event.jobId);
          // The job will be created in storage by the background script
          // We'll reload when storage changes
          break;

        case 'extractionChunk':
          console.info(
            '[Sidepanel] Received extraction chunk for job:',
            event.jobId
          );
          // Chunks are handled by the storage sync mechanism
          break;

        case 'extractionComplete':
          console.info('[Sidepanel] Extraction complete for job:', event.jobId);
          // Reload to show the completed job
          loadJobInFocus();
          break;

        case 'extractionError':
          console.error(
            '[Sidepanel] Extraction error for job:',
            event.jobId,
            event.error
          );
          setError(`Extraction failed: ${event.error}`);
          break;

        case 'extractionCancelled':
          console.info(
            '[Sidepanel] Extraction cancelled for job:',
            event.jobId
          );
          break;

        default:
          break;
      }
    };

    extractionEvents.onExtractionEvent(handleExtraction);

    return () => {
      extractionEvents.offExtractionEvent(handleExtraction);
    };
  }, [extractionEvents, loadJobInFocus]);

  /**
   * Render the appropriate view
   */
  const renderJobView = () => {
    if (!currentJob) {
      return null;
    }

    const status = currentJob.applicationStatus || defaults.status;
    const index = jobState.selectedJobIndex;

    // Route to the appropriate view based on status
    switch (status) {
      case 'Researching':
        return (
          <ResearchingView
            job={currentJob}
            index={index}
            isChecklistExpanded={jobState.checklistExpanded}
            onDeleteJob={handleDeleteJob}
            onSaveField={handleSaveField}
            onToggleChecklistExpand={handleChecklistToggleExpand}
            onToggleChecklistItem={handleChecklistToggleItem}
          />
        );

      case 'Drafting':
        return (
          <DraftingView
            job={currentJob}
            index={index}
            isChecklistExpanded={jobState.checklistExpanded}
            onDeleteJob={handleDeleteJob}
            onSaveDocument={handleSaveDocument}
            onInitializeDocuments={handleInitializeDocuments}
            onToggleChecklistExpand={handleChecklistToggleExpand}
            onToggleChecklistItem={handleChecklistToggleItem}
          />
        );

      default:
        // WIP view for unimplemented states
        return (
          <div className="job-card">
            <div className="detail-panel-content">
              <div className="job-header">
                <div>
                  <div className="job-title">WIP: {status}</div>
                  <div className="company">View under construction</div>
                </div>
              </div>

              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#666',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚧</div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 500,
                    marginBottom: '10px',
                  }}
                >
                  {status} Panel - Work in Progress
                </div>
                <div style={{ fontSize: '14px' }}>
                  This panel is coming soon!
                </div>
              </div>

              <div className="job-actions">
                {currentJob.url && (
                  <button
                    className="btn btn-link"
                    onClick={() => window.open(currentJob.url, '_blank')}
                  >
                    View Job Posting
                  </button>
                )}
                <button
                  className="btn btn-delete"
                  onClick={() => handleDeleteJob()}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container">
        <div className="loading">Loading job details...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container">
        <div className="app-error">
          <p style={{ color: 'red' }}>{error}</p>
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
