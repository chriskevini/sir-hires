import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { SynthesisForm } from '../components/SynthesisForm';
import { EditorToolbar } from '@/components/ui/EditorToolbar';
import { EditorContentPanel } from '@/components/ui/EditorContentPanel';
import { EditorFooter } from '@/components/ui/EditorFooter';
import { JobViewOverlay } from '@/components/features/JobViewOverlay';
import { useParsedJob } from '@/components/features/ParsedJobProvider';
import { getJobTitle, getCompanyName } from '@/utils/job-parser';
import { escapeHtml } from '@/utils/shared-utils';
import { formatSaveTime } from '@/utils/date-utils';
import { defaultDocuments } from '@/utils/document-config';
import { countWords } from '@/utils/text-utils';
import { exportMarkdown, exportPDF } from '@/utils/export-utils';
import { useAutoSaveMulti } from '@/hooks/useAutoSave';
import { useTabState } from '../hooks/useTabState';
import { useToggleState } from '../hooks/useToggleState';
import { useDocumentManager } from '../hooks/useDocumentManager';
import type { Job } from '../hooks';
import './DraftingView.css';

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
  onSaveField: (index: number, fieldName: string, value: string) => void;
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
  hideOverlay?: boolean;
}

export const DraftingView: React.FC<DraftingViewProps> = ({
  job,
  index,
  isChecklistExpanded = false,
  onDeleteJob: _onDeleteJob,
  onSaveField,
  onSaveDocument,
  onInitializeDocuments,
  onToggleChecklistExpand,
  onToggleChecklistItem,
  hideOverlay = false,
}) => {
  // Toggle states
  const [exportDropdownOpen, toggleExportDropdown, setExportDropdownOpen] =
    useToggleState(false);
  const [isSynthesisModalOpen, _toggleSynthesisModal, setIsSynthesisModalOpen] =
    useToggleState(false);
  const [wordCount, setWordCount] = React.useState<number>(0);

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
  const { documentKeys, getDocument } = useDocumentManager({
    job,
    jobIndex: index,
    parsedJob,
    onInitializeDocuments,
  });

  // Tab state management
  const { activeTab, switchTab, getTabRef } = useTabState({
    initialTab: documentKeys[0] || 'tailoredResume',
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

  // Auto-save hook (multi-value mode)
  const {
    values: documentContents,
    setValue: updateContent,
    getLatestValue,
    flush,
  } = useAutoSaveMulti({
    initialValues: initialDocumentValues,
    onSave: (key: string, content: string) => {
      const defaultTitle =
        defaultDocuments[key]?.defaultTitle(
          parsedJob.jobTitle,
          parsedJob.company
        ) || 'Untitled';
      onSaveDocument(index, key, {
        title: defaultTitle,
        text: content,
      });
      setSaveStatusText(`Last saved ${formatSaveTime(new Date())}`);
    },
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

  // Handle textarea blur (immediate save via flush)
  // Uses the hook's flush() to avoid double-saving
  const handleTextareaBlur = useCallback(() => {
    flush();
  }, [flush]);

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
      <div className="drafting-view">
        {/* Job Header */}
        <div className="job-header">
          <div>
            <div className="job-title">
              {escapeHtml(parsedJob.jobTitle || '')}
            </div>
            <div className="company">{escapeHtml(parsedJob.company || '')}</div>
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
          <EditorToolbar
            documentKeys={documentKeys}
            documentLabels={Object.fromEntries(
              documentKeys.map((key) => [
                key,
                defaultDocuments[key]?.label || key,
              ])
            )}
            activeTab={activeTab}
            exportDropdownOpen={exportDropdownOpen}
            onTabChange={switchTab}
            onToggleExportDropdown={toggleExportDropdown}
            onCloseExportDropdown={() => setExportDropdownOpen(false)}
            onExport={handleExport}
            onSynthesizeClick={() => setIsSynthesisModalOpen(true)}
          />

          {/* Editor wrapper */}
          <div className="editor-wrapper">
            {documentKeys.map((key) => {
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
                  onBlur={handleTextareaBlur}
                  index={index}
                />
              );
            })}
          </div>

          {/* Footer with status and word count */}
          <EditorFooter saveStatus={saveStatusText} wordCount={wordCount} />
        </div>
      </div>

      {/* Overlay container for Checklist and Navigation */}
      <JobViewOverlay
        job={job}
        jobIndex={index}
        isChecklistExpanded={isChecklistExpanded}
        onSaveField={onSaveField}
        onToggleChecklistExpand={onToggleChecklistExpand}
        onToggleChecklistItem={onToggleChecklistItem}
        hidden={hideOverlay}
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
            // Use getLatestValue to avoid stale closure during streaming
            const currentContent = getLatestValue(docKey);
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
            setSaveStatusText(`Last saved ${formatSaveTime(new Date())}`);

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
