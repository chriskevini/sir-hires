import React, { useEffect, useCallback, useState } from 'react';
import { ResearchingView } from './views/researching-view';
import { DraftingView } from './views/drafting-view';
import { useJobState, useJobStorage } from './hooks';
import { defaults } from './config';
import { parseJobTemplate } from '../../utils/job-parser';

/**
 * Main App component for Job Details viewer
 * Replaces the old JobDetailsApp class with React architecture
 */
export const App: React.FC = () => {
  // Initialize hooks
  const jobState = useJobState();
  const storage = useJobStorage();

  // Local state for UI controls
  const [searchTerm, setSearchTerm] = useState('');
  const [_sourceFilter, _setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suppress reload flag for document auto-save
  const [suppressReloadUntil, setSuppressReloadUntil] = useState<number | null>(
    null
  );

  /**
   * Load jobs from storage on mount
   */
  const loadJobs = useCallback(async () => {
    console.info('Loading jobs from storage...');

    // Check if animation is active
    if (jobState.isAnimating) {
      console.info('Animation in progress, setting pending reload flag');
      jobState.setPendingReload(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load all data in parallel
      const [jobs, jobInFocusId, checklistExpanded] = await Promise.all([
        storage.getAllJobs(),
        storage.getJobInFocus(),
        storage.getChecklistExpanded(),
      ]);

      // Update state
      jobState.setAllJobs(jobs);
      jobState.setJobInFocus(jobInFocusId);
      jobState.setChecklistExpanded(checklistExpanded);

      console.info(`Loaded ${jobs.length} jobs from storage`);
    } catch (err) {
      console.error('Error loading jobs:', err);
      setError('Failed to load jobs. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - uses latest jobState/storage via closure

  /**
   * Filter jobs based on current filter settings
   */
  const filterJobs = useCallback(() => {
    const allJobs = jobState.allJobs;

    let filtered = allJobs.filter((job) => {
      // Parse content for search and sort
      const parsed = parseJobTemplate(job.content || '');

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          parsed.jobTitle?.toLowerCase().includes(searchLower) ||
          parsed.company?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Source filter - removed, no longer stored
      if (sourceFilter && sourceFilter !== '') {
        // Source is no longer stored, skip filter
        return true;
      }

      // Status filter
      if (statusFilter && statusFilter !== '') {
        const jobStatus = job.applicationStatus || defaults.status;
        if (jobStatus !== statusFilter) return false;
      }

      return true;
    });

    // Sort jobs
    if (sortOrder === 'newest') {
      filtered = filtered.sort(
        (a, b) =>
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
      );
    } else if (sortOrder === 'oldest') {
      filtered = filtered.sort(
        (a, b) =>
          new Date(a.updatedAt || 0).getTime() -
          new Date(b.updatedAt || 0).getTime()
      );
    } else if (sortOrder === 'company') {
      filtered = filtered.sort((a, b) => {
        const parsedA = parseJobTemplate(a.content || '');
        const parsedB = parseJobTemplate(b.content || '');
        return (parsedA.company || '').localeCompare(parsedB.company || '');
      });
    } else if (sortOrder === 'title') {
      filtered = filtered.sort((a, b) => {
        const parsedA = parseJobTemplate(a.content || '');
        const parsedB = parseJobTemplate(b.content || '');
        return (parsedA.jobTitle || '').localeCompare(parsedB.jobTitle || '');
      });
    }

    jobState.setFilteredJobs(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, sourceFilter, statusFilter, sortOrder]); // Don't include jobState - it's used, not watched

  /**
   * Select a job by index in filtered list
   */
  const selectJob = useCallback(
    async (filteredIndex: number) => {
      const filtered = jobState.filteredJobs;
      const job = filtered[filteredIndex];

      if (!job) {
        console.error('Job not found at filtered index:', filteredIndex);
        return;
      }

      // Find global index
      const globalIndex = jobState.allJobs.findIndex((j) => j.id === job.id);
      if (globalIndex === -1) {
        console.error('Job not found in allJobs array');
        return;
      }

      // Update selected index (use global index)
      jobState.setSelectedIndex(globalIndex);

      // Set as job in focus
      if (job.id) {
        await storage.setJobInFocus(job.id);
        jobState.setJobInFocus(job.id);
        console.info(`Set job ${job.id} as job in focus`);
      }
    },
    [jobState, storage]
  );

  /**
   * Handle storage change events
   */
  const handleStorageChange = useCallback(
    (changes: Record<string, unknown>) => {
      console.info('[App] Storage changed:', Object.keys(changes));

      // Check if reload is suppressed (during document auto-save)
      if (suppressReloadUntil && Date.now() < suppressReloadUntil) {
        console.info('[App] Reload suppressed during document save');
        return;
      }

      // Check if animation is active
      if (jobState.isAnimating) {
        console.info(
          '[App] Animation in progress, setting pending reload flag'
        );
        jobState.setPendingReload(true);
        return;
      }

      // Reload jobs if they changed
      if (changes.jobs || changes.jobInFocus) {
        console.info('[App] Jobs changed, reloading...');
        loadJobs();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suppressReloadUntil] // Only watch suppressReloadUntil - uses latest jobState/loadJobs via closure
  );

  /**
   * Handle save field event (generic field updates)
   */
  const handleSaveField = useCallback(
    async (index: number, fieldName: string, value: string) => {
      const job = jobState.allJobs[index];
      if (!job) {
        console.error('Job not found at index:', index);
        return;
      }

      const updatedJob = {
        ...job,
        [fieldName]: value,
        updatedAt: new Date().toISOString(),
      };

      await storage.updateJob(job.id, updatedJob);
      console.info(`Updated ${fieldName} for job at index ${index}`);
    },
    [jobState.allJobs, storage]
  );

  /**
   * Handle delete job event
   */
  const handleDeleteJob = useCallback(
    async (index: number) => {
      // eslint-disable-next-line no-undef
      if (!confirm('Are you sure you want to delete this job?')) {
        return;
      }

      const job = jobState.allJobs[index];
      if (!job) {
        console.error('Job not found at index:', index);
        return;
      }

      await storage.deleteJob(job.id);
      await loadJobs();
      console.info(`Deleted job at index ${index}`);
    },
    [jobState.allJobs, storage, loadJobs]
  );

  /**
   * Handle checklist toggle expand
   */
  const handleChecklistToggleExpand = useCallback(
    async (index: number, isExpanded: boolean) => {
      jobState.setChecklistExpanded(isExpanded);
      await storage.setChecklistExpanded(isExpanded);
      console.info(`Toggled checklist expand globally to ${isExpanded}`);
    },
    [jobState, storage]
  );

  /**
   * Handle checklist toggle item
   */
  const handleChecklistToggleItem = useCallback(
    async (index: number, itemId: string) => {
      const job = jobState.allJobs[index];
      if (!job || !job.checklist) {
        console.error('Job or checklist not found at index:', index);
        return;
      }

      // Find and toggle the item in the current status's checklist
      const currentStatusItems = job.checklist[job.applicationStatus || ''];
      if (!currentStatusItems) {
        console.error('Checklist not found for status:', job.applicationStatus);
        return;
      }

      const item = currentStatusItems.find(
        (i: { id: string; checked: boolean }) => i.id === itemId
      );
      if (item) {
        item.checked = !item.checked;

        const updatedJob = {
          ...job,
          updatedAt: new Date().toISOString(),
        };

        await storage.updateJob(job.id, updatedJob);
        console.info(`Toggled checklist item ${itemId}`);
      }
    },
    [jobState.allJobs, storage]
  );

  /**
   * Handle initialize documents (Drafting view)
   */
  const handleInitializeDocuments = useCallback(
    async (index: number) => {
      const job = jobState.allJobs[index];
      if (!job) {
        console.error('Job not found at index:', index);
        return;
      }

      // Initialize documents if not already present
      if (!job.documents) {
        const initializedDocs = storage.initializeDocuments(job);
        const updatedJob = {
          ...job,
          documents: initializedDocs,
          updatedAt: new Date().toISOString(),
        };

        await storage.updateJob(job.id, updatedJob);
        console.info(`Initialized documents for job at index ${index}`);
      }
    },
    [jobState.allJobs, storage]
  );

  /**
   * Handle save document (auto-save or manual save)
   */
  const handleSaveDocument = useCallback(
    async (
      index: number,
      documentKey: string,
      documentData: { title: string; text: string }
    ) => {
      const job = jobState.allJobs[index];
      if (!job) {
        console.error('Job not found at index:', index);
        return;
      }

      // Suppress reloads for 500ms to prevent auto-save from triggering view reload
      setSuppressReloadUntil(Date.now() + 500);

      // Save document to storage
      await storage.saveDocument(job.id, documentKey, documentData);
      console.info(`Saved document ${documentKey} for job at index ${index}`);
    },
    [jobState.allJobs, storage]
  );

  /**
   * Initialize app on mount
   */
  useEffect(() => {
    console.info('Initializing JobDetailsApp...');
    loadJobs();
    console.info('JobDetailsApp initialized');
  }, [loadJobs]);

  /**
   * Register storage change listener
   */
  useEffect(() => {
    storage.onStorageChange(handleStorageChange);

    return () => {
      storage.offStorageChange(handleStorageChange);
    };
  }, [storage, handleStorageChange]);

  /**
   * Filter jobs when filters change
   */
  useEffect(() => {
    filterJobs();
  }, [
    jobState.allJobs,
    searchTerm,
    sourceFilter,
    statusFilter,
    sortOrder,
    filterJobs,
  ]);

  /**
   * Auto-select job after filtering
   */
  useEffect(() => {
    const filtered = jobState.filteredJobs;

    if (filtered.length === 0) {
      jobState.setSelectedIndex(-1);
      return;
    }

    // Priority 1: Job in focus
    if (jobState.jobInFocusId) {
      const focusIndex = jobState.allJobs.findIndex(
        (job) => job.id === jobState.jobInFocusId
      );
      if (focusIndex !== -1) {
        jobState.setSelectedIndex(focusIndex);
        return;
      }
    }

    // Priority 2: Currently selected job
    const selectedIndex = jobState.selectedJobIndex;
    if (selectedIndex >= 0 && selectedIndex < jobState.allJobs.length) {
      return; // Keep current selection
    }

    // Priority 3: First job
    jobState.setSelectedIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    jobState.filteredJobs,
    jobState.jobInFocusId,
    jobState.selectedJobIndex,
    jobState.allJobs.length,
  ]); // Only watch specific properties that affect selection logic

  /**
   * Get the view component for the current job
   */
  const renderJobView = () => {
    const index = jobState.selectedJobIndex;
    const job = jobState.allJobs[index];

    if (!job) {
      return (
        <div className="detail-panel-empty">
          {jobState.filteredJobs.length === 0
            ? 'No jobs match your filters'
            : 'No job selected'}
        </div>
      );
    }

    const status = job.applicationStatus || defaults.status;
    // Parse content once for WIP view (called at top level, not inside switch)
    const parsed = parseJobTemplate(job.content || '');

    // Route to the appropriate view based on status
    switch (status) {
      case 'Researching':
        return (
          <ResearchingView
            job={job}
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
            job={job}
            index={index}
            isChecklistExpanded={jobState.checklistExpanded}
            onDeleteJob={handleDeleteJob}
            onSaveDocument={handleSaveDocument}
            onInitializeDocuments={handleInitializeDocuments}
            onToggleChecklistExpand={handleChecklistToggleExpand}
            onToggleChecklistItem={handleChecklistToggleItem}
          />
        );

      default: {
        // WIP view for unimplemented states
        return (
          <div className="job-card">
            <div className="detail-panel-content">
              <div className="job-header">
                <div>
                  <div className="job-title">
                    {parsed.jobTitle || 'Untitled'}
                  </div>
                  <div className="company">{parsed.company || 'Unknown'}</div>
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
                <button
                  className="btn btn-link"
                  onClick={() => window.open(job.url, '_blank')}
                >
                  View Job Posting
                </button>
                <button
                  className="btn btn-delete"
                  onClick={() => handleDeleteJob(index)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="app-loading">
        <p>Loading jobs...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="app-error">
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Empty state
  if (jobState.allJobs.length === 0) {
    return (
      <div id="emptyState" className="empty-state">
        <h2>No Jobs Yet</h2>
        <p>
          Use the browser extension to save jobs from LinkedIn, Indeed, or other
          job sites.
        </p>
      </div>
    );
  }

  // Main app UI
  return (
    <div className="app">
      {/* Header with filters */}
      <div className="app-header">
        <div className="filter-controls">
          <input
            type="text"
            id="searchInput"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* Source filter removed - source no longer stored */}
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Researching">Researching</option>
            <option value="Drafting">Drafting</option>
            <option value="Awaiting Review">Awaiting Review</option>
            <option value="Interviewing">Interviewing</option>
            <option value="Deciding">Deciding</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
          <select
            id="sortFilter"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="company">Company (A-Z)</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main content area */}
      <div className="main-content">
        {/* Sidebar with job list */}
        <div className="sidebar">
          <div className="jobs-list" id="jobsList">
            {jobState.filteredJobs.map((job, filteredIndex) => {
              const globalIndex = jobState.allJobs.findIndex(
                (j) => j.id === job.id
              );
              const isSelected = globalIndex === jobState.selectedJobIndex;
              const parsed = parseJobTemplate(job.content || '');

              return (
                <div
                  key={job.id}
                  className={`job-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectJob(filteredIndex)}
                >
                  <div className="job-card-header">
                    <div className="job-title">
                      {parsed.jobTitle || 'Untitled'}
                    </div>
                    <div className="company">{parsed.company || 'Unknown'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="detail-panel" id="detailPanel">
          {renderJobView()}
        </div>
      </div>
    </div>
  );
};
