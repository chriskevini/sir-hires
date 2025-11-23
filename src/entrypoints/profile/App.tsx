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
  insertTextAtPosition,
  findNextEntryId,
  findNextSectionPosition,
  findEntryEndPosition,
  findSmartInsertPosition,
  applyFix as applyFixUtil,
  FIELD_ORDER,
} from '@/utils/profile-utils';

// Import hooks
import {
  useProfileValidation,
  type ValidationFix,
  type ValidationError,
  type ValidationResult,
} from './hooks/useProfileValidation';

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

export default function ProfileApp() {
  // State
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isTemplatePanelVisible, setIsTemplatePanelVisible] = useState(true);
  const [isValidationPanelCollapsed, setIsValidationPanelCollapsed] =
    useState(true);

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Validation hook
  const { validation, validationFixes } = useProfileValidation({ content });

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
    }, 60000); // Update every minute
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
    window.location.href = (browser.runtime as any).getURL('job-details.html');
  };

  // Compute validation UI state
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const hasInfo = validation.info.length > 0;
  const hasCustomFields = validation.customFields.length > 0;
  const hasCustomSections = validation.customSections.length > 0;
  const customCount =
    validation.customFields.length + validation.customSections.length;

  let editorClassName = '';
  if (hasErrors) {
    editorClassName = 'has-errors';
  } else if (hasWarnings) {
    editorClassName = 'has-warnings';
  } else if (content.trim().length > 0) {
    editorClassName = 'is-valid';
  }

  let statusIcon = '○';
  let statusIconColor = '#666';
  let statusText = 'No Content';
  let statusTextColor = '#666';

  if (hasErrors) {
    statusIcon = '✗';
    statusIconColor = '#d93025';
    statusText = 'Validation Errors';
    statusTextColor = '#d93025';
  } else if (hasWarnings) {
    statusIcon = '⚠';
    statusIconColor = '#ea8600';
    statusText = 'Validation Warnings';
    statusTextColor = '#ea8600';
  } else if (content.trim().length > 0) {
    statusIcon = '✓';
    statusIconColor = '#0f9d58';
    statusText = 'Valid Profile';
    statusTextColor = '#0f9d58';
  }

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
      <div
        className={`validation-panel ${isValidationPanelCollapsed ? 'collapsed' : ''}`}
      >
        <div
          className="validation-header"
          onClick={() =>
            setIsValidationPanelCollapsed(!isValidationPanelCollapsed)
          }
        >
          <div className="validation-header-left">
            <div className="validation-status">
              <span className="status-icon" style={{ color: statusIconColor }}>
                {statusIcon}
              </span>
              <span style={{ color: statusTextColor }}>{statusText}</span>
            </div>
            <div className="validation-counts">
              {hasErrors && (
                <span className="count-errors" style={{ display: 'block' }}>
                  {validation.errors.length} error
                  {validation.errors.length > 1 ? 's' : ''}
                </span>
              )}
              {hasWarnings && (
                <span className="count-warnings" style={{ display: 'block' }}>
                  {validation.warnings.length} warning
                  {validation.warnings.length > 1 ? 's' : ''}
                </span>
              )}
              {(hasInfo || customCount > 0) && (
                <span className="count-info" style={{ display: 'block' }}>
                  {customCount} custom
                </span>
              )}
            </div>
          </div>
          <span className="validation-toggle">
            {isValidationPanelCollapsed ? '▼' : '▲'}
          </span>
        </div>
        <div className="quick-actions">
          <span className="quick-actions-label">Quick Actions:</span>
          <button
            onClick={insertEducationTemplate}
            className="quick-action-btn"
            title="Insert a new education entry"
          >
            + Education
          </button>
          <button
            onClick={insertExperienceTemplate}
            className="quick-action-btn"
            title="Insert a new experience entry"
          >
            + Experience
          </button>
        </div>
        <div className="validation-content">
          {validation.errors.length === 0 &&
          validation.warnings.length === 0 &&
          validation.info.length === 0 &&
          !hasCustomFields &&
          !hasCustomSections ? (
            <div className="validation-empty">No validation messages</div>
          ) : (
            <>
              {validation.errors.map((error, index) => {
                const fix = validationFixes[index];

                if (fix && fix.type === 'replace_enum_value_multi') {
                  const messageWithoutValues = error.message.replace(
                    /\. Allowed values:.*$/,
                    ''
                  );
                  return (
                    <div
                      key={`error-${index}`}
                      className="validation-message validation-error"
                    >
                      {messageWithoutValues}. Allowed values:
                      {fix.allowedValues?.map((value) => (
                        <button
                          key={value}
                          className="fix-button"
                          onClick={() => applyFix(fix, value)}
                          title={`Replace with ${value}`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  );
                }

                return (
                  <div
                    key={`error-${index}`}
                    className="validation-message validation-error"
                  >
                    {error.message}
                    {fix && (
                      <button
                        className="fix-button"
                        onClick={() => applyFix(fix)}
                        title={fix.description}
                      >
                        {fix.buttonLabel}
                      </button>
                    )}
                  </div>
                );
              })}

              {validation.warnings.map((warning, index) => (
                <div
                  key={`warning-${index}`}
                  className="validation-message validation-warning"
                >
                  {warning.message}
                </div>
              ))}

              {validation.info.map((info, index) => (
                <div
                  key={`info-${index}`}
                  className="validation-message validation-info"
                >
                  {info.message}
                </div>
              ))}

              {hasCustomFields && (
                <div className="validation-message validation-info">
                  ✨ Custom fields detected:{' '}
                  {validation.customFields.join(', ')}
                </div>
              )}

              {hasCustomSections && (
                <div className="validation-message validation-info">
                  ✨ Custom sections detected:{' '}
                  {validation.customSections.join(', ')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <footer>
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
