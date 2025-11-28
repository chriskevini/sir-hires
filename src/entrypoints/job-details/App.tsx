import React, { useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
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
import { StatusFilterDots } from '../../components/ui/StatusFilterDots';
import {
  SortIconButtons,
  type SortField,
  type SortDirection,
} from '../../components/ui/SortIconButtons';
import { Dropdown } from '../../components/ui/Dropdown';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ProfileIcon,
  CloseIcon,
} from '../../components/ui/icons';
import {
  getAllStorageData,
  restoreStorageFromBackup,
  clearAllStorage,
  sidebarCollapsedStorage,
} from '../../utils/storage';
import { defaults, statusStyles } from '@/config';
import type { JobStore } from './hooks/useJobStore';
import type { Job } from './hooks';

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
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [error, _setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load sidebar collapsed state from storage on mount
  useEffect(() => {
    sidebarCollapsedStorage.getValue().then(setSidebarCollapsed);
  }, []);

  // Handle sidebar toggle with storage persistence
  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev;
      sidebarCollapsedStorage.setValue(newValue);
      return newValue;
    });
  }, []);

  // ============================================================================
  // ID-based handlers: Pass directly to view components
  // No more index-to-ID adapter functions needed!
  // ============================================================================

  /**
   * Handle save field event (generic field updates)
   */
  const handleSaveField = useCallback(
    async (jobId: string, fieldName: string, value: string) => {
      await store.updateJobField(jobId, fieldName, value);
      console.info(`[App] Updated ${fieldName} for job ${jobId}`);
    },
    [store]
  );

  /**
   * Handle delete job event
   */
  const handleDeleteJob = useCallback(
    async (jobId: string) => {
      if (!confirm('Are you sure you want to delete this job?')) {
        return;
      }

      await store.deleteJob(jobId);
      console.info(`[App] Deleted job ${jobId}`);
    },
    [store]
  );

  /**
   * Handle checklist toggle expand (global setting)
   */
  const handleChecklistToggleExpand = useCallback(
    async (isExpanded: boolean) => {
      await store.setChecklistExpanded(isExpanded);
      console.info(`[App] Toggled checklist expand globally to ${isExpanded}`);
    },
    [store]
  );

  /**
   * Handle checklist toggle item
   */
  const handleChecklistToggleItem = useCallback(
    async (jobId: string, itemId: string) => {
      const job = store.jobs.find((j: Job) => j.id === jobId);
      if (!job || !job.checklist) {
        console.error(
          '[App] handleChecklistToggleItem: Job or checklist not found:',
          jobId
        );
        return;
      }

      const status = job.applicationStatus || defaults.status;
      await store.toggleChecklistItem(jobId, status, itemId);
      console.info(`[App] Toggled checklist item ${itemId}`);
    },
    [store]
  );

  /**
   * Handle delete document (Drafting view)
   */
  const handleDeleteDocument = useCallback(
    async (jobId: string, documentKey: string) => {
      await store.deleteDocument(jobId, documentKey);
      console.info(`[App] Deleted document ${documentKey} for job ${jobId}`);
    },
    [store]
  );

  /**
   * Handle save document (auto-save or manual save)
   */
  const handleSaveDocument = useCallback(
    async (
      jobId: string,
      documentKey: string,
      documentData: { title: string; text: string }
    ) => {
      await store.saveDocument(jobId, documentKey, documentData);
      console.info(`[App] Saved document ${documentKey} for job ${jobId}`);
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

      // Status filter (multi-select: empty array = show all)
      if (statusFilters.length > 0) {
        const jobStatus = job.applicationStatus || defaults.status;
        if (!statusFilters.includes(jobStatus)) return false;
      }

      return true;
    });

    // Sort jobs using provider's cached parsing
    // Direction multiplier: 1 for ascending, -1 for descending
    const dirMult = sortDirection === 'asc' ? 1 : -1;

    if (sortField === 'date') {
      filtered = filtered.sort(
        (a: Job, b: Job) =>
          dirMult *
          (new Date(a.updatedAt || 0).getTime() -
            new Date(b.updatedAt || 0).getTime())
      );
    } else if (sortField === 'company') {
      filtered = filtered.sort((a: Job, b: Job) => {
        const parsedA = getParsedJob(a.id) || null;
        const parsedB = getParsedJob(b.id) || null;
        const companyA = parsedA ? getCompanyName(parsedA) || '' : '';
        const companyB = parsedB ? getCompanyName(parsedB) || '' : '';
        return dirMult * companyA.localeCompare(companyB);
      });
    } else if (sortField === 'title') {
      filtered = filtered.sort((a: Job, b: Job) => {
        const parsedA = getParsedJob(a.id) || null;
        const parsedB = getParsedJob(b.id) || null;
        const titleA = parsedA ? getJobTitle(parsedA) || '' : '';
        const titleB = parsedB ? getJobTitle(parsedB) || '' : '';
        return dirMult * titleA.localeCompare(titleB);
      });
    }

    console.info(`[filterJobs] Filtered to ${filtered.length} jobs`, {
      searchTerm,
      statusFilters,
      sortField,
      sortDirection,
    });

    return filtered;
  }, [
    store.jobs,
    searchTerm,
    statusFilters,
    sortField,
    sortDirection,
    getParsedJob,
  ]);

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
    window.location.href = '/profile.html';
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
    const firstConfirm = confirm(
      'WARNING: This will permanently delete ALL jobs and data. This cannot be undone. Are you sure?'
    );
    if (!firstConfirm) return;

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
        isChecklistExpanded={store.checklistExpanded}
        ResearchingView={ResearchingView}
        DraftingView={DraftingView}
        onDeleteJob={handleDeleteJob}
        onSaveField={handleSaveField}
        onSaveDocument={handleSaveDocument}
        onDeleteDocument={handleDeleteDocument}
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
        <Button variant="primary" onClick={() => window.location.reload()}>
          Retry
        </Button>
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
      {/* Header with branding and action buttons */}
      <header>
        <div className="header-title">
          <Button
            variant="ghost"
            className="sidebar-toggle-btn"
            onClick={handleSidebarToggle}
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {sidebarCollapsed ? ChevronRightIcon : ChevronLeftIcon}
          </Button>
          <h1>Sir Hires</h1>
        </div>
        <div className="header-actions">
          <Button
            variant="ghost"
            className="header-icon-btn"
            onClick={handleProfileClick}
            title="Profile"
          >
            {ProfileIcon}
          </Button>
          <Dropdown
            buttonLabel="More options"
            buttonIcon="⋮"
            iconOnly={true}
            items={[
              {
                label: 'Create Backup',
                onClick: handleCreateBackup,
              },
              {
                label: 'Restore Backup',
                onClick: handleRestoreBackup,
              },
              {
                label: 'Delete All',
                onClick: handleDeleteAll,
                variant: 'danger',
              },
            ]}
          />
        </div>
      </header>

      {/* Main content area */}
      <div className="main-content">
        {/* Sidebar with filters and job list */}
        <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
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
              <div className="filter-row">
                <StatusFilterDots
                  selectedStatuses={statusFilters}
                  onChange={setStatusFilters}
                />
              </div>
              <div className="filter-row">
                <SortIconButtons
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onChange={(field, direction) => {
                    setSortField(field);
                    setSortDirection(direction);
                  }}
                />
              </div>
              <div className="filter-row job-count-row">
                <span className="job-count">
                  {filteredJobs.length} of {store.jobs.length} jobs
                </span>
              </div>
            </div>
          </div>
          <div className="jobs-list-sidebar" id="jobsList">
            {filteredJobs.map((job: Job, filteredIndex: number) => {
              const globalIndex = store.jobs.findIndex(
                (j: Job) => j.id === job.id
              );
              const isSelected = globalIndex === store.selectedJobIndex;
              const parsed = getParsedJob(job.id);
              const status = job.applicationStatus || defaults.status;

              // Get the styles for the status
              const styles =
                statusStyles[status] || statusStyles['Researching'];

              return (
                <div
                  key={job.id}
                  className={`job-card ${isSelected ? 'selected' : ''}`}
                  style={{
                    backgroundColor: styles.cardBg,
                  }}
                  onClick={() => selectJob(filteredIndex)}
                >
                  <div className="job-card-header">
                    <div className="job-title">
                      {parsed ? getJobTitle(parsed) || 'Untitled' : 'Untitled'}
                    </div>
                    <div className="company">
                      {parsed ? getCompanyName(parsed) || 'Unknown' : 'Unknown'}
                    </div>
                    <span
                      className="job-card-status-badge"
                      style={{
                        backgroundColor: styles.color,
                        color: '#fff',
                      }}
                    >
                      {status}
                    </span>
                    {isSelected && (
                      <Button
                        variant="ghost"
                        className="btn-delete-card"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job.id);
                        }}
                        title="Delete this job"
                      >
                        {CloseIcon}
                      </Button>
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
