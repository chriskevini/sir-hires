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
import { JobCard } from '../../components/features/JobCard';
import { initDevModeValidation } from '../../utils/dev-validators';
import { StatusFilterDots } from '../../components/features/StatusFilterDots';
import { SortIconButtons } from '../../components/features/SortIconButtons';
import { Dropdown } from '../../components/ui/Dropdown';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import {
  getAllStorageData,
  restoreStorageFromBackup,
  clearAllStorage,
  sidebarCollapsedStorage,
} from '../../utils/storage';
import { defaults } from '@/config';
import { useJobFilters } from '@/hooks/useJobFilters';
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

  // Use shared job filtering hook
  const {
    searchTerm,
    setSearchTerm,
    statusFilters,
    setStatusFilters,
    sortField,
    sortDirection,
    handleSortChange,
    filteredJobs,
    totalCount,
    filteredCount,
  } = useJobFilters({ jobs: store.jobs, getParsedJob });

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
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading jobs...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-600">{error}</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  // Empty state
  if (store.jobs.length === 0) {
    return (
      <div className="max-w-full h-screen m-0 bg-background flex flex-col">
        <div
          id="emptyState"
          className="text-center py-16 px-5 text-muted-foreground"
        >
          <h2 className="text-xl mb-3">No Jobs Yet</h2>
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
    <div className="max-w-full h-screen m-0 bg-background flex flex-col">
      {/* Header with branding and action buttons */}
      <header className="flex justify-between items-center py-3 px-6 border-b border-border bg-background shrink-0">
        <div className="flex items-baseline gap-3">
          <Button
            variant="ghost"
            className="p-2 min-w-9 min-h-9 text-muted-foreground hover:bg-muted flex items-center justify-center"
            onClick={handleSidebarToggle}
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Sir Hires</h1>
        </div>
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            className="p-2 min-w-9 min-h-9 text-muted-foreground hover:bg-muted flex items-center justify-center"
            onClick={handleProfileClick}
            title="Profile"
          >
            <User className="h-5 w-5" />
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
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with filters and job list */}
        <div
          className={`${sidebarCollapsed ? 'w-0' : 'w-80'} border-r border-border flex flex-col bg-muted shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden ${sidebarCollapsed ? 'border-r-0' : ''}`}
        >
          <div className="p-4 border-b border-border bg-background">
            <div className="flex flex-col gap-3">
              <input
                type="text"
                id="searchInput"
                className="py-2 px-3 border border-border rounded text-sm w-full focus:outline-none focus:border-primary"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="flex items-center justify-center">
                <StatusFilterDots
                  selectedStatuses={statusFilters}
                  onChange={setStatusFilters}
                />
              </div>
              <div className="flex items-center justify-center">
                <SortIconButtons
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onChange={handleSortChange}
                />
              </div>
              <div className="flex items-center justify-start">
                <span className="text-xs italic text-muted-foreground">
                  {filteredCount} of {totalCount} jobs
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2" id="jobsList">
            {filteredJobs.map((job: Job, filteredIndex: number) => {
              const globalIndex = store.jobs.findIndex(
                (j: Job) => j.id === job.id
              );
              const isSelected = globalIndex === store.selectedJobIndex;
              const parsed = getParsedJob(job.id);
              const status = job.applicationStatus || defaults.status;

              return (
                <JobCard
                  key={job.id}
                  jobId={job.id}
                  parsed={parsed}
                  status={status}
                  isSelected={isSelected}
                  onClick={() => selectJob(filteredIndex)}
                  onDelete={() => handleDeleteJob(job.id)}
                />
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="relative flex-1 overflow-hidden">
          <div
            className="absolute inset-0 overflow-hidden bg-background"
            id="detailPanel"
          >
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
