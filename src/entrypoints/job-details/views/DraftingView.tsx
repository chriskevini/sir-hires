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
} from '@/components/ui/NewDocumentModal';
import { EditorToolbar } from '@/components/ui/EditorToolbar';
import { EditorContentPanel } from '@/components/ui/EditorContentPanel';
import { EditorFooter } from '@/components/ui/EditorFooter';
import {
  SynthesisFooter,
  getRandomTone,
} from '@/components/ui/SynthesisFooter';
import { useParsedJob } from '@/components/features/ParsedJobProvider';
import { getJobTitle, getCompanyName } from '@/utils/job-parser';
import { formatSaveTime } from '@/utils/date-utils';
import { defaultDocuments, synthesisConfig } from '@/tasks';
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
import type { Job } from '../hooks';
import './DraftingView.css';

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
  const [showProfileWarning, setShowProfileWarning] = useState(false);
  const [userProfile, setUserProfile] = useState('');

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
      // Preserve existing title, fallback to defaultDocuments lookup for known template keys
      const existingTitle = job.documents?.[key]?.title;
      const title =
        existingTitle ||
        defaultDocuments[key]?.defaultTitle(
          parsedJob.jobTitle,
          parsedJob.company
        ) ||
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
    return {
      profile: userProfile || '',
      job: job.content || '',
      template: getLatestValue(activeTab) || '',
      tone: tone,
      task: 'Follow the TEMPLATE and TONE and output only the final document.',
    };
  }, [job.content, userProfile, activeTab, tone, getLatestValue]);

  // Handle synthesis using runTask()
  const handleSynthesize = useCallback(async () => {
    // Check if profile is valid
    if (!userProfile || userProfile.trim().length === 0) {
      setShowProfileWarning(true);
      return;
    }

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
      // Build context
      const context = buildContext();

      // Run synthesis using runTask()
      const result = await runTask({
        config: synthesisConfig,
        context,
        llmClient,
        model: selectedModel,
        maxTokens,
        temperature: savedTemperature,
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
      const title =
        existingTitle ||
        defaultDocuments[activeTab]?.defaultTitle(
          parsedJob.jobTitle,
          parsedJob.company
        ) ||
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
    userProfile,
    getLatestValue,
    activeTab,
    updateContent,
    buildContext,
    llmClient,
    selectedModel,
    maxTokens,
    savedTemperature,
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
      <div className="drafting-view">
        {/* Drafting Editor */}
        <div className="drafting-editor-container">
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
          <div className="editor-wrapper">
            {documentKeys.length === 0 ? (
              <div className="editor-content active">
                <textarea
                  className="document-editor"
                  placeholder="Click + to create your first document"
                  disabled
                />
              </div>
            ) : (
              documentKeys.map((key) => {
                const config = defaultDocuments[key];
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
            <div className="synthesis-error">
              <strong>Synthesis Error:</strong> {synthesisError}
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

      {/* Profile Warning Modal */}
      <Modal
        isOpen={showProfileWarning}
        onClose={() => setShowProfileWarning(false)}
        title="Profile Required"
      >
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <p>
            <strong>
              Please create a profile before synthesizing documents.
            </strong>
          </p>
          <p>
            Your profile contains your resume information which is used to
            generate tailored documents for this job.
          </p>
          <Button
            variant="primary"
            style={{ marginTop: '16px' }}
            onClick={() => {
              browser.tabs.create({
                url: browser.runtime.getURL('/profile.html'),
              });
              window.close();
            }}
          >
            Create Profile
          </Button>
        </div>

        <div className="modal-footer">
          <Button
            variant="subtle"
            style={{ marginLeft: 'auto' }}
            onClick={() => setShowProfileWarning(false)}
          >
            Cancel
          </Button>
        </div>
      </Modal>

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
        <div className="modal-body">
          <p>
            Are you sure you want to delete this document? This action cannot be
            undone.
          </p>
        </div>
        <div className="modal-footer">
          <div className="action-buttons-group" style={{ marginLeft: 'auto' }}>
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
