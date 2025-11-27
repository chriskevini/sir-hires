import React, { useEffect, useCallback, useState } from 'react';
import { ResearchingView } from './views/ResearchingView';
import { DraftingView } from './views/DraftingView';
import { useJobStore } from './hooks';
import { JobViewRouter } from '../../components/features/JobViewRouter';
import {
  ParsedJobProvider,
  useGetParsedJob,
} from '../../components/features/ParsedJobProvider';
import { getJobTitle, getCompanyName } from '../../utils/job-parser';
import { initDevModeValidation } from '../../utils/dev-validators';
import {
  getAllStorageData,
  restoreStorageFromBackup,
  clearAllStorage,
} from '../../utils/storage';
import { defaults } from './config';
import { browser } from 'wxt/browser';
import type { JobStore } from './hooks/useJobStore';
import type { Job } from './hooks/useJobState';

/**
 * Inner component that uses ParsedJobProvider context
 * Must be rendered inside ParsedJobProvider
 */
interface AppContentProps {
  store: JobStore;
}

const AppContent: React.FC<AppContentProps> = ({ store }) => {
  const getParsedJob = useGetParsedJob();

  // Local state for UI controls (will be migrated to store.updateFilters in future)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [error, _setError] = useState<string | null>(null);

  // ============================================================================
  // Adapter functions: Bridge index-based handlers to ID-based store methods
  // These maintain backward compatibility with existing view components
  // ============================================================================

  /**
   * Handle save field event (generic field updates)
   * Adapter: converts index-based call to ID-based store method
   */
  const handleSaveField = useCallback(
    async (index: number, fieldName: string, value: string) => {
      const job = store.jobs[index];
      if (!job) {
        console.error('[App] handleSaveField: Job not found at index:', index);
        return;
      }

      await store.updateJobField(job.id, fieldName, value);
      console.info(`[App] Updated ${fieldName} for job at index ${index}`);
    },
    [store]
  );

  /**
   * Handle delete job event
   * Adapter: converts index-based call to ID-based store method
   */
  const handleDeleteJob = useCallback(
    async (index: number) => {
      // eslint-disable-next-line no-undef
      if (!confirm('Are you sure you want to delete this job?')) {
        return;
      }

      const job = store.jobs[index];
      if (!job) {
        console.error('[App] handleDeleteJob: Job not found at index:', index);
        return;
      }

      await store.deleteJob(job.id);
      console.info(`[App] Deleted job at index ${index}`);
    },
    [store]
  );

  /**
   * Handle checklist toggle expand
   * Adapter: converts index-based call to store method
   */
  const handleChecklistToggleExpand = useCallback(
    async (_index: number, isExpanded: boolean) => {
      await store.setChecklistExpanded(isExpanded);
      console.info(`[App] Toggled checklist expand globally to ${isExpanded}`);
    },
    [store]
  );

  /**
   * Handle checklist toggle item
   * Adapter: converts index-based call to ID-based store method
   */
  const handleChecklistToggleItem = useCallback(
    async (index: number, itemId: string) => {
      const job = store.jobs[index];
      if (!job || !job.checklist) {
        console.error(
          '[App] handleChecklistToggleItem: Job or checklist not found at index:',
          index
        );
        return;
      }

      const status = job.applicationStatus || defaults.status;
      await store.toggleChecklistItem(job.id, status, itemId);
      console.info(`[App] Toggled checklist item ${itemId}`);
    },
    [store]
  );

  /**
   * Handle initialize documents (Drafting view)
   * Adapter: converts index-based call to ID-based store method
   */
  const handleInitializeDocuments = useCallback(
    (index: number) => {
      const job = store.jobs[index];
      if (!job) {
        console.error(
          '[App] handleInitializeDocuments: Job not found at index:',
          index
        );
        return;
      }

      store.initializeDocuments(job.id);
      console.info(`[App] Initialized documents for job at index ${index}`);
    },
    [store]
  );

  /**
   * Handle save document (auto-save or manual save)
   * Adapter: converts index-based call to ID-based store method
   */
  const handleSaveDocument = useCallback(
    async (
      index: number,
      documentKey: string,
      documentData: { title: string; text: string }
    ) => {
      const job = store.jobs[index];
      if (!job) {
        console.error(
          '[App] handleSaveDocument: Job not found at index:',
          index
        );
        return;
      }

      await store.saveDocument(job.id, documentKey, documentData);
      console.info(
        `[App] Saved document ${documentKey} for job at index ${index}`
      );
    },
    [store]
  );

  // ============================================================================
  // Filter jobs based on current filter settings
  // TODO: Migrate to store.updateFilters() in a future iteration
  // ============================================================================

  const filterJobs = useCallback(() => {
    const allJobs = store.jobs;
    console.info(`[filterJobs] Starting filter with ${allJobs.length} jobs`);

    // Filter jobs using provider's cached parsing
    let filtered = allJobs.filter((job: Job) => {
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
        (a: Job, b: Job) =>
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
      );
    } else if (sortOrder === 'oldest') {
      filtered = filtered.sort(
        (a: Job, b: Job) =>
          new Date(a.updatedAt || 0).getTime() -
          new Date(b.updatedAt || 0).getTime()
      );
    } else if (sortOrder === 'company') {
      filtered = filtered.sort((a: Job, b: Job) => {
        const parsedA = getParsedJob(a.id) || null;
        const parsedB = getParsedJob(b.id) || null;
        const companyA = parsedA ? getCompanyName(parsedA) || '' : '';
        const companyB = parsedB ? getCompanyName(parsedB) || '' : '';
        return companyA.localeCompare(companyB);
      });
    } else if (sortOrder === 'title') {
      filtered = filtered.sort((a: Job, b: Job) => {
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

    return filtered;
  }, [store.jobs, searchTerm, statusFilter, sortOrder, getParsedJob]);

  // Calculate filtered jobs (memoized via filterJobs callback)
  const filteredJobs = filterJobs();

  /**
   * Select a job by index in filtered list
   */
  const selectJob = useCallback(
    async (filteredIndex: number) => {
      const job = filteredJobs[filteredIndex];

      if (!job) {
        console.error('Job not found at filtered index:', filteredIndex);
        return;
      }

      // Find global index
      const globalIndex = store.jobs.findIndex((j: Job) => j.id === job.id);
      if (globalIndex === -1) {
        console.error('Job not found in jobs array');
        return;
      }

      // Update selected index (use global index)
      store.setSelectedIndex(globalIndex);

      // Set as job in focus
      if (job.id) {
        await store.setJobInFocus(job.id);
        console.info(`Set job ${job.id} as job in focus`);
      }
    },
    [filteredJobs, store]
  );

  /**
   * Open profile.html in a new tab
   */
  const handleProfileClick = useCallback(() => {
    browser.tabs.create({ url: '/profile.html' });
  }, []);

  /**
   * Create backup and download as JSON file
   */
  const handleCreateBackup = useCallback(async () => {
    try {
      const data = await getAllStorageData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `sir-hires-backup-${timestamp}.json`;

      // Wrap with metadata for validation
      const backup = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: data,
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.info(`Backup created: ${filename}`);
    } catch (err) {
      console.error('Error creating backup:', err);
      alert('Failed to create backup. See console for details.');
    }
  }, []);

  /**
   * Restore backup from uploaded JSON file
   */
  const handleRestoreBackup = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const backup = JSON.parse(text);

        // Support both new format (with metadata) and legacy format (raw data)
        const data = backup.version && backup.data ? backup.data : backup;

        console.info('Backup format detected:', {
          hasVersion: !!backup.version,
          hasData: !!backup.data,
          keys: Object.keys(backup).slice(0, 10),
        });

        // eslint-disable-next-line no-undef
        const confirmed = confirm(
          'This will overwrite all current data. Are you sure you want to restore this backup?'
        );
        if (!confirmed) return;

        await restoreStorageFromBackup(data);
        console.info('Backup restored successfully');
        alert('Backup restored! The page will now reload.');
        window.location.reload();
      } catch (err) {
        console.error('Error restoring backup:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : String(err),
          fileName: file.name,
        });
        alert(
          'Failed to restore backup. Check the console for details. Make sure the file is a valid JSON backup.'
        );
      }
    };

    input.click();
  }, []);

  /**
   * Delete all storage data (with double confirmation)
   */
  const handleDeleteAll = useCallback(async () => {
    // eslint-disable-next-line no-undef
    const firstConfirm = confirm(
      'WARNING: This will permanently delete ALL jobs and data. This cannot be undone. Are you sure?'
    );
    if (!firstConfirm) return;

    // eslint-disable-next-line no-undef
    const secondConfirm = confirm(
      'FINAL WARNING: This is your last chance to cancel. Delete everything?'
    );
    if (!secondConfirm) return;

    try {
      await clearAllStorage();
      console.info('All storage cleared');
      alert('All data has been deleted. The page will now reload.');
      window.location.reload();
    } catch (err) {
      console.error('Error clearing storage:', err);
      alert('Failed to clear storage. See console for details.');
    }
  }, []);

  /**
   * Initialize app on mount
   */
  useEffect(() => {
    console.info('Initializing JobDetailsApp...');
    initDevModeValidation(); // Enable MarkdownDB pattern validation in dev mode
    console.info('JobDetailsApp initialized');
  }, []);

  /**
   * Auto-select job after filtering or when jobInFocus changes
   */
  useEffect(() => {
    if (filteredJobs.length === 0) {
      store.setSelectedIndex(-1);
      return;
    }

    // Priority 1: Job in focus
    if (store.jobInFocusId) {
      const focusIndex = store.jobs.findIndex(
        (job: Job) => job.id === store.jobInFocusId
      );
      if (focusIndex !== -1) {
        store.setSelectedIndex(focusIndex);
        return;
      }
    }

    // Priority 2: Currently selected job
    const selectedIndex = store.selectedJobIndex;
    if (selectedIndex >= 0 && selectedIndex < store.jobs.length) {
      return; // Keep current selection
    }

    // Priority 3: First job
    store.setSelectedIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filteredJobs.length,
    store.jobInFocusId,
    store.selectedJobIndex,
    store.jobs.length,
  ]);

  /**
   * Get the view component for the current job
   */
  const renderJobView = () => {
    const index = store.selectedJobIndex;
    const job = store.jobs[index];

    return (
      <JobViewRouter
        job={job}
        index={index}
        isChecklistExpanded={store.checklistExpanded}
        ResearchingView={ResearchingView}
        DraftingView={DraftingView}
        onDeleteJob={handleDeleteJob}
        onSaveField={handleSaveField}
        onSaveDocument={handleSaveDocument}
        onInitializeDocuments={handleInitializeDocuments}
        onToggleChecklistExpand={handleChecklistToggleExpand}
        onToggleChecklistItem={handleChecklistToggleItem}
        emptyStateMessage={
          filteredJobs.length === 0
            ? 'No jobs match your filters'
            : 'No job selected'
        }
      />
    );
  };

  // Loading state
  if (store.isLoading) {
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
  if (store.jobs.length === 0) {
    return (
      <div className="container">
        <div id="emptyState" className="empty-state">
          <h2>No Jobs Yet</h2>
          <p>
            Use the browser extension to save jobs from LinkedIn, Indeed, or
            other job sites.
          </p>
        </div>
      </div>
    );
  }

  // Main app UI
  console.info('[Render] Main app UI', {
    allJobs: store.jobs.length,
    filteredJobs: filteredJobs.length,
    selectedIndex: store.selectedJobIndex,
  });

  return (
    <div className="container">
      {/* Header with title and action buttons */}
      <header>
        <div className="header-title">
          <h1>Saved Jobs</h1>
          <span className="job-count">
            {filteredJobs.length} of {store.jobs.length} jobs
          </span>
        </div>
        <div className="header-actions">
          <button onClick={handleProfileClick}>Profile</button>
          <button onClick={handleCreateBackup}>Create Backup</button>
          <button onClick={handleRestoreBackup}>Restore Backup</button>
          <button onClick={handleDeleteAll} className="danger">
            Delete All
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="main-content">
        {/* Sidebar with filters and job list */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="filters">
              <input
                type="text"
                id="searchInput"
                className="filter-input"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                id="statusFilter"
                className="filter-input"
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
                className="filter-input"
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
          <div className="jobs-list-sidebar" id="jobsList">
            {filteredJobs.map((job: Job, filteredIndex: number) => {
              const globalIndex = store.jobs.findIndex(
                (j: Job) => j.id === job.id
              );
              const isSelected = globalIndex === store.selectedJobIndex;
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
                    {isSelected && (
                      <button
                        className="btn-delete-card"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(globalIndex);
                        }}
                        title="Delete this job"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="detail-panel-wrapper">
          <div className="detail-panel" id="detailPanel">
            {renderJobView()}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main App component - wraps AppContent with ParsedJobProvider
 * Provides parsed job caching to all child components
 *
 * Architecture:
 * - App creates useJobStore (single source of truth for job state + storage)
 * - ParsedJobProvider receives jobs array for caching parsed job templates
 * - AppContent receives store and uses useGetParsedJob() hook for cached parsing
 *
 * The useJobStore hook handles:
 * - Loading jobs from storage on mount
 * - Storage change listener with echo cancellation (no more suppressReloadUntil)
 * - ID-based updates (immune to array reordering)
 * - Optimistic updates with fire-and-forget persistence
 */
export const App: React.FC = () => {
  const store = useJobStore();

  return (
    <ParsedJobProvider jobs={store.jobs}>
      <AppContent store={store} />
    </ParsedJobProvider>
  );
};
