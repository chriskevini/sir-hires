import { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';
import { browser } from 'wxt/browser';

// Import WXT storage
import {
  userProfileStorage,
  profileTemplatePanelStorage,
  llmSettingsStorage,
} from '@/utils/storage';

// Import utilities
import { formatSaveTime } from '@/utils/date-utils';
import { exportMarkdown as exportMarkdownUtil } from '@/utils/export-utils';
import {
  setCursorAndScroll,
  findNextEntryId,
  findNextSectionPosition,
  applyFix as applyFixUtil,
} from '@/utils/profile-utils';
import { PROFILE_TEMPLATE, profileExtractionConfig } from '@/tasks';
import { UI_UPDATE_INTERVAL_MS } from '@/config';
import { LLMClient } from '@/utils/llm-client';
import { runTask, startKeepalive } from '@/utils/llm-task-runner';
import { DEFAULT_TASK_SETTINGS } from '@/utils/llm-utils';

// Import hooks
import {
  useProfileValidation,
  type ValidationFix,
} from './hooks/useProfileValidation';

// Import components
import {
  ValidationPanel,
  useValidationEditorClass,
} from './components/ValidationPanel';
import { Modal } from '@/components/ui/Modal';

// Constants
const PROGRESS_MESSAGE_INTERVAL_MS = 1000; // Cycle progress messages every 1 second

// Progress messages shown sequentially during extraction
const EXTRACTION_PROGRESS_MESSAGES = [
  '⏳ Starting extraction',
  '⏳ Starting extraction.',
  '⏳ Starting extraction..',
  '⏳ Starting extraction...',
  '🔍 Analyzing resume structure',
  '🔍 Analyzing resume structure.',
  '🔍 Analyzing resume structure..',
  '🔍 Analyzing resume structure...',
  '📝 Extracting contact information',
  '📝 Extracting contact information.',
  '📝 Extracting contact information..',
  '📝 Extracting contact information...',
  '🎓 Processing education history',
  '🎓 Processing education history.',
  '🎓 Processing education history..',
  '🎓 Processing education history...',
  '💼 Parsing work experience',
  '💼 Parsing work experience.',
  '💼 Parsing work experience..',
  '💼 Parsing work experience...',
  '🔧 Identifying skills and projects',
  '🔧 Identifying skills and projects.',
  '🔧 Identifying skills and projects..',
  '🔧 Identifying skills and projects...',
  '✨ Formatting profile data',
  '✨ Formatting profile data.',
  '✨ Formatting profile data..',
  '✨ Formatting profile data...',
  '⏳ Almost done',
  '⏳ Almost done.',
  '⏳ Almost done..',
  '⏳ Almost done...',
];

// Helper to check if text is a progress message
const isProgressMessage = (text: string): boolean =>
  EXTRACTION_PROGRESS_MESSAGES.some((msg) => text.startsWith(msg));

export default function App() {
  // State
  const [content, setContent] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isTemplatePanelVisible, setIsTemplatePanelVisible] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIndexRef = useRef<number>(0); // Track progress message index
  const originalContentRef = useRef<string>(''); // Store original before extraction
  const hasReceivedContentRef = useRef<boolean>(false); // Track if real content has started streaming
  const streamedContentRef = useRef<string>(''); // Accumulate streamed content synchronously

  // Immediate save callback - saves to storage on every change
  const saveProfile = useCallback(async (newContent: string) => {
    try {
      const profileData = {
        content: newContent,
        updatedAt: new Date().toISOString(),
      };

      await userProfileStorage.setValue(profileData);
      setLastSavedTime(profileData.updatedAt);

      // Also save to localStorage as backup
      localStorage.setItem('userProfileDraft', newContent);
    } catch (error) {
      console.error('Save error:', error);
      // Keep localStorage backup even if browser.storage fails
      localStorage.setItem('userProfileDraft', newContent);
    }
  }, []);

  // Content change handler - saves immediately when not extracting
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      // Save immediately if not extracting (progress messages are temporary)
      if (!isExtracting) {
        saveProfile(newContent);
      }
    },
    [isExtracting, saveProfile]
  );

  // Validation hook - disable during extraction to avoid performance issues
  const { validation, validationFixes, warningFixes } = useProfileValidation({
    content: isExtracting ? '' : content,
  });

  // Helper to save profile directly to storage (for use in extraction callbacks)
  const saveProfileToStorage = async (newContent: string) => {
    try {
      const profileData = {
        content: newContent,
        updatedAt: new Date().toISOString(),
      };
      await userProfileStorage.setValue(profileData);
      setLastSavedTime(profileData.updatedAt);
      localStorage.setItem('userProfileDraft', newContent);
    } catch (error) {
      console.error('Save error:', error);
      localStorage.setItem('userProfileDraft', newContent);
    }
  };

  // AbortController for extraction cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Progress message cycling during extraction (stops at last message)
  useEffect(() => {
    if (isExtracting && !hasReceivedContentRef.current) {
      progressIntervalRef.current = setInterval(() => {
        // Only update content if we haven't started receiving real content
        if (!hasReceivedContentRef.current) {
          const lastIndex = EXTRACTION_PROGRESS_MESSAGES.length - 1;
          // Stop cycling at the last message
          if (progressIndexRef.current < lastIndex) {
            progressIndexRef.current += 1;
            setContent(
              EXTRACTION_PROGRESS_MESSAGES[progressIndexRef.current] + '\n\n'
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
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isExtracting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load profile from storage on mount
  useEffect(() => {
    loadProfile();
    loadTemplatePanelPreference();
    startLastSavedInterval();

    return () => {
      if (lastSavedIntervalRef.current)
        clearInterval(lastSavedIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTemplatePanelPreference = async () => {
    const isVisible = await profileTemplatePanelStorage.getValue();
    setIsTemplatePanelVisible(isVisible);
  };

  const toggleTemplatePanel = (visible: boolean) => {
    setIsTemplatePanelVisible(visible);
    profileTemplatePanelStorage.setValue(visible);
  };

  const loadProfile = async () => {
    try {
      const userProfile = await userProfileStorage.getValue();

      if (userProfile && userProfile.content) {
        const profileContent = userProfile.content;
        const updatedAt = userProfile.updatedAt;

        setContent(profileContent);
        setLastSavedTime(updatedAt);
      } else {
        // Check for draft in localStorage
        const draft = localStorage.getItem('userProfileDraft');
        if (draft) {
          setContent(draft);
          setStatusMessage('Draft recovered');
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showStatusMessage('Error loading profile', 'error');
    }
  };

  const startLastSavedInterval = () => {
    lastSavedIntervalRef.current = setInterval(() => {
      // Trigger re-render to update last saved time display
      if (lastSavedTime) {
        setLastSavedTime(lastSavedTime);
      }
    }, UI_UPDATE_INTERVAL_MS);
  };

  const showStatusMessage = (message: string, type: 'success' | 'error') => {
    setStatusMessage(message);

    if (type === 'success') {
      setTimeout(() => {
        setStatusMessage('');
      }, 2000);
    }
  };

  const applyFix = (fix: ValidationFix, enumValue?: string) => {
    if (!editorRef.current) return;

    const currentContent = editorRef.current.value;
    const result = applyFixUtil(fix, currentContent, enumValue);

    if (result) {
      setCursorAndScroll(
        editorRef.current,
        result.newContent,
        result.cursorPosition
      );
      handleContentChange(result.newContent);
    }
  };

  const formatProfile = () => {
    if (!content.trim()) {
      showStatusMessage('Nothing to format', 'error');
      return;
    }

    const lines = content.split('\n');
    const formatted = [];

    for (let line of lines) {
      line = line.trimEnd();

      if (line.match(/^\s*[A-Z_]+:\s/)) {
        line = line.replace(/^(\s*)([A-Z_]+):\s+/, '$1$2: ');
      }

      if (line.match(/^#+\s+/)) {
        line = line.replace(/^(#+)\s+/, '$1 ');
      }

      formatted.push(line);
    }

    let newContent = formatted.join('\n');
    newContent = newContent.replace(/\n{3,}/g, '\n\n');
    newContent = newContent.replace(
      /^(\s*[A-Z_]+:.*)\n\n(\s*[A-Z_]+:)/gm,
      '$1\n$2'
    );
    newContent = newContent.replace(/^(\s*-.*)\n\n(\s*-)/gm, '$1\n$2');
    newContent = newContent.replace(/^(\s*[A-Z_]+:)\s*\n\n(\s*-)/gm, '$1\n$2');
    newContent = newContent.replace(
      /^(#+\s+[A-Z_]+)\s*\n\n(\s*[A-Z_]+:)/gm,
      '$1\n$2'
    );
    newContent = newContent.replace(
      /^(##\s+[A-Z0-9_]+)\s*\n\n(\s*[A-Z_]+:)/gm,
      '$1\n$2'
    );

    if (newContent !== content) {
      handleContentChange(newContent);
      showStatusMessage('Formatting fixed', 'success');
    } else {
      showStatusMessage('No formatting issues found', 'success');
    }
  };

  const exportMarkdown = () => {
    exportMarkdownUtil({ title: 'profile', text: content }, (message, type) =>
      showStatusMessage(message, type === 'info' ? 'success' : type)
    );
  };

  const exportText = async () => {
    if (!content.trim()) {
      showStatusMessage('Nothing to export', 'error');
      return;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `profile-${timestamp}.txt`;

    await browser.downloads.download({
      url: url,
      filename: filename,
      saveAs: true,
    });

    showStatusMessage('Exported as ' + filename, 'success');
  };

  const insertEducationTemplate = () => {
    const newId = findNextEntryId(content, 'EDU_');
    const template = `## EDU_${newId}
DEGREE: 
SCHOOL: 
LOCATION: 
START: 
END: 
`;

    const eduSectionMatch = content.match(/^#\s+EDUCATION\s*$/m);

    if (eduSectionMatch) {
      const sectionStart = eduSectionMatch.index! + eduSectionMatch[0].length;
      const insertPos = findNextSectionPosition(content, sectionStart);

      const newContent =
        content.slice(0, insertPos) +
        '\n' +
        template +
        '\n' +
        content.slice(insertPos);
      const cursorPos = insertPos + 1 + template.indexOf('DEGREE: ') + 8;

      if (editorRef.current) {
        setCursorAndScroll(editorRef.current, newContent, cursorPos);
        handleContentChange(newContent);
      }
    } else {
      const profileMatch = content.match(/^<PROFILE>\s*$/m);
      let insertPos = 0;

      if (profileMatch) {
        const afterProfile = profileMatch.index! + profileMatch[0].length;
        insertPos = findNextSectionPosition(content, afterProfile);
      } else {
        insertPos = content.length;
      }

      const sectionTemplate = `\n# EDUCATION\n${template}`;
      const newContent =
        content.slice(0, insertPos) +
        sectionTemplate +
        '\n' +
        content.slice(insertPos);
      const cursorPos = insertPos + sectionTemplate.indexOf('DEGREE: ') + 8;

      if (editorRef.current) {
        setCursorAndScroll(editorRef.current, newContent, cursorPos);
        handleContentChange(newContent);
      }
    }
  };

  const insertExperienceTemplate = () => {
    const newId = findNextEntryId(content, 'EXP_');
    const template = `## EXP_${newId}
TYPE: PROFESSIONAL
TITLE: 
AT: 
START: 
END: 
BULLETS:
- 
`;

    const expSectionMatch = content.match(/^#\s+EXPERIENCE\s*$/m);

    if (expSectionMatch) {
      const sectionStart = expSectionMatch.index! + expSectionMatch[0].length;
      const insertPos = findNextSectionPosition(content, sectionStart);

      const newContent =
        content.slice(0, insertPos) +
        '\n' +
        template +
        '\n' +
        content.slice(insertPos);
      const cursorPos = insertPos + 1 + template.indexOf('TITLE: ') + 7;

      if (editorRef.current) {
        setCursorAndScroll(editorRef.current, newContent, cursorPos);
        handleContentChange(newContent);
      }
    } else {
      const eduSectionMatch = content.match(/^#\s+EDUCATION\s*$/m);
      let insertPos = 0;

      if (eduSectionMatch) {
        const sectionStart = eduSectionMatch.index!;
        const restContent = content.slice(sectionStart);
        const nextSectionMatch = restContent.match(/^#\s+(?!EDUCATION)\w+/m);

        if (nextSectionMatch) {
          insertPos = sectionStart + nextSectionMatch.index!;
        } else {
          insertPos = content.length;
        }
      } else {
        const profileMatch = content.match(/^<PROFILE>\s*$/m);

        if (profileMatch) {
          const afterProfile = profileMatch.index! + profileMatch[0].length;
          insertPos = findNextSectionPosition(content, afterProfile);
        } else {
          insertPos = content.length;
        }
      }

      const sectionTemplate = `\n# EXPERIENCE\n${template}`;
      const newContent =
        content.slice(0, insertPos) +
        sectionTemplate +
        '\n' +
        content.slice(insertPos);
      const cursorPos = insertPos + sectionTemplate.indexOf('TITLE: ') + 7;

      if (editorRef.current) {
        setCursorAndScroll(editorRef.current, newContent, cursorPos);
        handleContentChange(newContent);
      }
    }
  };

  const goBack = () => {
    window.location.href = browser.runtime.getURL('/job-details.html');
  };

  const handleExtractClick = () => {
    if (isExtracting) {
      handleCancelExtraction();
    } else {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmExtraction = async () => {
    setShowConfirmDialog(false);

    const pastedText = content.trim();
    if (!pastedText) {
      setExtractionError('Please paste resume text first');
      return;
    }

    // Initialize extraction state
    setIsExtracting(true);
    setExtractionError(null);
    progressIndexRef.current = 0;
    hasReceivedContentRef.current = false;
    // Capture content from editorRef to avoid stale closure
    originalContentRef.current = editorRef.current?.value || '';
    // Hide template during extraction and persist preference
    setIsTemplatePanelVisible(false);
    profileTemplatePanelStorage.setValue(false);
    setStatusMessage(''); // Clear header status - progress shown in editor
    setContent(EXTRACTION_PROGRESS_MESSAGES[0] + '\n\n'); // Initial progress message

    // Reset streamed content ref for new extraction
    streamedContentRef.current = '';

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Start keepalive to prevent service worker termination
    const stopKeepalive = startKeepalive();

    try {
      const llmSettings = await llmSettingsStorage.getValue();

      if (!llmSettings?.endpoint || llmSettings.endpoint.trim() === '') {
        throw new Error(
          '⚠️ LLM endpoint not configured. Please configure settings in the popup first.'
        );
      }

      // Calculate dynamic max tokens (~1.5x input length)
      // Rough estimate: 1 token ≈ 4 characters
      const estimatedInputTokens = Math.ceil(pastedText.length / 4);
      const dynamicMaxTokens = Math.ceil(estimatedInputTokens * 1.5);
      // Cap at reasonable maximum (4000 tokens)
      const maxTokens = Math.min(dynamicMaxTokens, 4000);

      console.info(
        `[Profile] Input length: ${pastedText.length} chars, estimated tokens: ${estimatedInputTokens}, max tokens: ${maxTokens}`
      );

      // Initialize LLM client
      const llmClient = new LLMClient({
        endpoint: llmSettings.endpoint,
        modelsEndpoint: llmSettings.modelsEndpoint,
      });

      // Get task-specific settings (use extraction settings)
      const extractionTemperature =
        llmSettings.tasks?.extraction?.temperature ??
        DEFAULT_TASK_SETTINGS.extraction.temperature;

      // Run extraction task
      const result = await runTask({
        config: profileExtractionConfig,
        context: { rawText: pastedText },
        llmClient,
        model: llmSettings.model || '',
        maxTokens,
        temperature: extractionTemperature,
        signal: abortControllerRef.current.signal,
        onChunk: (delta) => {
          hasReceivedContentRef.current = true;
          // Clear progress interval immediately when real content arrives
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }

          // Accumulate in ref synchronously (never loses chunks)
          streamedContentRef.current += delta;
          // Update React state from ref (complete value, not delta)
          setContent(streamedContentRef.current);
        },
      });

      // Check if cancelled
      if (result.cancelled) {
        console.info('[Profile] Extraction cancelled');
        // Clear progress interval if still running
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        // Keep whatever was streamed (don't revert to original)
        setContent((prev) => {
          // If still showing progress message, revert to original
          if (isProgressMessage(prev)) {
            return originalContentRef.current;
          }
          // Otherwise keep the streamed content as-is and save it
          if (prev && !isProgressMessage(prev)) {
            saveProfileToStorage(prev);
          }
          return prev;
        });
        setIsExtracting(false);
        progressIndexRef.current = 0;
        hasReceivedContentRef.current = false;
        setStatusMessage('Extraction cancelled - content preserved');
        setTimeout(() => setStatusMessage(''), 3000);
        return;
      }

      // Handle completion
      console.info('[Profile] Extraction complete');
      // Ensure progress interval is cleared
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setContent(result.content);
      setIsExtracting(false);
      progressIndexRef.current = 0;
      hasReceivedContentRef.current = false;
      setStatusMessage('✅ Profile extracted successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
      // Save extracted content
      saveProfileToStorage(result.content);
    } catch (error) {
      console.error('[Profile] Extraction failed:', error);
      // Clear progress interval if still running
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setContent(originalContentRef.current); // REVERT to original
      setIsExtracting(false);
      progressIndexRef.current = 0;
      hasReceivedContentRef.current = false;
      setExtractionError((error as Error).message);
      setStatusMessage('');
    } finally {
      stopKeepalive();
      abortControllerRef.current = null;
    }
  };

  const handleCancelExtraction = () => {
    if (abortControllerRef.current) {
      console.info('[Profile] Cancelling extraction via AbortController');
      abortControllerRef.current.abort();
    }
  };

  // Compute editor className based on validation state
  const editorClassName = useValidationEditorClass(validation, content);

  return (
    <div className="container">
      <header>
        <div className="header-left">
          <button onClick={goBack} className="btn-back">
            ← Back to Jobs
          </button>
          <h1>Profile</h1>
        </div>
        <div className="header-right">
          <span
            className={
              statusMessage ? 'last-saved unsaved-indicator' : 'last-saved'
            }
          >
            {statusMessage ||
              (lastSavedTime
                ? `Last saved: ${formatSaveTime(new Date(lastSavedTime))}`
                : '')}
          </span>
        </div>
      </header>

      <div className="editor-container">
        {/* Left Panel: Template Guide */}
        <div
          id="templatePanel"
          className={`template-panel ${isTemplatePanelVisible ? '' : 'hidden'}`}
        >
          <div className="template-panel-header">
            <h3>📖 Profile Template</h3>
            <button
              onClick={() => toggleTemplatePanel(false)}
              className="template-panel-close"
              title="Hide template"
            >
              ✕
            </button>
          </div>
          <div className="template-content">{PROFILE_TEMPLATE}</div>
        </div>

        {/* Right Panel: Editor */}
        <div className="editor-panel">
          <div className="editor-wrapper">
            <textarea
              ref={editorRef}
              id="profileEditor"
              className={editorClassName}
              placeholder="Follow the template on the left or paste your resume here and click extract with LLM."
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              disabled={isExtracting}
            />
          </div>
          {extractionError && (
            <div className="extraction-error">
              <strong>❌ Extraction Error:</strong> {extractionError}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Modal
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title="Confirm Extraction"
      >
        <div className="modal-body">
          <div className="modal-warning">
            <span className="modal-warning-icon">⚠️</span>
            <div className="modal-warning-content">
              <p>
                LLM extraction may have errors. The current content will be
                replaced. Save a backup first if needed.
              </p>
            </div>
          </div>
          <div className="modal-hint">
            <span className="modal-hint-icon">💡</span>
            <div className="modal-hint-content">
              <p>
                <strong>Tip:</strong> Label your projects clearly in your resume
                (e.g., &quot;Project: MyApp&quot;) - the LLM may not recognize
                unlabeled projects.
              </p>
            </div>
          </div>
          <div className="modal-actions">
            <button
              onClick={() => setShowConfirmDialog(false)}
              className="modal-btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmExtraction}
              className="modal-btn-primary"
            >
              Continue with Extraction
            </button>
          </div>
        </div>
      </Modal>

      {/* Validation Panel */}
      <ValidationPanel
        validation={validation}
        validationFixes={validationFixes}
        warningFixes={warningFixes}
        onApplyFix={applyFix}
        onInsertEducation={insertEducationTemplate}
        onInsertExperience={insertExperienceTemplate}
        showQuickActions={true}
      />

      <footer>
        <button
          onClick={() => toggleTemplatePanel(!isTemplatePanelVisible)}
          className="template-guide-show"
        >
          📖 Toggle Template
        </button>
        <button
          onClick={handleExtractClick}
          className={isExtracting ? 'btn-cancel-extraction' : 'btn-extract'}
          disabled={isExtracting && !content.trim()}
        >
          {isExtracting ? '❌ Cancel Extraction' : '✨ Extract with LLM'}
        </button>
        <div className="export-buttons">
          <button onClick={formatProfile} className="btn-export">
            Fix Formatting
          </button>
          <button onClick={exportMarkdown} className="btn-export">
            Export .md
          </button>
          <button onClick={exportText} className="btn-export">
            Export .txt
          </button>
        </div>
      </footer>
    </div>
  );
}
