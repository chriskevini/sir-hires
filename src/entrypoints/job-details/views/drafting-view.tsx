import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Checklist } from '../components/checklist';
import { Modal } from '../../../components/ui/Modal';
import { SynthesisForm } from '../components/SynthesisForm';
import { documentTemplates } from '../config';

// Get browser global (works in WXT environment)
declare const browser: typeof chrome;

interface Job {
  jobTitle?: string;
  company?: string;
  url?: string;
  source?: string;
  documents?: Record<string, Document>;
  checklist?: any;
  applicationStatus?: string;
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
  onDeleteJob: (index: number) => void;
  onSaveDocument: (
    index: number,
    documentKey: string,
    documentData: { title: string; text: string }
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
  defaultTitle: (job: Job) => string;
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
  const [activeTab, setActiveTab] = useState('tailoredResume');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [isSynthesisModalOpen, setIsSynthesisModalOpen] = useState(false);
  const [documentContents, setDocumentContents] = useState<
    Record<string, string>
  >({});
  const [lastSavedContent, setLastSavedContent] = useState<
    Record<string, string>
  >({});
  const [saveStatus, setSaveStatus] = useState<string>('No changes yet');
  const [wordCount, setWordCount] = useState<number>(0);

  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Default document configuration
  const defaultDocuments: Record<string, DefaultDocConfig> = {
    tailoredResume: {
      label: 'Resume/CV',
      order: 0,
      defaultTitle: (job) =>
        `${job.jobTitle || 'Resume'} - ${job.company || 'Company'}`,
      placeholder:
        'Write your tailored resume here using Markdown formatting...\n\nExample:\n# Your Name\nemail@example.com | linkedin.com/in/yourprofile\n\n## Summary\nExperienced software engineer...',
    },
    coverLetter: {
      label: 'Cover Letter',
      order: 1,
      defaultTitle: (job) =>
        `Cover Letter - ${job.jobTitle || 'Position'} at ${job.company || 'Company'}`,
      placeholder:
        'Write your cover letter here using Markdown formatting...\n\nExample:\nDear Hiring Manager,\n\nI am writing to express my interest...',
    },
  };

  // Escape HTML utility
  const escapeHtml = (text: string): string => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Get document
  const getDocument = (documentKey: string): Document => {
    if (!job.documents) {
      return {
        title: defaultDocuments[documentKey]?.defaultTitle(job) || 'Untitled',
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
      title: config ? config.defaultTitle(job) : 'Untitled Document',
      text: '',
      lastEdited: null,
      order: config ? config.order : 0,
    };
  };

  // Get sorted document keys
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

  // Initialize documents if needed
  useEffect(() => {
    if (!job.documents) {
      const newDocuments = {
        tailoredResume: {
          title: defaultDocuments.tailoredResume.defaultTitle(job),
          text: documentTemplates.tailoredResume,
          lastEdited: null,
          order: 0,
        },
        coverLetter: {
          title: defaultDocuments.coverLetter.defaultTitle(job),
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
    const keys = getDocumentKeys();
    const contents: Record<string, string> = {};
    const saved: Record<string, string> = {};

    keys.forEach((key) => {
      const doc = getDocument(key);
      contents[key] = doc.text;
      saved[key] = doc.text;
    });

    setDocumentContents(contents);
    setLastSavedContent(saved);
  }, [job.documents]);

  // Update word count when active tab changes or content changes
  useEffect(() => {
    const text = documentContents[activeTab] || '';
    const count = countWords(text);
    setWordCount(count);
  }, [activeTab, documentContents]);

  // Auto-save interval (every 5 seconds)
  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      performAutoSave();
    }, 5000);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [documentContents, lastSavedContent]);

  // Count words
  const countWords = (text: string): number => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  // Format save time
  const formatSaveTime = (date: Date): string => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const dateStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const daysDiff = Math.floor(
      (todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 0) {
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `at ${displayHours}:${minutes} ${ampm}`;
    } else if (daysDiff === 1) {
      return '1 day ago';
    } else if (daysDiff < 7) {
      return `${daysDiff} days ago`;
    } else if (daysDiff < 14) {
      return '1 week ago';
    } else if (daysDiff < 30) {
      const weeks = Math.floor(daysDiff / 7);
      return `${weeks} weeks ago`;
    } else if (daysDiff < 60) {
      return '1 month ago';
    } else {
      const months = Math.floor(daysDiff / 30);
      return `${months} months ago`;
    }
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

  // Perform auto-save
  const performAutoSave = () => {
    const keys = getDocumentKeys();
    let hasChanges = false;

    keys.forEach((key) => {
      const currentText = documentContents[key] || '';
      const lastSaved = lastSavedContent[key] || '';

      if (currentText !== lastSaved) {
        saveDocumentImmediately(key, currentText);
        hasChanges = true;
      }
    });
  };

  // Save document immediately
  const saveDocumentImmediately = (documentKey: string, text: string) => {
    const defaultTitle =
      defaultDocuments[documentKey]?.defaultTitle(job) || 'Untitled';
    const now = new Date().toISOString();

    onSaveDocument(index, documentKey, {
      title: defaultTitle,
      text: text,
    });

    setLastSavedContent((prev) => ({
      ...prev,
      [documentKey]: text,
    }));

    if (documentKey === activeTab) {
      setSaveStatus(`Last saved ${formatSaveTime(new Date())}`);
    }
  };

  // Handle textarea change
  const handleTextareaChange = useCallback(
    (documentKey: string, value: string) => {
      setDocumentContents((prev) => ({
        ...prev,
        [documentKey]: value,
      }));
    },
    []
  );

  // Handle textarea blur (immediate save)
  const handleTextareaBlur = useCallback(
    (documentKey: string) => {
      const currentText = documentContents[documentKey] || '';
      const lastSaved = lastSavedContent[documentKey] || '';

      if (currentText !== lastSaved) {
        saveDocumentImmediately(documentKey, currentText);
      }
    },
    [documentContents, lastSavedContent]
  );

  // Handle tab switch
  const handleTabSwitch = useCallback((newTabKey: string) => {
    setActiveTab(newTabKey);
    // Focus the textarea after tab switch
    setTimeout(() => {
      const textarea = textareaRefs.current[newTabKey];
      if (textarea) textarea.focus();
    }, 0);
  }, []);

  // Handle export
  const handleExport = useCallback(
    (exportType: 'md' | 'pdf') => {
      const doc = getDocument(activeTab);

      if (exportType === 'md') {
        exportMarkdown(doc);
      } else if (exportType === 'pdf') {
        exportPDF(doc);
      }

      setExportDropdownOpen(false);
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

  // Simple markdown to HTML conversion
  const markdownToHtml = (text: string): string => {
    if (!text) return '';
    let html = escapeHtml(text);
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    if (html.trim()) {
      html = `<p>${html}</p>`;
    }
    return html;
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

  // Handle close export dropdown on outside click
  useEffect(() => {
    if (!exportDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.export-dropdown')) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [exportDropdownOpen]);

  const documentKeys = getDocumentKeys();

  return (
    <>
      <div className="job-card">
        <div className="detail-panel-content">
          {/* Job Header */}
          <div className="job-header">
            <div>
              <div className="job-title">{escapeHtml(job.jobTitle || '')}</div>
              <div className="company">{escapeHtml(job.company || '')}</div>
            </div>
            <div>
              {job.source && job.url ? (
                <a
                  href={escapeHtml(job.url)}
                  className="badge badge-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {escapeHtml(job.source)}
                </a>
              ) : job.source ? (
                <span className="badge">{escapeHtml(job.source)}</span>
              ) : null}
            </div>
          </div>

          {/* Drafting Editor */}
          <div className="drafting-editor-container">
            {/* Topbar with tabs and actions */}
            <div className="editor-topbar">
              <div className="tab-container">
                {documentKeys.map((key) => {
                  const config = defaultDocuments[key];
                  const label = config ? config.label : key;
                  const isActive = key === activeTab;

                  return (
                    <button
                      key={key}
                      className={`tab-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleTabSwitch(key)}
                    >
                      {escapeHtml(label)}
                    </button>
                  );
                })}
              </div>
              <div className="editor-actions">
                <button
                  className="btn-synthesize"
                  id="synthesizeBtn"
                  onClick={() => setIsSynthesisModalOpen(true)}
                >
                  ✨ Synthesize with LLM
                </button>
                <div className="dropdown-container export-dropdown">
                  <button
                    className="btn-dropdown"
                    id="exportDropdownBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExportDropdownOpen(!exportDropdownOpen);
                    }}
                  >
                    📥 Export ▼
                  </button>
                  <div
                    className={`dropdown-menu ${exportDropdownOpen ? '' : 'hidden'}`}
                    id="exportDropdownMenu"
                  >
                    <button
                      className="dropdown-item"
                      onClick={() => handleExport('md')}
                    >
                      📄 Export as Markdown (.md)
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => handleExport('pdf')}
                    >
                      📑 Export as PDF (.pdf)
                    </button>
                  </div>
                </div>
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
                      ref={(el) => (textareaRefs.current[key] = el)}
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
            setDocumentContents((prev) => ({
              ...prev,
              [docKey]: (prev[docKey] || '') + delta,
            }));
          }}
          onGenerate={(jobIdx, docKey, result) => {
            // Save generated content
            const generatedContent =
              result.content || documentContents[docKey] || '';
            saveDocumentImmediately(docKey, generatedContent);
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
