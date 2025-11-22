import React, { useEffect, useMemo, useCallback } from 'react';
import { Checklist } from '../components/checklist';
import { Modal } from '../../../components/ui/Modal';
import { SynthesisForm } from '../components/SynthesisForm';
import { documentTemplates } from '../config';
import { parseJobTemplate } from '@/utils/job-parser';
import { escapeHtml } from '@/utils/shared-utils';
import { formatSaveTime } from '@/utils/date-utils';
import { markdownToHtml } from '@/utils/markdown-utils';
import { useAutoSave } from '../hooks/useAutoSave';
import { useTabState } from '../hooks/useTabState';
import { useToggleState } from '../hooks/useToggleState';
import { TabBar } from '@/components/ui/TabBar';
import { Dropdown } from '@/components/ui/Dropdown';

// Get browser global (works in WXT environment)
declare const browser: typeof chrome;

interface Job {
  content?: string;
  url: string;
  documents?: Record<string, Document>;
  checklist?: any;
  applicationStatus: string;
}

interface Document {
  title: string;
  text: string;
  lastEdited: string | null;
  order: number;
}

interface DraftingViewProps {
  job: Job;
  index: number;
  isChecklistExpanded?: boolean;
  onDeleteJob: (_index: number) => void;
  onSaveDocument: (
    _index: number,
    _documentKey: string,
    _documentData: { title: string; text: string }
  ) => void;
  onInitializeDocuments: (
    index: number,
    documents: Record<string, Document>
  ) => void;
  onToggleChecklistExpand: (index: number, isExpanded: boolean) => void;
  onToggleChecklistItem: (index: number, itemId: string) => void;
}

interface DefaultDocConfig {
  label: string;
  order: number;
  defaultTitle: () => string;
  placeholder: string;
}

export const DraftingView: React.FC<DraftingViewProps> = ({
  job,
  index,
  isChecklistExpanded = false,
  onDeleteJob,
  onSaveDocument,
  onInitializeDocuments,
  onToggleChecklistExpand,
  onToggleChecklistItem,
}) => {
  // Toggle states
  const [exportDropdownOpen, toggleExportDropdown, setExportDropdownOpen] =
    useToggleState(false);
  const [isSynthesisModalOpen, _toggleSynthesisModal, setIsSynthesisModalOpen] =
    useToggleState(false);
  const [wordCount, setWordCount] = React.useState<number>(0);

  // Parse job content on-read (MarkdownDB pattern)
  const parsedJob = useMemo(
    () => parseJobTemplate(job.content || ''),
    [job.content]
  );

  // Get document keys first (needed for hooks)
  const getDocumentKeys = (): string[] => {
    if (!job.documents) {
      return ['tailoredResume', 'coverLetter'];
    }

    return Object.keys(job.documents).sort((a, b) => {
      const orderA = job.documents![a]?.order ?? 999;
      const orderB = job.documents![b]?.order ?? 999;
      return orderA - orderB;
    });
  };

  const documentKeys = getDocumentKeys();

  // Tab state management
  const { activeTab, switchTab, getTabRef } = useTabState({
    initialTab: documentKeys[0] || 'tailoredResume',
  });

  // Auto-save hook
  const {
    documentContents,
    saveStatus,
    updateContent,
    markAsSaved,
    initializeContents,
    setSaveStatus,
  } = useAutoSave(documentKeys, {
    interval: 5000,
    onSave: (key, content) => {
      const defaultTitle = defaultDocuments[key]?.defaultTitle() || 'Untitled';
      onSaveDocument(index, key, {
        title: defaultTitle,
        text: content,
      });
      markAsSaved(key, content, `Last saved ${formatSaveTime(new Date())}`);
    },
    getTimestamp: () => `Last saved ${formatSaveTime(new Date())}`,
  });

  // Default document configuration
  const defaultDocuments: Record<string, DefaultDocConfig> = {
    tailoredResume: {
      label: 'Resume/CV',
      order: 0,
      defaultTitle: () =>
        `${parsedJob.jobTitle || 'Resume'} - ${parsedJob.company || 'Company'}`,
      placeholder:
        'Write your tailored resume here using Markdown formatting...\n\nExample:\n# Your Name\nemail@example.com | linkedin.com/in/yourprofile\n\n## Summary\nExperienced software engineer...',
    },
    coverLetter: {
      label: 'Cover Letter',
      order: 1,
      defaultTitle: () =>
        `Cover Letter - ${parsedJob.jobTitle || 'Position'} at ${parsedJob.company || 'Company'}`,
      placeholder:
        'Write your cover letter here using Markdown formatting...\n\nExample:\nDear Hiring Manager,\n\nI am writing to express my interest...',
    },
  };

  // Get document
  const getDocument = (documentKey: string): Document => {
    if (!job.documents) {
      return {
        title: defaultDocuments[documentKey]?.defaultTitle() || 'Untitled',
        text: '',
        lastEdited: null,
        order: defaultDocuments[documentKey]?.order || 0,
      };
    }

    if (job.documents[documentKey]) {
      return job.documents[documentKey];
    }

    const config = defaultDocuments[documentKey];
    return {
      title: config ? config.defaultTitle() : 'Untitled Document',
      text: '',
      lastEdited: null,
      order: config ? config.order : 0,
    };
  };

  // Initialize documents if needed
  useEffect(() => {
    if (!job.documents) {
      const newDocuments = {
        tailoredResume: {
          title: defaultDocuments.tailoredResume.defaultTitle(),
          text: documentTemplates.tailoredResume,
          lastEdited: null,
          order: 0,
        },
        coverLetter: {
          title: defaultDocuments.coverLetter.defaultTitle(),
          text: documentTemplates.coverLetter,
          lastEdited: null,
          order: 1,
        },
      };
      onInitializeDocuments(index, newDocuments);
    }
  }, []);

  // Initialize document contents from job
  useEffect(() => {
    const contents: Record<string, string> = {};

    documentKeys.forEach((key) => {
      const doc = getDocument(key);
      contents[key] = doc.text;
    });

    initializeContents(contents);
  }, [job.documents]);

  // Update word count when active tab changes or content changes
  useEffect(() => {
    const text = documentContents[activeTab] || '';
    const count = countWords(text);
    setWordCount(count);
  }, [activeTab, documentContents]);

  // Count words
  const countWords = (text: string): number => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  // Get initial save status
  const getInitialSaveStatus = (doc: Document): string => {
    if (!doc.lastEdited) {
      return 'No changes yet';
    }
    const lastEditedDate = new Date(doc.lastEdited);
    return `Last saved ${formatSaveTime(lastEditedDate)}`;
  };

  // Update save status on tab change
  useEffect(() => {
    const doc = getDocument(activeTab);
    setSaveStatus(getInitialSaveStatus(doc));
  }, [activeTab]);

  // Handle textarea change
  const handleTextareaChange = useCallback(
    (documentKey: string, value: string) => {
      updateContent(documentKey, value);
    },
    [updateContent]
  );

  // Handle textarea blur (immediate save)
  const handleTextareaBlur = useCallback(
    (documentKey: string) => {
      const currentText = documentContents[documentKey] || '';
      const defaultTitle =
        defaultDocuments[documentKey]?.defaultTitle() || 'Untitled';

      onSaveDocument(index, documentKey, {
        title: defaultTitle,
        text: currentText,
      });

      markAsSaved(
        documentKey,
        currentText,
        `Last saved ${formatSaveTime(new Date())}`
      );
    },
    [documentContents, index, onSaveDocument, markAsSaved]
  );

  // Handle export
  const handleExport = useCallback(
    (exportType: 'md' | 'pdf') => {
      const doc = getDocument(activeTab);

      if (exportType === 'md') {
        exportMarkdown(doc);
      } else if (exportType === 'pdf') {
        exportPDF(doc);
      }
    },
    [activeTab]
  );

  // Export as Markdown
  const exportMarkdown = (doc: Document) => {
    if (!doc.text || !doc.text.trim()) {
      showToast('Document is empty. Nothing to export.', 'error');
      return;
    }

    const blob = new Blob([doc.text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const filename = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;

    browser.downloads.download(
      {
        url: url,
        filename: filename,
        saveAs: true,
      },
      () => {
        if (browser.runtime.lastError) {
          console.error('Export failed:', browser.runtime.lastError);
          showToast(
            `Failed to export: ${browser.runtime.lastError.message}`,
            'error'
          );
        }
        URL.revokeObjectURL(url);
      }
    );
  };

  // Export as PDF (using print dialog)
  const exportPDF = (doc: Document) => {
    if (!doc.text || !doc.text.trim()) {
      showToast('Document is empty. Nothing to export.', 'error');
      return;
    }

    try {
      const printWindow = window.open('', '_blank');

      if (!printWindow) {
        showToast(
          'Failed to open print window. Please allow popups for this site.',
          'error'
        );
        return;
      }

      const htmlContent = markdownToHtml(doc.text);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${escapeHtml(doc.title)}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
            }
            h1 { font-size: 24px; margin-bottom: 10px; }
            h2 { font-size: 20px; margin-top: 20px; margin-bottom: 10px; }
            h3 { font-size: 16px; margin-top: 15px; margin-bottom: 8px; }
            p { margin-bottom: 10px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (error: any) {
      console.error('PDF export failed:', error);
      showToast(`Failed to export PDF: ${error.message}`, 'error');
    }
  };

  // Show toast notification
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

  return (
    <>
      <div className="job-card">
        <div className="detail-panel-content">
          {/* Job Header */}
          <div className="job-header">
            <div>
              <div className="job-title">
                {escapeHtml(parsedJob.jobTitle || '')}
              </div>
              <div className="company">
                {escapeHtml(parsedJob.company || '')}
              </div>
            </div>
            <div>
              <a
                href={escapeHtml(job.url)}
                className="badge badge-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Job Posting
              </a>
            </div>
          </div>

          {/* Drafting Editor */}
          <div className="drafting-editor-container">
            {/* Topbar with tabs and actions */}
            <div className="editor-topbar">
              <TabBar
                tabs={documentKeys.map((key) => ({
                  key,
                  label: defaultDocuments[key]?.label || key,
                }))}
                activeTab={activeTab}
                onTabChange={switchTab}
              />
              <div className="editor-actions">
                <button
                  className="btn-synthesize"
                  id="synthesizeBtn"
                  onClick={() => setIsSynthesisModalOpen(true)}
                >
                  ✨ Synthesize with LLM
                </button>
                <Dropdown
                  isOpen={exportDropdownOpen}
                  onToggle={toggleExportDropdown}
                  onClose={() => setExportDropdownOpen(false)}
                  buttonLabel="Export"
                  buttonIcon="📥"
                  items={[
                    {
                      label: 'Export as Markdown (.md)',
                      icon: '📄',
                      onClick: () => handleExport('md'),
                    },
                    {
                      label: 'Export as PDF (.pdf)',
                      icon: '📑',
                      onClick: () => handleExport('pdf'),
                    },
                  ]}
                  className="export-dropdown"
                />
              </div>
            </div>

            {/* Editor wrapper */}
            <div className="editor-wrapper">
              {documentKeys.map((key) => {
                const config = defaultDocuments[key];
                const isActive = key === activeTab;
                const placeholder = config
                  ? config.placeholder
                  : 'Write your document here...';

                return (
                  <div
                    key={key}
                    className={`editor-content ${isActive ? 'active' : ''}`}
                    data-content={key}
                  >
                    {/* Thinking panel (initially hidden) */}
                    <div className="thinking-stream-panel hidden">
                      <div className="thinking-header">
                        <span className="thinking-title">
                          🤔 AI Thinking Process
                        </span>
                        <button
                          className="thinking-toggle-btn"
                          title="Collapse"
                        >
                          ▼
                        </button>
                      </div>
                      <textarea className="thinking-content" readOnly />
                    </div>

                    {/* Document editor */}
                    <textarea
                      ref={getTabRef(key)}
                      className="document-editor"
                      data-field={`${key}-text`}
                      placeholder={escapeHtml(placeholder)}
                      data-index={index}
                      value={documentContents[key] || ''}
                      onChange={(e) =>
                        handleTextareaChange(key, e.target.value)
                      }
                      onBlur={() => handleTextareaBlur(key)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Footer with status and word count */}
            <div className="editor-footer">
              <div className="editor-status">
                <span
                  className="save-status-indicator visible saved"
                  id="saveStatus"
                >
                  {saveStatus}
                </span>
              </div>
              <div className="editor-meta">
                <span className="word-count" id="wordCount">
                  {wordCount} words
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist in sidebar */}
      <Checklist
        checklist={job.checklist}
        status={job.applicationStatus || 'drafting'}
        jobIndex={index}
        isExpanded={isChecklistExpanded}
        animate={false}
        onToggleExpand={onToggleChecklistExpand}
        onToggleItem={onToggleChecklistItem}
      />

      {/* Synthesis Modal */}
      <Modal
        isOpen={isSynthesisModalOpen}
        onClose={() => setIsSynthesisModalOpen(false)}
        title="✨ Synthesize Document with LLM"
      >
        <SynthesisForm
          job={job}
          jobIndex={index}
          documentKey={activeTab}
          onClose={() => setIsSynthesisModalOpen(false)}
          onGenerationStart={(jobIdx, docKey) => {
            // Show thinking panel with loading message
            console.info('Generation started for', docKey);
          }}
          onThinkingUpdate={(docKey, delta) => {
            // Update thinking panel
            console.info('Thinking update:', delta);
          }}
          onDocumentUpdate={(docKey, delta) => {
            // Update document content
            const currentContent = documentContents[docKey] || '';
            updateContent(docKey, currentContent + delta);
          }}
          onGenerate={(jobIdx, docKey, result) => {
            // Save generated content
            const generatedContent =
              result.content || documentContents[docKey] || '';
            updateContent(docKey, generatedContent);

            // Trigger immediate save
            const defaultTitle =
              defaultDocuments[docKey]?.defaultTitle() || 'Untitled';
            onSaveDocument(index, docKey, {
              title: defaultTitle,
              text: generatedContent,
            });
            markAsSaved(
              docKey,
              generatedContent,
              `Last saved ${formatSaveTime(new Date())}`
            );

            showToast('Document generated successfully!', 'success');
          }}
          onError={(jobIdx, docKey, error) => {
            console.error('Generation failed:', error);
            showToast(`Generation failed: ${error.message}`, 'error');
          }}
        />
      </Modal>
    </>
  );
};
