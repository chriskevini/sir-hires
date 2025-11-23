import React, { useEffect, useCallback, useState, useRef } from 'react';
import { browser } from 'wxt/browser';
import { ResearchingView } from '../job-details/views/researching-view';
import { DraftingView } from '../job-details/views/drafting-view';
import {
  useJobState,
  useJobStorage,
  useExtractionEvents,
  useJobHandlers,
} from '../job-details/hooks';
import { JobViewRouter } from '../../components/features/JobViewRouter';
import { ParsedJobProvider } from '../../components/features/ParsedJobProvider';
import {
  llmSettingsStorage,
  jobsStorage,
  jobInFocusStorage,
  extractionTriggerStorage,
  type LLMSettings,
} from '../../utils/storage';
import type { Job } from '../job-details/hooks';
import type {
  ExtractionEvent,
  ExtractionStartedMessage,
  ExtractionChunkMessage,
  ExtractionCompleteMessage,
} from '../job-details/hooks';

/**
 * Ephemeral extraction state (not persisted to storage)
 * Used to display live extraction progress in the UI
 */
interface ExtractingJob {
  id: string;
  url: string;
  source: string;
  chunks: string[];
  isExtracting: boolean;
}

/**
 * Sidepanel App - Shows the "job in focus" for quick editing
 * Reuses all React components from job-details entrypoint
 */
export const App: React.FC = () => {
  const jobState = useJobState();
  const storage = useJobStorage();
  const extractionEvents = useExtractionEvents();

  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoadRef = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);

  // Suppress reload flag for document auto-save (needed by useJobHandlers)
  const [suppressReloadUntil, setSuppressReloadUntil] = useState<number | null>(
    null
  );

  // Ephemeral extraction state (React state only, not storage)
  const [extractingJob, setExtractingJob] = useState<ExtractingJob | null>(
    null
  );

  // Extraction button state
  const [extracting, setExtracting] = useState(false);

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
      setError('Failed to load job. Please refresh the panel.');
    } finally {
      setIsLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [storage, jobState]); // storage is stable (from useJobStorage), jobState setters are stable

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
   * Handle extract job button click
   */
  const handleExtractJob = useCallback(async () => {
    setExtracting(true);
    setError(null);

    try {
      // Load LLM settings
      const llmSettings: LLMSettings =
        (await llmSettingsStorage.getValue()) || {
          endpoint: 'http://localhost:1234/v1/chat/completions',
          modelsEndpoint: 'http://localhost:1234/v1/models',
          model: '',
          maxTokens: 2000,
          temperature: 0.3,
        };

      if (!llmSettings.endpoint || llmSettings.endpoint.trim() === '') {
        setError(
          '⚠️ LLM endpoint not configured. Please configure settings in the popup first.'
        );
        setExtracting(false);
        return;
      }

      // Get current active tab
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.id) {
        setError('No active tab found');
        setExtracting(false);
        return;
      }

      if (
        tab.url?.startsWith('chrome://') ||
        tab.url?.startsWith('chrome-extension://')
      ) {
        setError(
          'Cannot extract data from Chrome internal pages. Please navigate to a job posting.'
        );
        setExtracting(false);
        return;
      }

      console.info('[Sidepanel] Starting extraction for tab:', tab.url);

      // Get job URL from content script
      const preCheckResponse = await browser.tabs
        .sendMessage(tab.id, {
          action: 'getJobUrl',
        })
        .catch(async (err) => {
          console.warn(
            '[Sidepanel] Content script not responding, injecting:',
            err
          );
          // Inject content script if not loaded
          await browser.scripting.executeScript({
            target: { tabId: tab.id! },
            files: ['content-scripts/content.js'],
          });
          await new Promise((resolve) => setTimeout(resolve, 100));
          return browser.tabs.sendMessage(tab.id!, { action: 'getJobUrl' });
        });

      // Determine job ID (check if job already exists)
      let jobId: string;
      if (preCheckResponse && preCheckResponse.url) {
        const jobs = (await jobsStorage.getValue()) || {};
        const normalizeUrl = (url: string) => {
          try {
            const urlObj = new URL(url);
            return urlObj.origin + urlObj.pathname.replace(/\/$/, '');
          } catch {
            return url;
          }
        };

        const existingJobId = Object.keys(jobs).find((id) => {
          const job = jobs[id];
          return (
            job.url &&
            normalizeUrl(job.url) === normalizeUrl(preCheckResponse.url)
          );
        });

        if (existingJobId) {
          console.info(
            '[Sidepanel] Re-extracting existing job:',
            existingJobId
          );
          jobId = existingJobId;
        } else {
          jobId =
            'job_' +
            Date.now() +
            '_' +
            Math.random().toString(36).substring(2, 9);
          console.info('[Sidepanel] Creating new job extraction:', jobId);
        }
      } else {
        jobId =
          'job_' +
          Date.now() +
          '_' +
          Math.random().toString(36).substring(2, 9);
        console.info('[Sidepanel] Creating new job extraction:', jobId);
      }

      // Note: We DON'T set jobInFocus here because the job doesn't exist yet
      // It will be set after extraction completes and the job is saved
      // This prevents race conditions where loadJobInFocus() clears a non-existent job

      // Request extraction from content script
      const response = await browser.tabs.sendMessage(tab.id, {
        action: 'streamExtractJobData',
        llmSettings: llmSettings,
        jobId: jobId,
      });

      if (response && response.success) {
        console.info('[Sidepanel] Extraction started successfully');

        // Send message to background to start streaming
        await browser.runtime.sendMessage({
          action: 'streamExtractJob',
          jobId: response.jobId,
          url: response.url,
          source: response.source,
          rawText: response.rawText,
          llmSettings: llmSettings,
        });
      } else {
        throw new Error('Failed to start streaming extraction');
      }
    } catch (error) {
      console.error('[Sidepanel] Error extracting job data:', error);
      setError(
        'Error: ' +
          (error as Error).message +
          '. Make sure LM Studio is running and configured correctly.'
      );
      setExtracting(false);
    }
    // Note: Don't reset extracting here - let extraction events handle it
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
   * Register extraction event listener
   */
  useEffect(() => {
    const handleExtraction = (event: ExtractionEvent) => {
      console.info('[Sidepanel] Received extraction event:', event.action);

      switch (event.action) {
        case 'extractionStarted': {
          const startEvent = event as ExtractionStartedMessage;
          console.info(
            '[Sidepanel] Extraction started for job:',
            startEvent.jobId
          );

          // Create ephemeral extraction state (React state only)
          setExtractingJob({
            id: startEvent.jobId,
            url: startEvent.url,
            source: startEvent.source,
            chunks: [],
            isExtracting: true,
          });

          // Clear any previous errors
          setError(null);
          break;
        }

        case 'extractionChunk': {
          const chunkEvent = event as ExtractionChunkMessage;
          console.info(
            '[Sidepanel] Received extraction chunk for job:',
            chunkEvent.jobId
          );

          // Append chunk to ephemeral state
          setExtractingJob((prev) => {
            if (!prev || prev.id !== chunkEvent.jobId) {
              console.warn(
                '[Sidepanel] Received chunk for unexpected job:',
                chunkEvent.jobId
              );
              return prev;
            }

            return {
              ...prev,
              chunks: [...prev.chunks, chunkEvent.chunk],
            };
          });
          break;
        }

        case 'extractionComplete': {
          const completeEvent = event as ExtractionCompleteMessage;
          console.info(
            '[Sidepanel] Extraction complete for job:',
            completeEvent.jobId
          );

          // Save to storage now that extraction is complete
          (async () => {
            try {
              if (!extractingJob || extractingJob.id !== completeEvent.jobId) {
                console.error(
                  '[Sidepanel] No extracting job found for completion:',
                  completeEvent.jobId
                );
                return;
              }

              // Create a complete job object
              const now = new Date().toISOString();
              const newJob: Job = {
                id: completeEvent.jobId,
                url: extractingJob.url,
                applicationStatus: 'Researching',
                content: completeEvent.fullContent,
                checklist: storage.initializeAllChecklists(),
                documents: undefined, // Will be initialized when switching to Drafting
                createdAt: now,
                updatedAt: now,
              };

              // Get current jobs and add the new one
              const currentJobs = await storage.getAllJobs();
              const updatedJobs = [...currentJobs, newJob];
              await storage.saveAllJobs(updatedJobs);

              console.info('[Sidepanel] Saved completed job to storage');

              // NOW set jobInFocus via background (Rule 3: Cross-component state)
              // Use message instead of direct storage for cross-tab consistency
              await browser.runtime.sendMessage({
                action: 'setJobInFocus',
                jobId: completeEvent.jobId,
              });
              console.info(
                '[Sidepanel] Set jobInFocus after extraction:',
                completeEvent.jobId
              );

              // Clear ephemeral extraction state
              setExtractingJob(null);
              setExtracting(false);

              // Reload to display the completed job
              await loadJobInFocus();
            } catch (err) {
              console.error('[Sidepanel] Error saving completed job:', err);
              setError('Failed to save extracted job');
              setExtractingJob(null);
            }
          })();
          break;
        }

        case 'extractionError':
          console.error(
            '[Sidepanel] Extraction error for job:',
            event.jobId,
            event.error
          );

          // Clear ephemeral state and show error
          setExtractingJob(null);
          setExtracting(false);
          setError(`Extraction failed: ${event.error}`);
          break;

        case 'extractionCancelled':
          console.info(
            '[Sidepanel] Extraction cancelled for job:',
            event.jobId
          );

          // Clear ephemeral state
          setExtractingJob(null);
          setExtracting(false);
          break;

        default:
          break;
      }
    };

    extractionEvents.onExtractionEvent(handleExtraction);

    return () => {
      extractionEvents.offExtractionEvent(handleExtraction);
    };
  }, [extractionEvents, extractingJob, loadJobInFocus, storage]);

  /**
   * Watch for extraction trigger from context menu (via storage)
   * This is triggered when user clicks "Extract Job from This Page" in context menu
   */
  useEffect(() => {
    console.info('[Sidepanel] 🔍 Setting up extraction trigger watcher...');

    // Check for existing trigger on mount (in case it was set before sidepanel opened)
    extractionTriggerStorage.getValue().then((currentValue) => {
      console.info('[Sidepanel] Initial trigger check:', currentValue);
      if (currentValue) {
        console.info(
          '[Sidepanel] ✅ Found existing trigger on mount, starting extraction'
        );
        // Trigger extraction
        handleExtractJob();
        // Clear the trigger
        extractionTriggerStorage.setValue(null);
      }
    });

    // Watch for new triggers
    const unwatch = extractionTriggerStorage.watch(
      (newValue: number | null, oldValue: number | null) => {
        console.info(
          '[Sidepanel] 📡 Extraction trigger storage change detected!'
        );
        console.info('[Sidepanel] Old value:', oldValue);
        console.info('[Sidepanel] New value:', newValue);

        // Only trigger if value changed (new timestamp set)
        if (newValue && newValue !== oldValue) {
          console.info(
            '[Sidepanel] ✅ Valid extraction trigger received from context menu'
          );
          console.info(
            '[Sidepanel] Timestamp:',
            new Date(newValue).toISOString()
          );

          // Clear the trigger to prevent duplicate executions
          extractionTriggerStorage.setValue(null);

          // Trigger extraction
          console.info(
            '[Sidepanel] 🚀 Starting extraction from context menu trigger...'
          );
          handleExtractJob();
        }
      }
    );

    console.info('[Sidepanel] ✅ Extraction trigger watcher registered');

    return () => {
      console.info('[Sidepanel] 🧹 Cleaning up extraction trigger watcher');
      unwatch();
    };
  }, [handleExtractJob]);

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
  if (extractingJob) {
    const chunkCount = extractingJob.chunks.length;
    const previewText =
      extractingJob.chunks.length > 0
        ? extractingJob.chunks.join('').substring(0, 200) + '...'
        : 'Waiting for data...';

    return (
      <div className="container">
        <div className="job-card">
          <div className="detail-panel-content">
            <div className="job-header">
              <div>
                <div className="job-title">Extracting Job Data...</div>
                <div className="company">{extractingJob.url}</div>
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

            <div
              style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}
            >
              <button
                id="extractJobBtn"
                className="btn btn-primary"
                onClick={handleExtractJob}
                disabled={extracting}
                title="Extract job data from the current tab"
              >
                {extracting ? 'Extracting...' : 'Extract Job Data'}
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
