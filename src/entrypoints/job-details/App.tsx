import React, { useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { buttonVariants } from '@/components/ui/button-variants';
import { ResearchingView } from './views/ResearchingView';
import { DraftingView } from './views/DraftingView';
import { useJobStore, useFitScore } from './hooks';
import { useLLMSettings } from '@/hooks/useLLMSettings';
import { JobViewRouter } from '../../components/features/JobViewRouter';
import {
  ParsedJobProvider,
  useGetParsedJob,
} from '../../components/features/ParsedJobProvider';
import { JobSelector } from '../../components/features/JobSelector';
import { initDevModeValidation } from '../../utils/dev-validators';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Modal';
import { ThemeModal } from '../../components/features/ThemeModal';
import { LLMSettingsForm } from '../../components/features/LLMSettingsForm';
import { PanelLeft, User } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { useConfirmDialog, useAlertDialog } from '../../hooks/useConfirmDialog';
import {
  getAllStorageData,
  restoreStorageFromBackup,
  clearAllStorage,
  sidebarCollapsedStorage,
} from '../../utils/storage';
import { defaults } from '@/config';
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

  const [error, _setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isLLMSettingsModalOpen, setIsLLMSettingsModalOpen] = useState(false);

  // LLM settings for modal
  const llmSettings = useLLMSettings();

  // Dialog state for confirmations and alerts
  const {
    dialogState: confirmState,
    confirm,
    closeDialog: closeConfirm,
  } = useConfirmDialog();
  const { alertState, alert: showAlert, closeAlert } = useAlertDialog();

  // Get the current job for fit score calculation
  const currentJob = store.jobs[store.selectedJobIndex];

  // Calculate fit score (watches job content and profile changes)
  const { isCalculating: isCalculatingFit, spinnerChar: fitSpinnerChar } =
    useFitScore({
      jobContent: currentJob?.content,
      jobId: currentJob?.id,
    });

  // Load sidebar open state from storage on mount (stored as "collapsed")
  useEffect(() => {
    sidebarCollapsedStorage.getValue().then((collapsed) => {
      setSidebarOpen(!collapsed);
    });
  }, []);

  // Handle sidebar open change with storage persistence
  const handleSidebarOpenChange = useCallback((open: boolean) => {
    setSidebarOpen(open);
    sidebarCollapsedStorage.setValue(!open);
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
      const confirmed = await confirm({
        title: 'Delete Job',
        description: 'Are you sure you want to delete this job?',
        confirmLabel: 'Delete',
        variant: 'destructive',
      });
      if (!confirmed) {
        return;
      }

      await store.deleteJob(jobId);
      console.info(`[App] Deleted job ${jobId}`);
    },
    [store, confirm]
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
   * Select a job by ID
   */
  const selectJob = useCallback(
    async (jobId: string) => {
      // Find global index
      const globalIndex = store.jobs.findIndex((j: Job) => j.id === jobId);
      if (globalIndex === -1) {
        console.error('Job not found in jobs array:', jobId);
        return;
      }

      // Update selected index (use global index)
      store.setSelectedIndex(globalIndex);

      // Set as job in focus
      await store.setJobInFocus(jobId);
      console.info(`Set job ${jobId} as job in focus`);
    },
    [store]
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
      showAlert({
        title: 'Backup Failed',
        description: 'Failed to create backup. See console for details.',
      });
    }
  }, [showAlert]);

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

        const confirmed = await confirm({
          title: 'Restore Backup',
          description:
            'This will overwrite all current data. Are you sure you want to restore this backup?',
          confirmLabel: 'Restore',
          variant: 'destructive',
        });
        if (!confirmed) return;

        await restoreStorageFromBackup(data);
        console.info('Backup restored successfully');
        showAlert({
          title: 'Backup Restored',
          description: 'Backup restored! The page will now reload.',
        });
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        console.error('Error restoring backup:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : String(err),
          fileName: file.name,
        });
        showAlert({
          title: 'Restore Failed',
          description:
            'Failed to restore backup. Check the console for details. Make sure the file is a valid JSON backup.',
        });
      }
    };

    input.click();
  }, [confirm, showAlert]);

  /**
   * Delete all storage data (with double confirmation)
   */
  const handleDeleteAll = useCallback(async () => {
    const firstConfirmed = await confirm({
      title: 'Delete All Data',
      description:
        'WARNING: This will permanently delete ALL jobs and data. This cannot be undone. Are you sure?',
      confirmLabel: 'Continue',
      variant: 'destructive',
    });
    if (!firstConfirmed) return;

    const secondConfirmed = await confirm({
      title: 'Final Confirmation',
      description:
        'FINAL WARNING: This is your last chance to cancel. Delete everything?',
      confirmLabel: 'Delete Everything',
      variant: 'destructive',
    });
    if (!secondConfirmed) return;

    try {
      await clearAllStorage();
      console.info('All storage cleared');
      showAlert({
        title: 'Data Deleted',
        description: 'All data has been deleted. The page will now reload.',
      });
      // Delay reload slightly so user sees the alert
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('Error clearing storage:', err);
      showAlert({
        title: 'Error',
        description: 'Failed to clear storage. See console for details.',
      });
    }
  }, [confirm, showAlert]);

  /**
   * Initialize app on mount
   */
  useEffect(() => {
    console.info('Initializing JobDetailsApp...');
    initDevModeValidation(); // Enable MarkdownDB pattern validation in dev mode
    console.info('JobDetailsApp initialized');
  }, []);

  /**
   * Auto-select job when jobInFocus changes or on initial load
   */
  useEffect(() => {
    if (store.jobs.length === 0) {
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

    // Priority 2: Currently selected job is still valid
    const selectedIndex = store.selectedJobIndex;
    if (selectedIndex >= 0 && selectedIndex < store.jobs.length) {
      return; // Keep current selection
    }

    // Priority 3: First job
    store.setSelectedIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.jobInFocusId, store.selectedJobIndex, store.jobs.length]);

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
          store.jobs.length === 0 ? 'No jobs yet' : 'No job selected'
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
        <p className="text-destructive">{error}</p>
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
    totalJobs: store.jobs.length,
    selectedIndex: store.selectedJobIndex,
  });

  return (
    <div className="max-w-full h-screen m-0 bg-background flex flex-col">
      {/* Header with branding and action buttons */}
      <header className="flex justify-between items-center py-3 px-6 border-b border-border bg-background shrink-0">
        {/* Left: Sidebar toggle */}
        <Button
          variant="ghost"
          className="p-2 min-w-9 min-h-9 text-muted-foreground hover:bg-muted flex items-center justify-center"
          onClick={() => handleSidebarOpenChange(!sidebarOpen)}
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        {/* Center: Title */}
        <h1 className="text-lg font-semibold text-foreground">Sir Hires</h1>

        {/* Right: Action buttons */}
        <div className="flex gap-1 items-center">
          <span
            className="text-muted-foreground text-lg font-mono w-6 text-center"
            title={isCalculatingFit ? 'Calculating fit score...' : undefined}
            aria-label={isCalculatingFit ? 'Calculating fit score' : undefined}
          >
            {isCalculatingFit ? fitSpinnerChar : ''}
          </span>
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
                label: 'LLM Settings',
                onClick: () => setIsLLMSettingsModalOpen(true),
              },
              {
                label: 'Theme',
                onClick: () => setIsThemeModalOpen(true),
              },
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
      <div className="flex flex-1 overflow-hidden relative">
        {/* Job Selector (sidebar) */}
        <JobSelector
          jobs={store.jobs}
          selectedJobId={store.jobs[store.selectedJobIndex]?.id ?? null}
          onSelectJob={selectJob}
          onDeleteJob={handleDeleteJob}
          isOpen={sidebarOpen}
          onOpenChange={handleSidebarOpenChange}
          getParsedJob={getParsedJob}
          mode="responsive"
        />

        {/* Detail panel */}
        <div className="flex-1 overflow-hidden">
          <div
            className="h-full overflow-hidden bg-background"
            id="detailPanel"
          >
            {renderJobView()}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmState.isOpen}
        onOpenChange={(open) => !open && closeConfirm()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmState.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeConfirm}>
              {confirmState.cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmState.onConfirm}
              className={
                confirmState.variant === 'destructive'
                  ? buttonVariants({ variant: 'danger' })
                  : undefined
              }
            >
              {confirmState.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Simple Alert Dialog */}
      <AlertDialog
        open={alertState.isOpen}
        onOpenChange={(open) => !open && closeAlert()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertState.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertState.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={closeAlert}>
              {alertState.buttonLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Theme Modal */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* LLM Settings Modal */}
      <Modal
        isOpen={isLLMSettingsModalOpen}
        onClose={() => setIsLLMSettingsModalOpen(false)}
        title="LLM Settings"
      >
        <LLMSettingsForm llmSettings={llmSettings} />
      </Modal>
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
