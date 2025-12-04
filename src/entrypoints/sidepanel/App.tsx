import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { browser } from 'wxt/browser';
import { ResearchingView } from '../job-details/views/ResearchingView';
import { DraftingView } from '../job-details/views/DraftingView';
import { useJobStore } from '../job-details/hooks/useJobStore';
import { JobViewRouter } from '../../components/features/JobViewRouter';
import {
  ParsedJobProvider,
  useGetParsedJob,
} from '../../components/features/ParsedJobProvider';
import { JobSelector } from '../../components/features/JobSelector';
import { SidepanelHeader } from '../../components/features/SidepanelHeader';
import type { Job, ChecklistItem } from '../job-details/hooks';
import { useJobExtraction, useBackupRestore } from './hooks';
import { EmptyState } from '@/components/features/EmptyState';
import { ExtractionLoadingView } from '../job-details/components/ExtractionLoadingView';
import { ErrorState } from '@/components/features/ErrorState';
import { DuplicateJobModal } from '@/components/features/DuplicateJobModal';
import { WelcomeView } from '@/components/features/WelcomeView';
import { LLMSettingsForm } from '@/components/features/LLMSettingsForm';
import { checklistTemplates, defaults } from '@/config';
import {
  jobsStorage,
  restoreStorageFromBackup,
  welcomeCompletedStorage,
  userProfileStorage,
} from '../../utils/storage';
import { generateItemId } from '../../utils/shared-utils';
import { buttonVariants } from '@/components/ui/button-variants';
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
import { useTheme } from '../../hooks/useTheme';
import { useLLMSettings } from '../../hooks/useLLMSettings';

/**
 * Create default checklist for all statuses (adapter for useJobExtraction)
 */
function createDefaultChecklist(): Record<string, ChecklistItem[]> {
  const checklist: Record<string, ChecklistItem[]> = {};

  Object.keys(checklistTemplates).forEach((status) => {
    const template =
      checklistTemplates[status as keyof typeof checklistTemplates];
    checklist[status] = template.map((item, index) => ({
      id: generateItemId(status, index),
      text: item.text,
      checked: false,
      order: item.order,
    }));
  });

  return checklist;
}

/**
 * Props for SidepanelContent inner component
 */
interface SidepanelContentProps {
  mainContent: React.ReactNode;
  jobs: Job[];
  selectedJobId: string | null;
  selectorOpen: boolean;
  extracting: boolean;
  hasJob: boolean;
  onSelectorOpenChange: (open: boolean) => void;
  onExtract: () => void;
  onDelete: () => void;
  onMaximize: () => void;
  onSelectJob: (jobId: string) => void;
  onDeleteJobFromSelector: (jobId: string) => void;
  pendingExtraction: { url: string } | null;
  showDuplicateModal: boolean;
  onRefresh: () => void;
  onExtractNew: () => void;
  onCancelDuplicate: () => void;
  /** Whether to animate the maximize button (profile creation funnel) */
  shouldAnimateMaximize: boolean;
}

/**
 * Inner component that uses ParsedJobProvider context
 * Must be rendered inside ParsedJobProvider to access useGetParsedJob
 */
function SidepanelContent({
  mainContent,
  jobs,
  selectedJobId,
  selectorOpen,
  extracting,
  hasJob,
  onSelectorOpenChange,
  onExtract,
  onDelete,
  onMaximize,
  onSelectJob,
  onDeleteJobFromSelector,
  pendingExtraction,
  showDuplicateModal,
  onRefresh,
  onExtractNew,
  onCancelDuplicate,
  shouldAnimateMaximize,
}: SidepanelContentProps) {
  // Get parsed job accessor from context (must be inside ParsedJobProvider)
  const getParsedJob = useGetParsedJob();

  // Get parsed job info for the header
  const parsedJob = selectedJobId ? getParsedJob(selectedJobId) : null;
  const jobTitle = parsedJob?.topLevelFields['TITLE'];
  const company = parsedJob?.topLevelFields['COMPANY'];

  return (
    <div className="flex flex-col h-screen">
      {/* Header with toggle and action buttons */}
      <SidepanelHeader
        onToggleSelector={() => onSelectorOpenChange(!selectorOpen)}
        onExtract={onExtract}
        onDelete={onDelete}
        onMaximize={onMaximize}
        extracting={extracting}
        hasJob={hasJob}
        selectorOpen={selectorOpen}
        jobTitle={jobTitle}
        company={company}
        shouldAnimateMaximize={shouldAnimateMaximize}
      />

      {/* Main content area with JobSelector overlay */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {mainContent}

        {/* Job selector overlay - positioned relative to content area */}
        <JobSelector
          jobs={jobs}
          selectedJobId={selectedJobId}
          onSelectJob={onSelectJob}
          onDeleteJob={onDeleteJobFromSelector}
          isOpen={selectorOpen}
          onOpenChange={onSelectorOpenChange}
          getParsedJob={getParsedJob}
          mode="overlay"
        />
      </div>

      {/* Duplicate Job Modal */}
      {pendingExtraction && (
        <DuplicateJobModal
          isOpen={showDuplicateModal}
          onRefresh={onRefresh}
          onExtractNew={onExtractNew}
          onCancel={onCancelDuplicate}
        />
      )}
    </div>
  );
}

/**
 * Sidepanel App - Shows the "job in focus" for quick editing
 * Reuses all React components from job-details entrypoint
 *
 * Uses unified useJobStore for state management with adapter interfaces
 * for useJobExtraction and useBackupRestore hooks.
 */
export const App: React.FC = () => {
  // Use the unified job store
  const store = useJobStore();

  // Initialize theme and watch for changes across tabs
  useTheme();

  // LLM settings for onboarding (show setup form when not connected)
  const llmSettings = useLLMSettings();

  // Local UI state
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null); // null = loading
  const [hasProfile, setHasProfile] = useState(false);

  /**
   * Load welcome completed state on mount
   */
  useEffect(() => {
    welcomeCompletedStorage.getValue().then((completed) => {
      setShowWelcome(!completed);
    });
  }, []);

  /**
   * Load and watch profile state for animation trigger
   */
  useEffect(() => {
    // Initial load
    userProfileStorage.getValue().then((profile) => {
      setHasProfile(!!profile?.content?.trim());
    });

    // Watch for changes
    const unwatch = userProfileStorage.watch((profile) => {
      setHasProfile(!!profile?.content?.trim());
    });

    return unwatch;
  }, []);

  // Dialog state for confirmations
  const {
    dialogState: confirmState,
    confirm,
    closeDialog: closeConfirm,
  } = useConfirmDialog();

  // Dialog state for alerts
  const { alertState, alert, closeAlert } = useAlertDialog();

  // Derive current job from store
  const currentJob = useMemo(() => {
    if (!store.jobInFocusId) return null;
    return store.jobs.find((j) => j.id === store.jobInFocusId) || null;
  }, [store.jobInFocusId, store.jobs]);

  /**
   * Adapter: Storage interface for useJobExtraction
   * Bridges the store to the interface expected by useJobExtraction
   */
  const extractionStorageAdapter = useMemo(
    () => ({
      getAllJobs: async (): Promise<Job[]> => {
        // Read fresh from storage (extraction needs latest)
        const jobsObj = await jobsStorage.getValue();
        return Object.values(jobsObj);
      },
      saveAllJobs: async (jobs: Job[]): Promise<void> => {
        // Convert array to object and save
        const jobsObj: Record<string, Job> = {};
        jobs.forEach((job) => {
          if (job.id) {
            jobsObj[job.id] = job;
          }
        });
        await jobsStorage.setValue(jobsObj);
      },
      initializeAllChecklists: (): Job['checklist'] => {
        return createDefaultChecklist();
      },
    }),
    []
  );

  /**
   * Adapter: Storage interface for useBackupRestore
   */
  const backupStorageAdapter = useMemo(
    () => ({
      restoreBackup: async (data: {
        jobs: Record<string, unknown>;
        userProfile: unknown;
        llmSettings: unknown;
        jobInFocus: string | null;
      }): Promise<void> => {
        await restoreStorageFromBackup(data);
      },
    }),
    []
  );

  /**
   * Reload job in focus (for extraction completion callback)
   */
  const loadJobInFocus = useCallback(async () => {
    console.info('[Sidepanel] Reloading job in focus...');
    await store.reload();
  }, [store]);

  // Use extraction hook with adapter
  const extraction = useJobExtraction(
    extractionStorageAdapter,
    loadJobInFocus,
    currentJob
  );

  // Use backup/restore hook with adapter and dialog callbacks
  const backup = useBackupRestore(backupStorageAdapter, { confirm, alert });

  /**
   * Open job details in full page
   */
  const handleOpenJobDetails = useCallback(() => {
    browser.tabs.create({ url: 'job-details.html' });
    window.close();
  }, []);

  /**
   * Handle deleting the current job
   */
  const handleDeleteJob = useCallback(async () => {
    if (!currentJob) return;
    const confirmed = await confirm({
      title: 'Delete Job',
      description: 'Are you sure you want to delete this job?',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    await store.deleteJob(currentJob.id);
  }, [currentJob, store, confirm]);

  /**
   * Handle saving a field on a job (ID-based)
   */
  const handleSaveField = useCallback(
    async (jobId: string, fieldName: string, value: string) => {
      // Use updateJobField for persistence
      await store.updateJobField(jobId, fieldName, value);
    },
    [store]
  );

  /**
   * Handle saving a document (ID-based)
   */
  const handleSaveDocument = useCallback(
    async (
      jobId: string,
      documentKey: string,
      data: { title: string; text: string }
    ) => {
      await store.saveDocument(jobId, documentKey, data);
    },
    [store]
  );

  /**
   * Handle deleting a document (ID-based)
   */
  const handleDeleteDocument = useCallback(
    async (jobId: string, documentKey: string) => {
      await store.deleteDocument(jobId, documentKey);
    },
    [store]
  );

  /**
   * Handle toggling checklist expansion
   */
  const handleChecklistToggleExpand = useCallback(async () => {
    await store.setChecklistExpanded(!store.checklistExpanded);
  }, [store]);

  /**
   * Handle toggling a checklist item (ID-based)
   */
  const handleChecklistToggleItem = useCallback(
    async (jobId: string, itemId: string) => {
      const job = store.jobs.find((j) => j.id === jobId);
      if (!job) return;
      const status = job.applicationStatus || defaults.status;
      await store.toggleChecklistItem(jobId, status, itemId);
    },
    [store]
  );

  /**
   * Handle selecting a job from the JobSelector
   */
  const handleSelectJob = useCallback(async (jobId: string) => {
    await browser.runtime.sendMessage({ action: 'setJobInFocus', jobId });
  }, []);

  /**
   * Handle deleting a job from the JobSelector
   */
  const handleDeleteJobFromSelector = useCallback(
    async (jobId: string) => {
      const confirmed = await confirm({
        title: 'Delete Job',
        description: 'Are you sure you want to delete this job?',
        confirmLabel: 'Delete',
        variant: 'destructive',
      });
      if (!confirmed) return;
      await store.deleteJob(jobId);
    },
    [store, confirm]
  );

  /**
   * Mark initial load as complete when store finishes loading
   */
  useEffect(() => {
    if (!store.isLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [store.isLoading, isInitialLoad]);

  /**
   * Render the job view
   */
  const renderJobView = () => {
    return (
      <JobViewRouter
        job={currentJob}
        isChecklistExpanded={store.checklistExpanded}
        ResearchingView={ResearchingView}
        DraftingView={DraftingView}
        onDeleteJob={handleDeleteJob}
        onSaveField={handleSaveField}
        onSaveDocument={handleSaveDocument}
        onDeleteDocument={handleDeleteDocument}
        onToggleChecklistExpand={handleChecklistToggleExpand}
        onToggleChecklistItem={handleChecklistToggleItem}
        emptyStateMessage="No job selected"
        showHeader={false}
        showFooter={true}
      />
    );
  };

  // Parse ephemeral extraction content (must be at top level for hooks)
  const ephemeralContent = extraction.extractingJob
    ? extraction.extractingJob.chunks.join('')
    : '';

  // Handler to cancel extraction
  const handleCancelExtraction = useCallback(() => {
    if (!extraction.extractingJob) return;
    extraction.cancelExtraction();
  }, [extraction]);

  /**
   * Handler for completing the welcome flow
   * Called when user clicks "Get Started" after connecting LLM
   */
  const handleCompleteWelcome = useCallback(async () => {
    await welcomeCompletedStorage.setValue(true);
    setShowWelcome(false);
  }, []);

  /**
   * Handler to re-open the welcome view (from help button)
   */
  const handleShowWelcome = useCallback(() => {
    setShowWelcome(true);
  }, []);

  // Determine loading state
  const isLoading = store.isLoading && isInitialLoad;

  // Wait for welcome state and LLM settings to initialize before rendering
  // This prevents flash of empty state before WelcomeView
  if (showWelcome === null || !llmSettings.hasInitialized) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <div className="text-muted-foreground italic">Loading...</div>
      </div>
    );
  }

  // Show welcome view for first-time users (full takeover, no header)
  if (showWelcome === true) {
    return (
      <WelcomeView
        llmSettings={llmSettings}
        onGetStarted={handleCompleteWelcome}
      />
    );
  }

  // Render main content based on state
  let mainContent;

  // Loading state
  if (isLoading) {
    mainContent = (
      <div className="text-center py-10 px-5 text-muted-foreground italic">
        Loading job details...
      </div>
    );
  }
  // Extracting state (ephemeral - not yet saved to storage)
  else if (extraction.extractingJob) {
    mainContent = (
      <ExtractionLoadingView
        content={ephemeralContent}
        jobId={extraction.extractingJob.id}
        onDelete={handleCancelExtraction}
      />
    );
  }
  // Error state
  else if (extraction.error) {
    mainContent = (
      <ErrorState
        error={extraction.error}
        onRetry={() => window.location.reload()}
      />
    );
  }
  // LLM not connected (returning users only - first-time users see WelcomeView)
  else if (!llmSettings.isConnected) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              LLM Connection Required
            </h1>
            <p className="text-muted-foreground">
              Connect to an LLM to continue using Sir Hires.
            </p>
          </div>
          <LLMSettingsForm llmSettings={llmSettings} />
        </div>
      </div>
    );
  }
  // Empty state (connected but no jobs)
  else if (!currentJob) {
    mainContent = (
      <EmptyState
        onRestoreBackup={backup.handleRestoreBackup}
        onShowHelp={handleShowWelcome}
      />
    );
  }
  // Main job view
  else {
    mainContent = renderJobView();
  }

  // Render main content + modal (modal should always be available)
  // Wrap entire app in ParsedJobProvider to avoid conditional hook rendering
  return (
    <ParsedJobProvider jobs={store.jobs}>
      <SidepanelContent
        mainContent={mainContent}
        jobs={store.jobs}
        selectedJobId={store.jobInFocusId}
        selectorOpen={selectorOpen}
        extracting={extraction.extracting}
        hasJob={!!currentJob}
        onSelectorOpenChange={setSelectorOpen}
        onExtract={extraction.handleExtractJob}
        onDelete={handleDeleteJob}
        onMaximize={handleOpenJobDetails}
        onSelectJob={handleSelectJob}
        onDeleteJobFromSelector={handleDeleteJobFromSelector}
        pendingExtraction={extraction.pendingExtraction}
        showDuplicateModal={extraction.showDuplicateModal}
        onRefresh={extraction.handleRefreshJob}
        onExtractNew={extraction.handleExtractNew}
        onCancelDuplicate={extraction.handleCancelDuplicate}
        shouldAnimateMaximize={store.jobs.length > 0 && !hasProfile}
      />

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

      {/* Alert Dialog */}
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
    </ParsedJobProvider>
  );
};
