import React, {
  useEffect,
  useMemo,
  useCallback,
  useState,
  useRef,
} from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  NewDocumentModal,
  type DocumentTemplateKey,
} from '@/components/features/NewDocumentModal';
import { EditorToolbar } from '@/components/features/EditorToolbar';
import { EditorContentPanel } from '@/components/features/EditorContentPanel';
import { StreamingTextarea } from '@/components/ui/StreamingTextarea';
import { EditorFooter } from '@/components/features/EditorFooter';
import { SynthesisFooter } from '@/components/features/SynthesisFooter';
import { getRandomTone } from '@/utils/synthesis-utils';
import { useParsedJob } from '@/components/features/ParsedJobProvider';
import { getJobTitle, getCompanyName } from '@/utils/job-parser';
import { formatSaveTime } from '@/utils/date-utils';
import { synthesis } from '@/tasks';
import { countWords } from '@/utils/text-utils';
import { exportMarkdown, exportPDF } from '@/utils/export-utils';
import { useImmediateSaveMulti } from '@/hooks/useImmediateSave';
import { useTabState } from '../hooks/useTabState';
import { useDocumentManager } from '../hooks/useDocumentManager';
import { LLMClient } from '@/utils/llm-client';
import { userProfileStorage } from '@/utils/storage';
import { useLLMSettings } from '@/hooks/useLLMSettings';
import { DEFAULT_MODEL, DEFAULT_TASK_SETTINGS } from '@/utils/llm-utils';
import { runTask, startKeepalive } from '@/utils/llm-task-runner';
import { Maximize2, User } from 'lucide-react';
import type { Job } from '../hooks';

interface DraftingViewProps {
  job: Job;
  onDeleteJob: (_jobId: string) => void;
  onSaveField: (jobId: string, fieldName: string, value: string) => void;
  onSaveDocument: (
    _jobId: string,
    _documentKey: string,
    _documentData: { title: string; text: string; order?: number }
  ) => void;
  onDeleteDocument: (jobId: string, documentKey: string) => void;
}

// Progress messages shown sequentially during synthesis
const SYNTHESIS_PROGRESS_MESSAGES = [
  'Starting synthesis',
  'Starting synthesis.',
  'Starting synthesis..',
  'Starting synthesis...',
  'Analyzing job requirements',
  'Analyzing job requirements.',
  'Analyzing job requirements..',
  'Analyzing job requirements...',
  'Matching profile to job',
  'Matching profile to job.',
  'Matching profile to job..',
  'Matching profile to job...',
  'Crafting your document',
  'Crafting your document.',
  'Crafting your document..',
  'Crafting your document...',
  'Almost done',
  'Almost done.',
  'Almost done..',
  'Almost done...',
];

const PROGRESS_MESSAGE_INTERVAL_MS = 1000;

// Helper to check if text is a progress message
const isProgressMessage = (text: string): boolean =>
  SYNTHESIS_PROGRESS_MESSAGES.some((msg) => text.startsWith(msg));

// Show toast notification (moved outside component for stable reference)
const showToast = (
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
) => {
  // Toast implementation would go here
  // For now, just use console
  if (type === 'error') {
    console.error(message);
  } else {
    console.info(message);
  }
};

/**
 * DraftingView - Content-only view for document drafting phase
 *
 * Renders the document editor with tabs, synthesis controls, and export options.
 * Header and footer are handled by JobViewRouter.
 */
export const DraftingView: React.FC<DraftingViewProps> = ({
  job,
  onDeleteJob: _onDeleteJob,
  onSaveField: _onSaveField,
  onSaveDocument,
  onDeleteDocument,
}) => {
  // State
  const [wordCount, setWordCount] = React.useState<number>(0);

  // Synthesis state
  const [tone, setTone] = useState(() => getRandomTone());
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState('');

  // Derived state
  const hasProfile = userProfile && userProfile.trim().length > 0;

  // New document modal state
  const [showNewDocumentModal, setShowNewDocumentModal] = useState(false);

  // Delete document modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Refs for synthesis
  const originalContentRef = useRef<string>('');
  const hasReceivedContentRef = useRef<boolean>(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIndexRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // LLM settings
  const {
    model: savedModel,
    endpoint,
    modelsEndpoint,
    maxTokens: savedMaxTokens,
    temperature: savedTemperature,
    thinkHarder,
    isLoading: isLoadingSettings,
  } = useLLMSettings({ task: 'synthesis' });

  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [maxTokens, setMaxTokens] = useState(
    DEFAULT_TASK_SETTINGS.synthesis.maxTokens
  );

  // Sync local model state with saved settings when they load
  useEffect(() => {
    if (!isLoadingSettings && savedModel) {
      setSelectedModel(savedModel);
    }
  }, [isLoadingSettings, savedModel]);

  // Sync local maxTokens with saved task settings when they load
  useEffect(() => {
    if (!isLoadingSettings) {
      setMaxTokens(savedMaxTokens);
    }
  }, [isLoadingSettings, savedMaxTokens]);

  // Create LLM client
  const llmClient = useMemo(
    () =>
      new LLMClient({
        endpoint,
        modelsEndpoint,
      }),
    [endpoint, modelsEndpoint]
  );

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      const userProfileData = await userProfileStorage.getValue();
      const profile = userProfileData?.content || '';
      setUserProfile(profile);
    };
    fetchUserProfile();
  }, []);

  // Parse job content on-read (MarkdownDB pattern) using cached provider
  const parsed = useParsedJob(job.id);
  const parsedJob = useMemo(
    () => ({
      jobTitle: parsed ? getJobTitle(parsed) || '' : '',
      company: parsed ? getCompanyName(parsed) || '' : '',
    }),
    [parsed]
  );

  // Use document manager hook
  const { documentKeys, getDocument, addDocument, deleteDocument } =
    useDocumentManager({
      job,
      jobId: job.id,
      parsedJob,
      onAddDocument: onSaveDocument,
      onDeleteDocument,
    });

  // Tab state management
  // Use first available document key, or empty string if no documents exist
  const { activeTab, switchTab, getTabRef } = useTabState({
    initialTab: documentKeys[0] || '',
  });

  // Build initial values for auto-save from job documents
  // Depend on job.documents directly to avoid unstable getDocument reference
  const initialDocumentValues = useMemo(() => {
    const contents: Record<string, string> = {};
    documentKeys.forEach((key) => {
      contents[key] = job.documents?.[key]?.text || '';
    });
    return contents;
  }, [documentKeys, job.documents]);

  // Track save status display text
  const [saveStatusText, setSaveStatusText] = useState('');

  // Immediate-save hook (multi-value mode): saves on every change
  // Uses resetKey to re-initialize only when switching jobs (not on storage reload)
  const {
    values: documentContents,
    setValue: updateContent,
    getLatestValue,
  } = useImmediateSaveMulti({
    initialValues: initialDocumentValues,
    onSave: (key: string, content: string) => {
      // Preserve existing title, fallback to synthesis.documents lookup for known template keys
      const existingTitle = job.documents?.[key]?.title;
      const docConfig =
        synthesis.documents[key as keyof typeof synthesis.documents];
      const title =
        existingTitle ||
        docConfig?.defaultTitle(parsedJob.jobTitle, parsedJob.company) ||
        'Untitled';
      onSaveDocument(job.id, key, {
        title,
        text: content,
      });
      setSaveStatusText(`Last saved ${formatSaveTime(new Date())}`);
    },
    resetKey: job.id, // Re-initialize when switching jobs
  });

  // Update word count when active tab changes or content changes
  useEffect(() => {
    const text = documentContents[activeTab] || '';
    const count = countWords(text);
    setWordCount(count);
  }, [activeTab, documentContents]);

  // Update save status text on tab change (show last edited time from stored doc)
  useEffect(() => {
    const doc = getDocument(activeTab);
    if (doc.lastEdited) {
      setSaveStatusText(
        `Last saved ${formatSaveTime(new Date(doc.lastEdited))}`
      );
    } else {
      setSaveStatusText('');
    }
  }, [activeTab, getDocument]);

  // Handle textarea change
  const handleTextareaChange = useCallback(
    (documentKey: string, value: string) => {
      updateContent(documentKey, value);
    },
    [updateContent]
  );

  // Handle export
  const handleExport = useCallback(
    (exportType: 'md' | 'pdf') => {
      const doc = getDocument(activeTab);

      if (exportType === 'md') {
        exportMarkdown(doc, showToast);
      } else if (exportType === 'pdf') {
        exportPDF(doc, showToast);
      }
    },
    [activeTab, getDocument]
  );

  // Handle tone refresh
  const handleRefreshTone = useCallback(() => {
    setTone(getRandomTone());
  }, []);

  // Handle cancel synthesis
  const handleCancelSynthesis = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Handle adding a new document from template
  const handleAddDocument = useCallback(
    (templateKey: DocumentTemplateKey) => {
      const newKey = addDocument(templateKey);
      // Switch to the new document tab
      switchTab(newKey);
    },
    [addDocument, switchTab]
  );

  // Handle delete document request (opens confirmation modal)
  const handleDeleteRequest = useCallback((documentKey: string) => {
    setDocumentToDelete(documentKey);
    setShowDeleteModal(true);
  }, []);

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(() => {
    if (!documentToDelete) return;

    // Compute the new active tab BEFORE deleting (while documentKeys is still valid)
    let newActiveTab: string | null = null;
    if (documentKeys.length > 1 && documentToDelete === activeTab) {
      const deleteIndex = documentKeys.indexOf(documentToDelete);
      // Prefer previous tab, fallback to next
      const newIndex =
        deleteIndex > 0
          ? deleteIndex - 1
          : Math.min(1, documentKeys.length - 1);
      const candidate = documentKeys[newIndex];
      if (candidate && candidate !== documentToDelete) {
        newActiveTab = candidate;
      }
    }

    // Delete the document
    deleteDocument(documentToDelete);

    // Switch to the computed tab (if any)
    if (newActiveTab) {
      switchTab(newActiveTab);
    }

    // Close the modal
    setShowDeleteModal(false);
    setDocumentToDelete(null);
  }, [documentToDelete, documentKeys, activeTab, deleteDocument, switchTab]);

  // Build context for synthesis - uses raw MarkdownDB content
  const buildContext = useCallback((): Record<string, string> => {
    // Use getLatestValue first, fallback to job.documents for race condition
    // when a new document is created but useImmediateSaveMulti hasn't synced yet
    const latestTemplate = getLatestValue(activeTab) || '';
    const template = latestTemplate || job.documents?.[activeTab]?.text || '';

    return {
      profile: userProfile || '',
      job: job.content || '',
      template,
      tone: tone,
      task: 'Follow the TEMPLATE and TONE and output only the final document.',
    };
  }, [
    job.content,
    job.documents,
    userProfile,
    activeTab,
    tone,
    getLatestValue,
  ]);

  // Handle synthesis using runTask()
  const handleSynthesize = useCallback(async () => {
    // Build context BEFORE showing progress message (otherwise getLatestValue returns progress text)
    const context = buildContext();

    // Start synthesis
    setIsSynthesizing(true);
    setSynthesisError(null);
    progressIndexRef.current = 0;
    hasReceivedContentRef.current = false;

    // Store original content for rollback on error
    originalContentRef.current = getLatestValue(activeTab) || '';

    // Create AbortController for cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Show initial progress message
    updateContent(activeTab, SYNTHESIS_PROGRESS_MESSAGES[0] + '\n\n');

    // Start progress message cycling
    progressIntervalRef.current = setInterval(() => {
      if (!hasReceivedContentRef.current) {
        const lastIndex = SYNTHESIS_PROGRESS_MESSAGES.length - 1;
        if (progressIndexRef.current < lastIndex) {
          progressIndexRef.current += 1;
          updateContent(
            activeTab,
            SYNTHESIS_PROGRESS_MESSAGES[progressIndexRef.current] + '\n\n'
          );
        } else {
          // At last message - clear interval to stop cycling
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
      }
    }, PROGRESS_MESSAGE_INTERVAL_MS);

    // Start keepalive to prevent service worker termination during synthesis
    const stopKeepalive = startKeepalive();

    try {
      // DEBUG: Log entire API call context
      console.info('[DraftingView] Synthesis API call:', {
        config: synthesis,
        context,
        model: selectedModel,
        maxTokens,
        temperature: savedTemperature,
        activeTab,
        jobDocuments: job.documents,
        getLatestValueResult: getLatestValue(activeTab),
      });

      // Run synthesis using runTask()
      const result = await runTask({
        config: synthesis,
        context,
        llmClient,
        model: selectedModel,
        maxTokens,
        temperature: savedTemperature,
        noThink: !thinkHarder,
        signal: abortController.signal,
        onThinking: (_delta: string) => {
          // Optional: could show thinking in a separate panel
        },
        onChunk: (delta: string) => {
          hasReceivedContentRef.current = true;
          // Clear progress interval when real content arrives
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }

          // Get current content and append delta
          const currentContent = getLatestValue(activeTab) || '';
          // If still showing progress message, replace it
          if (isProgressMessage(currentContent)) {
            updateContent(activeTab, delta);
          } else {
            updateContent(activeTab, currentContent + delta);
          }
        },
      });

      // Clear progress interval if still running
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // Handle cancellation
      if (result.cancelled) {
        console.info('[DraftingView] Synthesis was cancelled');
        updateContent(activeTab, originalContentRef.current);
        return;
      }

      // Check for truncation
      if (result.finishReason === 'length') {
        console.warn('[DraftingView] Response truncated due to token limit');
        showToast(
          `Warning: Response was truncated due to token limit (${maxTokens} tokens).`,
          'error'
        );
      }

      // Save the final content
      const finalContent = result.content || getLatestValue(activeTab) || '';
      updateContent(activeTab, finalContent);

      // Trigger save - preserve existing title
      const existingTitle = job.documents?.[activeTab]?.title;
      const docConfig =
        synthesis.documents[activeTab as keyof typeof synthesis.documents];
      const title =
        existingTitle ||
        docConfig?.defaultTitle(parsedJob.jobTitle, parsedJob.company) ||
        'Untitled';
      onSaveDocument(job.id, activeTab, {
        title,
        text: finalContent,
      });
      setSaveStatusText(`Last saved ${formatSaveTime(new Date())}`);

      showToast('Document synthesized successfully!', 'success');
    } catch (error) {
      console.error('[DraftingView] Synthesis failed:', error);

      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // Revert to original content
      updateContent(activeTab, originalContentRef.current);
      setSynthesisError((error as Error).message);
      showToast(`Synthesis failed: ${(error as Error).message}`, 'error');
    } finally {
      stopKeepalive();
      setIsSynthesizing(false);
      abortControllerRef.current = null;
      progressIndexRef.current = 0;
      hasReceivedContentRef.current = false;
    }
  }, [
    getLatestValue,
    activeTab,
    updateContent,
    buildContext,
    llmClient,
    selectedModel,
    maxTokens,
    savedTemperature,
    thinkHarder,
    parsedJob.jobTitle,
    parsedJob.company,
    onSaveDocument,
    job.id,
    job.documents,
  ]);

  // Cleanup on unmount - cancel synthesis and clear interval
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <>
      {/* Profile Required Overlay */}
      {!hasProfile && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-sm p-6 relative text-center">
            <User className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Profile Required
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Create a profile to start synthesizing tailored documents.
            </p>
            <p className="text-muted-foreground text-sm flex items-center justify-center gap-1">
              Click <Maximize2 className="h-4 w-4 inline" /> then{' '}
              <User className="h-4 w-4 inline" /> to get started.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full gap-4">
        {/* Drafting Editor */}
        <div className="flex-1 flex flex-col border border-border rounded-lg overflow-hidden bg-background">
          {/* Topbar with tabs and actions */}
          <EditorToolbar
            documentKeys={documentKeys}
            documentLabels={Object.fromEntries(
              documentKeys.map((key) => {
                const title = job.documents?.[key]?.title || 'Untitled';
                return [
                  key,
                  title.length > 8 ? title.slice(0, 8) + '...' : title,
                ];
              })
            )}
            activeTab={activeTab}
            onTabChange={switchTab}
            onAddDocument={() => setShowNewDocumentModal(true)}
            onDeleteDocument={handleDeleteRequest}
            onExport={handleExport}
          />

          {/* Editor wrapper */}
          <div className="flex-1 flex flex-col relative overflow-hidden">
            {documentKeys.length === 0 ? (
              <div className="flex flex-col p-4 gap-3">
                <StreamingTextarea
                  value=""
                  onChange={() => {}}
                  placeholder="Click + to create your first document"
                  disabled
                  minHeight="450px"
                  className="bg-muted text-muted-foreground"
                />
              </div>
            ) : (
              documentKeys.map((key) => {
                const config =
                  synthesis.documents[key as keyof typeof synthesis.documents];
                const isActive = key === activeTab;
                const placeholder = config
                  ? config.placeholder
                  : 'Write your document here...';

                return (
                  <EditorContentPanel
                    key={key}
                    documentKey={key}
                    isActive={isActive}
                    value={documentContents[key] || ''}
                    placeholder={placeholder}
                    textareaRef={getTabRef(key)}
                    onChange={(value) => handleTextareaChange(key, value)}
                    jobId={job.id}
                    disabled={isSynthesizing}
                  />
                );
              })
            )}
          </div>

          {/* Synthesis error display */}
          {synthesisError && (
            <div className="py-2 px-4 mx-4 mb-2 bg-destructive/10 border border-destructive/50 rounded text-destructive text-sm">
              <strong className="block mb-1">Synthesis Error:</strong>{' '}
              {synthesisError}
            </div>
          )}

          {/* Synthesis Footer (above EditorFooter) */}
          <SynthesisFooter
            tone={tone}
            onToneChange={setTone}
            onRefreshTone={handleRefreshTone}
            onSynthesize={handleSynthesize}
            onCancel={handleCancelSynthesis}
            isSynthesizing={isSynthesizing}
            disabled={documentKeys.length === 0}
          />

          {/* Footer with status and word count */}
          <EditorFooter saveStatus={saveStatusText} wordCount={wordCount} />
        </div>
      </div>

      {/* New Document Modal */}
      <NewDocumentModal
        isOpen={showNewDocumentModal}
        onClose={() => setShowNewDocumentModal(false)}
        onSelectTemplate={handleAddDocument}
      />

      {/* Delete Document Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDocumentToDelete(null);
        }}
        title="Delete Document"
      >
        <div className="p-6 flex-1 overflow-y-auto">
          <p>
            Are you sure you want to delete this document? This action cannot be
            undone.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-between items-center">
          <div className="flex gap-3 ml-auto">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDocumentToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
