import { useState, useEffect, useRef } from 'react';
import './styles.css';
import { browser } from 'wxt/browser';

// Import WXT storage
import { userProfileStorage } from '@/utils/storage';

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

// Constants
const AUTO_SAVE_INTERVAL = 3000; // 3 seconds

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

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isExtractingRef = useRef(false); // Race condition guard

  // Validation hook
  const { validation, validationFixes } = useProfileValidation({ content });

  // Profile extraction hook
  useProfileExtraction({
    onExtractionStarted: () => {
      console.info('[Profile] Extraction started');
      setIsExtracting(true);
      setExtractionError(null);
      setStatusMessage('Extracting profile...');
    },
    onChunkReceived: (chunk: string) => {
      console.info('[Profile] Chunk received:', chunk.substring(0, 50));
      // Append chunk to content in real-time
      setContent((prev) => prev + chunk);
    },
    onExtractionComplete: (fullContent: string) => {
      console.info(
        '[Profile] Extraction complete, length:',
        fullContent.length
      );
      setContent(fullContent);
      setIsExtracting(false);
      isExtractingRef.current = false;
      setStatusMessage('Profile extracted successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
    },
    onExtractionError: (error: string) => {
      console.error('[Profile] Extraction error:', error);
      setIsExtracting(false);
      isExtractingRef.current = false;
      setExtractionError(error);
      setStatusMessage('');
    },
    onExtractionCancelled: () => {
      console.info('[Profile] Extraction cancelled');
      setIsExtracting(false);
      isExtractingRef.current = false;
      setStatusMessage('Extraction cancelled');
      setTimeout(() => setStatusMessage(''), 3000);
    },
  });

  // Load profile from storage on mount
  useEffect(() => {
    loadProfile();
    startAutoSave();
    startLastSavedInterval();

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
      if (lastSavedIntervalRef.current)
        clearInterval(lastSavedIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Profile extraction handlers
  const handleExtractProfile = async () => {
    // Race condition guard: prevent concurrent extractions
    if (isExtractingRef.current) {
      console.warn('[Profile] Extraction already in progress, ignoring');
      return;
    }

    isExtractingRef.current = true;

    try {
      // Get current tab URL and page content
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.url) {
        throw new Error('Could not get current tab URL');
      }

      // Check if we're on a valid page (not chrome:// or extension://)
      if (
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('about:')
      ) {
        throw new Error(
          'Cannot extract profile from browser internal pages. Please navigate to a LinkedIn profile or resume page.'
        );
      }

      // Inject content script if needed (for getting page text)
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id! },
          func: () => {
            // Just a test to see if content script is already injected
            return true;
          },
        });
      } catch {
        // Content script not injected, inject it
        await browser.scripting.executeScript({
          target: { tabId: tab.id! },
          files: ['/content-scripts/content.js'],
        });
      }

      // Get page text
      const [result] = await browser.scripting.executeScript({
        target: { tabId: tab.id! },
        func: () => {
          return document.body.innerText || '';
        },
      });

      const pageText = result.result as string;

      if (!pageText || pageText.trim().length === 0) {
        throw new Error('No text content found on this page');
      }

      // Get LLM settings from storage
      const { llmSettingsStorage } = await import('@/utils/storage');
      const llmSettings = await llmSettingsStorage.getValue();

      console.info(
        '[Profile] Starting extraction with text length:',
        pageText.length
      );

      // Send extraction request to background
      const response = await browser.runtime.sendMessage({
        action: 'streamExtractProfile',
        url: tab.url,
        rawText: pageText,
        llmSettings: llmSettings,
      });

      if (!response.success) {
        throw new Error(response.error || 'Extraction failed');
      }

      console.info('[Profile] Extraction request sent successfully');
    } catch (error) {
      console.error('[Profile] Failed to start extraction:', error);
      const err = error as Error;
      setExtractionError(err.message);
      setStatusMessage('');
      isExtractingRef.current = false;
    }
  };

  const handleCancelExtraction = async () => {
    console.info('[Profile] Cancelling extraction');
    try {
      const response = await browser.runtime.sendMessage({
        action: 'cancelProfileExtraction',
      });

      if (!response.success) {
        console.warn('[Profile] Cancel response:', response.message);
      }
    } catch (error) {
      console.error('[Profile] Failed to cancel extraction:', error);
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
              onClick={() => setIsTemplatePanelVisible(false)}
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
          <div className="editor-help">
            <strong>💡 Tip:</strong> Use the Profile Template format (see left
            panel). Start with <code>&lt;PROFILE&gt;</code>, use{' '}
            <code>KEY: value</code> pairs, <code>#</code> for sections,{' '}
            <code>##</code> for entries, and <code>-</code> for lists.
          </div>
          <div className="editor-wrapper">
            <textarea
              ref={editorRef}
              id="profileEditor"
              className={editorClassName}
              placeholder="Start typing your profile here using the template format..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Validation Panel */}
      <ValidationPanel
        validation={validation}
        validationFixes={validationFixes}
        onApplyFix={applyFix}
        onInsertEducation={insertEducationTemplate}
        onInsertExperience={insertExperienceTemplate}
        showQuickActions={true}
      />

      {/* Extraction Error Display */}
      {extractionError && (
        <div
          className="extraction-error"
          style={{
            padding: '12px',
            margin: '10px 20px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c00',
          }}
        >
          <strong>❌ Extraction Error:</strong> {extractionError}
        </div>
      )}

      <footer>
        <button
          onClick={isExtracting ? handleCancelExtraction : handleExtractProfile}
          className={isExtracting ? 'btn-cancel' : 'btn-extract'}
          title={
            isExtracting
              ? 'Cancel extraction'
              : 'Extract profile from current tab'
          }
        >
          {isExtracting ? '❌ Cancel Extraction' : '🔍 Extract Profile'}
        </button>
        <button
          onClick={() => setIsTemplatePanelVisible(!isTemplatePanelVisible)}
          className="template-guide-show"
        >
          📖 Toggle Template
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
