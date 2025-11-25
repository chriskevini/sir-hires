import { useState, useEffect, useRef, useMemo } from 'react';
import './styles.css';
import { browser } from 'wxt/browser';

// Import WXT storage
import {
  userProfileStorage,
  profileTemplatePanelStorage,
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
import { UI_UPDATE_INTERVAL_MS } from '@/config';

// Import hooks
import {
  useProfileValidation,
  type ValidationFix,
} from './hooks/useProfileValidation';
import { useProfileExtraction } from './hooks/useProfileExtraction';

// Import components
import {
  ValidationPanel,
  useValidationEditorClass,
} from './components/ValidationPanel';
import { Modal } from '@/components/ui/Modal';

// Constants
const AUTO_SAVE_INTERVAL = 3000; // 3 seconds
const PROGRESS_MESSAGE_INTERVAL_MS = 1000; // Cycle progress messages every 1 seconds

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

const TEMPLATE_TEXT = `<PROFILE>
NAME: Place Holder // required
ADDRESS: 123 Main Street, Anytown, CA 45678
EMAIL: name@email.com
// ex: PHONE, WEBSITE, GITHUB

# EDUCATION
## EDU_1
DEGREE: Master of Science in Computer Science // required
SCHOOL: University of Helsinki // required
LOCATION: Helsinki, Finland
START: September 1988
END: March 1997
// ex: GPA

# EXPERIENCE
## EXP_1
TYPE: PROFESSIONAL // required [PROFESSIONAL|PROJECT|VOLUNTEER]
TITLE: Senior Developer // required
AT: Tech Solutions Inc.
START: October 2020
END: ONGOING
BULLETS:
- Built API...
- Led team...

## EXP_2
TYPE: PROJECT // required [PROFESSIONAL|PROJECT|VOLUNTEER]
TITLE: Linux Kernel // required
BULLETS:
- Architected kernel...
- Integrated Rust...

## EXP_3
TYPE: VOLUNTEER // required [PROFESSIONAL|PROJECT|VOLUNTEER]
TITLE: Community Volunteer // required
AT: Local Non-Profit
BULLETS:
- Supported educational...
- Helped organize...

# INTERESTS:
- Scuba diving
- Reading
// ex: # CERTIFICATIONS:`;

export default function App() {
  // State
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isTemplatePanelVisible, setIsTemplatePanelVisible] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIndexRef = useRef<number>(0); // Track progress message index
  const originalContentRef = useRef<string>(''); // Store original before extraction
  const hasReceivedContentRef = useRef<boolean>(false); // Track if real content has started streaming

  // Validation hook - disable during extraction to avoid performance issues
  const { validation, validationFixes } = useProfileValidation({
    content: isExtracting ? '' : content,
  });

  // Profile extraction hook - memoize callbacks to prevent infinite re-renders
  const extractionCallbacks = useMemo(
    () => ({
      onExtractionStarted: () => {
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
      },
      onChunkReceived: (chunk: string) => {
        hasReceivedContentRef.current = true;
        // Clear progress interval immediately when real content arrives
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setContent((prev) => {
          // Remove progress message if this is the first real chunk
          if (isProgressMessage(prev)) {
            return chunk;
          }
          return prev + chunk;
        });
      },
      onExtractionComplete: (fullContent: string) => {
        setContent(fullContent);
        setIsExtracting(false);
        progressIndexRef.current = 0;
        hasReceivedContentRef.current = false;
        // Template stays hidden (user preference persisted)
        setStatusMessage('✅ Profile extracted successfully!');
        setTimeout(() => setStatusMessage(''), 3000);
      },
      onExtractionError: (error: string) => {
        setContent(originalContentRef.current); // REVERT to original
        setIsExtracting(false);
        progressIndexRef.current = 0;
        hasReceivedContentRef.current = false;
        // Template stays hidden (user preference persisted)
        setExtractionError(error);
        setStatusMessage('');
      },
      onExtractionCancelled: () => {
        // Keep whatever was streamed (don't revert to original)
        setContent((prev) => {
          // If still showing progress message, revert to original
          if (isProgressMessage(prev)) {
            return originalContentRef.current;
          }
          // Otherwise keep the streamed content as-is
          return prev;
        });
        setIsExtracting(false);
        progressIndexRef.current = 0;
        hasReceivedContentRef.current = false;
        // Template stays hidden (user preference persisted)
        setStatusMessage('Extraction cancelled - content preserved');
        setTimeout(() => setStatusMessage(''), 3000);
      },
    }),
    []
  );

  useProfileExtraction(extractionCallbacks);

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

  // Load profile from storage on mount
  useEffect(() => {
    loadProfile();
    loadTemplatePanelPreference();
    startAutoSave();
    startLastSavedInterval();

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
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
        setSavedContent(profileContent);
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

  const startAutoSave = () => {
    autoSaveTimerRef.current = setInterval(async () => {
      const currentContent = editorRef.current?.value.trim() || '';

      if (currentContent !== savedContent) {
        try {
          const profileData = {
            content: currentContent,
            updatedAt: new Date().toISOString(),
          };

          await userProfileStorage.setValue(profileData);

          setSavedContent(currentContent);
          setLastSavedTime(profileData.updatedAt);

          // Also save to localStorage as backup
          localStorage.setItem('userProfileDraft', currentContent);
        } catch (error) {
          console.error('Auto-save error:', error);
          // Keep localStorage backup even if browser.storage fails
          localStorage.setItem('userProfileDraft', currentContent);
        }
      }
    }, AUTO_SAVE_INTERVAL);
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
      setContent(result.newContent);
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
      setContent(newContent);
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
        setContent(newContent);
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
        setContent(newContent);
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
        setContent(newContent);
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
        setContent(newContent);
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

    try {
      const { llmSettingsStorage } = await import('@/utils/storage');
      const llmSettings = await llmSettingsStorage.getValue();

      // Calculate dynamic max tokens (~1.5x input length)
      // Rough estimate: 1 token ≈ 4 characters
      const estimatedInputTokens = Math.ceil(pastedText.length / 4);
      const dynamicMaxTokens = Math.ceil(estimatedInputTokens * 1.5);
      // Cap at reasonable maximum (4000 tokens)
      const maxTokens = Math.min(dynamicMaxTokens, 4000);

      console.info(
        `[Profile] Input length: ${pastedText.length} chars, estimated tokens: ${estimatedInputTokens}, max tokens: ${maxTokens}`
      );

      const response = await browser.runtime.sendMessage({
        action: 'streamExtractProfile',
        rawText: pastedText,
        llmSettings: llmSettings,
        maxTokens: maxTokens, // Pass calculated max tokens
      });

      if (!response.success) {
        throw new Error(response.error || 'Extraction failed');
      }
    } catch (error) {
      const err = error as Error;
      setExtractionError(err.message);
    }
  };

  const handleCancelExtraction = async () => {
    try {
      await browser.runtime.sendMessage({
        action: 'cancelProfileExtraction',
      });
    } catch (error) {
      console.error('Failed to cancel extraction:', error);
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
          <div className="template-content">{TEMPLATE_TEXT}</div>
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
              onChange={(e) => setContent(e.target.value)}
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
