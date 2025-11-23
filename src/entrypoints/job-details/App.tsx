import React, { useEffect, useCallback, useState } from 'react';
import { ResearchingView } from './views/researching-view';
import { DraftingView } from './views/drafting-view';
import { useJobState, useJobStorage, useJobHandlers } from './hooks';
import { JobViewRouter } from '../../components/features/JobViewRouter';
import {
  ParsedJobProvider,
  useGetParsedJob,
} from '../../components/features/ParsedJobProvider';
import { getJobTitle, getCompanyName } from '../../utils/job-parser';
import { initDevModeValidation } from '../../utils/dev-validators';
import { defaults } from './config';

/**
 * Inner component that uses ParsedJobProvider context
 * Must be rendered inside ParsedJobProvider
 */
interface AppContentProps {
  jobState: ReturnType<typeof useJobState>;
}

const AppContent: React.FC<AppContentProps> = ({ jobState }) => {
  // Initialize hooks (no duplicate jobState!)
  const storage = useJobStorage();
  const getParsedJob = useGetParsedJob();

  // Local state for UI controls
  const [searchTerm, setSearchTerm] = useState('');
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

      console.info(`[loadJobs] Loaded ${jobs.length} jobs from storage`, {
        jobIds: jobs.map((j) => j.id),
        jobInFocusId,
      });

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
   * Optimized with ParsedJobProvider cache to reduce redundant parsing operations
   */
  const filterJobs = useCallback(() => {
    const allJobs = jobState.allJobs;
    console.info(`[filterJobs] Starting filter with ${allJobs.length} jobs`);

    // Filter jobs using provider's cached parsing
    let filtered = allJobs.filter((job) => {
      const parsed = getParsedJob(job.id);
      if (!parsed) return true; // Include jobs with no content

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const jobTitle = getJobTitle(parsed);
        const company = getCompanyName(parsed);
        const matchesSearch =
          jobTitle?.toLowerCase().includes(searchLower) ||
          company?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Source filter - removed, no longer stored

      // Status filter
      if (statusFilter && statusFilter !== '') {
        const jobStatus = job.applicationStatus || defaults.status;
        if (jobStatus !== statusFilter) return false;
      }

      return true;
    });

    // Sort jobs using provider's cached parsing
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
        const parsedA = getParsedJob(a.id) || null;
        const parsedB = getParsedJob(b.id) || null;
        const companyA = parsedA ? getCompanyName(parsedA) || '' : '';
        const companyB = parsedB ? getCompanyName(parsedB) || '' : '';
        return companyA.localeCompare(companyB);
      });
    } else if (sortOrder === 'title') {
      filtered = filtered.sort((a, b) => {
        const parsedA = getParsedJob(a.id) || null;
        const parsedB = getParsedJob(b.id) || null;
        const titleA = parsedA ? getJobTitle(parsedA) || '' : '';
        const titleB = parsedB ? getJobTitle(parsedB) || '' : '';
        return titleA.localeCompare(titleB);
      });
    }

    console.info(`[filterJobs] Filtered to ${filtered.length} jobs`, {
      searchTerm,
      statusFilter,
      sortOrder,
    });
    jobState.setFilteredJobs(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, sortOrder, getParsedJob]); // Don't include jobState - it's used, not watched

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

  // Initialize shared job handlers
  const handlers = useJobHandlers(
    jobState,
    storage,
    loadJobs,
    suppressReloadUntil,
    setSuppressReloadUntil
  );

  /**
   * Initialize app on mount
   */
  useEffect(() => {
    console.info('Initializing JobDetailsApp...');
    initDevModeValidation(); // Enable MarkdownDB pattern validation in dev mode
    loadJobs();
    console.info('JobDetailsApp initialized');
  }, [loadJobs]);

  /**
   * Register storage change listener
   */
  useEffect(() => {
    storage.onStorageChange(handlers.handleStorageChange);

    return () => {
      storage.offStorageChange(handlers.handleStorageChange);
    };
  }, [storage, handlers.handleStorageChange]);

  /**
   * Filter jobs when filters change
   */
  useEffect(() => {
    filterJobs();
  }, [jobState.allJobs, searchTerm, statusFilter, sortOrder, filterJobs]);

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

    return (
      <JobViewRouter
        job={job}
        index={index}
        isChecklistExpanded={jobState.checklistExpanded}
        ResearchingView={ResearchingView}
        DraftingView={DraftingView}
        onDeleteJob={handlers.handleDeleteJob}
        onSaveField={handlers.handleSaveField}
        onSaveDocument={handlers.handleSaveDocument}
        onInitializeDocuments={handlers.handleInitializeDocuments}
        onToggleChecklistExpand={handlers.handleChecklistToggleExpand}
        onToggleChecklistItem={handlers.handleChecklistToggleItem}
        emptyStateMessage={
          jobState.filteredJobs.length === 0
            ? 'No jobs match your filters'
            : 'No job selected'
        }
      />
    );
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
  console.info('[Render] Main app UI', {
    allJobs: jobState.allJobs.length,
    filteredJobs: jobState.filteredJobs.length,
    selectedIndex: jobState.selectedJobIndex,
  });

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
              const parsed = getParsedJob(job.id);

              return (
                <div
                  key={job.id}
                  className={`job-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectJob(filteredIndex)}
                >
                  <div className="job-card-header">
                    <div className="job-title">
                      {parsed ? getJobTitle(parsed) || 'Untitled' : 'Untitled'}
                    </div>
                    <div className="company">
                      {parsed ? getCompanyName(parsed) || 'Unknown' : 'Unknown'}
                    </div>
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

/**
 * Main App component - wraps AppContent with ParsedJobProvider
 * Provides parsed job caching to all child components
 *
 * Why two components?
 * - ParsedJobProvider is a React Context that must wrap components that use useGetParsedJob()
 * - App creates jobState and passes allJobs to ParsedJobProvider
 * - AppContent receives jobState as prop and uses useGetParsedJob() hook
 * - This ensures single source of truth for jobState (no duplicate instances)
 */
export const App: React.FC = () => {
  const jobState = useJobState();

  return (
    <ParsedJobProvider jobs={jobState.allJobs}>
      <AppContent jobState={jobState} />
    </ParsedJobProvider>
  );
};
