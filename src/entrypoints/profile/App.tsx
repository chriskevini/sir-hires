import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';
import { browser } from 'wxt/browser';

// Import parser and validator utilities
import { parseProfile } from '@/utils/profile-parser';
import { validateProfile, PROFILE_SCHEMA } from '@/utils/profile-validator';

// Import WXT storage
import { userProfileStorage } from '@/utils/storage';

// Types
interface ValidationFix {
  type: string;
  text?: string;
  buttonLabel?: string;
  description?: string;
  section?: string;
  entry?: string;
  field?: string;
  currentValue?: string;
  allowedValues?: string[];
}

interface ValidationError {
  message: string;
  type?: string;
  section?: string;
  entry?: string;
  field?: string;
  value?: string;
  allowedValues?: string[];
}

interface ValidationResult {
  errors: ValidationError[];
  warnings: { message: string }[];
  info: { message: string }[];
  customFields: string[];
  customSections: string[];
}

// Constants
const DEFAULT_LINE_HEIGHT = 16;
const SCROLL_OFFSET_LINES = 2;
const AUTO_SAVE_INTERVAL = 3000; // 3 seconds
const VALIDATION_DEBOUNCE = 500; // 500ms

const FIELD_ORDER = {
  TOP_LEVEL: ['NAME', 'ADDRESS', 'EMAIL', 'PHONE', 'WEBSITE', 'GITHUB'],
  EDUCATION: ['DEGREE', 'SCHOOL', 'LOCATION', 'START', 'END', 'GPA'],
  EXPERIENCE: ['TYPE', 'TITLE', 'AT', 'START', 'END', 'BULLETS'],
};

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
  const [validation, setValidation] = useState<ValidationResult>({
    errors: [],
    warnings: [],
    info: [],
    customFields: [],
    customSections: [],
  });
  const [validationFixes, setValidationFixes] = useState<
    (ValidationFix | null)[]
  >([]);

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load profile from storage on mount
  useEffect(() => {
    loadProfile();
    startAutoSave();
    startLastSavedInterval();

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
      if (lastSavedIntervalRef.current)
        clearInterval(lastSavedIntervalRef.current);
      if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    };
  }, []);

  // Run validation when content changes (debounced)
  useEffect(() => {
    scheduleValidation();
  }, [content]);

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

  const formatLastSavedTime = (isoTimestamp: string): string => {
    const now = new Date();
    const saved = new Date(isoTimestamp);

    // Check if it's today
    const isToday = now.toDateString() === saved.toDateString();

    if (isToday) {
      // Format as HH:MM
      const hours = saved.getHours().toString().padStart(2, '0');
      const minutes = saved.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } else {
      // Format as relative date
      const diffMs = now.getTime() - saved.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffDays === 1) {
        return 'yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      }
    }
  };

  const showStatusMessage = (message: string, type: 'success' | 'error') => {
    setStatusMessage(message);

    if (type === 'success') {
      setTimeout(() => {
        setStatusMessage('');
      }, 2000);
    }
  };

  const scheduleValidation = useCallback(() => {
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    validationTimerRef.current = setTimeout(() => {
      runValidation(content);
    }, VALIDATION_DEBOUNCE);
  }, [content]);

  const runValidation = (content: string) => {
    if (!content || content.trim().length === 0) {
      setValidation({
        errors: [],
        warnings: [],
        info: [],
        customFields: [],
        customSections: [],
      });
      setValidationFixes([]);
      return;
    }

    try {
      const parsed = parseProfile(content);
      const validationResult = validateProfile(parsed);

      setValidation(validationResult);

      // Generate fixes for errors
      const fixes = validationResult.errors.map((error: ValidationError) =>
        generateFix(error)
      );
      setValidationFixes(fixes);
    } catch (error: any) {
      setValidation({
        errors: [{ message: `Parse error: ${error.message}` }],
        warnings: [],
        info: [],
        customFields: [],
        customSections: [],
      });
      setValidationFixes([]);
    }
  };

  const generateFix = (error: ValidationError): ValidationFix | null => {
    if (!error || !error.type) {
      return null;
    }

    switch (error.type) {
      case 'missing_type':
        return {
          type: 'insert_at_start',
          text: '<PROFILE>\n',
          buttonLabel: 'Add <PROFILE>',
          description: 'Insert <PROFILE> at the start',
        };

      case 'missing_required_field':
        if (error.section && error.entry) {
          return {
            type: 'insert_field_in_entry',
            section: error.section,
            entry: error.entry,
            field: error.field!,
            text: `${error.field}: `,
            buttonLabel: `Add ${error.field}`,
            description: `Insert ${error.field} field in ${error.section}.${error.entry}`,
          };
        } else {
          return {
            type: 'insert_top_level_field',
            field: error.field!,
            text: `${error.field}: `,
            buttonLabel: `Add ${error.field}`,
            description: `Insert ${error.field} field after <PROFILE>`,
          };
        }

      case 'invalid_enum_value':
        return {
          type: 'replace_enum_value_multi',
          section: error.section,
          entry: error.entry,
          field: error.field,
          currentValue: error.value,
          allowedValues: error.allowedValues,
          description: 'Replace with correct value',
        };

      default:
        return null;
    }
  };

  const applyFix = (fix: ValidationFix, enumValue?: string) => {
    if (!editorRef.current) return;

    const currentContent = editorRef.current.value;
    let newContent = currentContent;
    let cursorPosition = 0;

    if (fix.type === 'replace_enum_value_multi' && enumValue) {
      // Apply enum fix
      const enumRegex = new RegExp(
        `(##\\s+${fix.entry}[\\s\\S]*?${fix.field}:\\s*)${fix.currentValue}`,
        'm'
      );
      const enumMatch = currentContent.match(enumRegex);

      if (enumMatch) {
        const replaceStart = enumMatch.index! + enumMatch[1].length;
        const replaceEnd = replaceStart + fix.currentValue!.length;
        newContent =
          currentContent.slice(0, replaceStart) +
          enumValue +
          currentContent.slice(replaceEnd);
        cursorPosition = replaceStart + enumValue.length;
      }
    } else if (fix.type === 'insert_at_start') {
      newContent = fix.text! + currentContent;
      cursorPosition = fix.text!.length;
    } else if (fix.type === 'insert_top_level_field') {
      const profileMatch = currentContent.match(/^<PROFILE>\s*\n/m);
      if (profileMatch) {
        const topLevelStart = profileMatch.index! + profileMatch[0].length;
        const topLevelEnd = findNextSectionPosition(
          currentContent,
          topLevelStart
        );
        const insertPos = findSmartInsertPosition(
          currentContent,
          topLevelStart,
          topLevelEnd,
          fix.field!,
          FIELD_ORDER.TOP_LEVEL
        );
        const result = insertTextAtPosition(
          currentContent,
          insertPos,
          fix.text!
        );
        newContent = result.newContent;
        cursorPosition = result.cursorPosition;
      } else {
        newContent = '<PROFILE>\n' + fix.text! + '\n' + currentContent;
        cursorPosition = '<PROFILE>\n'.length + fix.text!.length;
      }
    } else if (fix.type === 'insert_field_in_entry') {
      const entryRegex = new RegExp(`^##\\s+${fix.entry}\\s*$`, 'm');
      const entryMatch = currentContent.match(entryRegex);

      if (entryMatch) {
        const entryStart = entryMatch.index! + entryMatch[0].length;
        const entryEnd = findEntryEndPosition(currentContent, entryStart);

        let fieldOrder: string[] = [];
        if (fix.section === 'EDUCATION') {
          fieldOrder = FIELD_ORDER.EDUCATION;
        } else if (fix.section === 'EXPERIENCE') {
          fieldOrder = FIELD_ORDER.EXPERIENCE;
        }

        const insertPos = findSmartInsertPosition(
          currentContent,
          entryStart,
          entryEnd,
          fix.field!,
          fieldOrder
        );
        const result = insertTextAtPosition(
          currentContent,
          insertPos,
          fix.text!
        );
        newContent = result.newContent;
        cursorPosition = result.cursorPosition;
      }
    }

    setCursorAndScroll(editorRef.current, newContent, cursorPosition);
    setContent(newContent);
  };

  // Helper functions (converted from vanilla JS)
  const setCursorAndScroll = (
    editor: HTMLTextAreaElement,
    newContent: string,
    cursorPosition: number
  ) => {
    editor.value = newContent;
    editor.focus();
    editor.setSelectionRange(cursorPosition, cursorPosition);

    const textBeforeCursor = newContent.slice(0, cursorPosition);
    const linesBefore = textBeforeCursor.split('\n').length;
    const lineHeight =
      parseInt(window.getComputedStyle(editor).lineHeight) ||
      DEFAULT_LINE_HEIGHT;
    const scrollPosition = Math.max(
      0,
      (linesBefore - SCROLL_OFFSET_LINES) * lineHeight
    );

    editor.scrollTop = scrollPosition;
  };

  const insertTextAtPosition = (
    content: string,
    insertPos: number,
    text: string
  ) => {
    const newContent =
      content.slice(0, insertPos) + text + '\n' + content.slice(insertPos);
    const cursorPosition = insertPos + text.length;
    return { newContent, cursorPosition };
  };

  const findNextEntryId = (content: string, prefix: string): number => {
    const regex = new RegExp(`##\\s+${prefix}(\\d+)`, 'g');
    const matches = content.matchAll(regex);
    let maxId = 0;

    for (const match of matches) {
      const id = parseInt(match[1], 10);
      if (id > maxId) {
        maxId = id;
      }
    }

    return maxId + 1;
  };

  const findNextSectionPosition = (
    content: string,
    startPos: number
  ): number => {
    const restContent = content.slice(startPos);
    const nextSectionMatch = restContent.match(/^#\s+\w+/m);

    if (nextSectionMatch) {
      return startPos + nextSectionMatch.index!;
    }
    return content.length;
  };

  const findEntryEndPosition = (
    content: string,
    entryStartPos: number
  ): number => {
    const restContent = content.slice(entryStartPos);
    const nextEntryMatch = restContent.match(/^##\s+\w+/m);
    const nextSectionMatch = restContent.match(/^#\s+\w+/m);

    if (
      nextEntryMatch &&
      (!nextSectionMatch || nextEntryMatch.index! < nextSectionMatch.index!)
    ) {
      return entryStartPos + nextEntryMatch.index!;
    } else if (nextSectionMatch) {
      return entryStartPos + nextSectionMatch.index!;
    }
    return content.length;
  };

  const findSmartInsertPosition = (
    content: string,
    startPos: number,
    endPos: number,
    fieldName: string,
    fieldOrder: string[]
  ): number => {
    const sectionContent = content.slice(startPos, endPos);
    const fieldIndex = fieldOrder.indexOf(fieldName);

    if (fieldIndex === -1) {
      return endPos;
    }

    const fieldRegex = /^([A-Z_]+):/gm;
    const existingFields: {
      name: string;
      orderIndex: number;
      position: number;
    }[] = [];
    let match;

    while ((match = fieldRegex.exec(sectionContent)) !== null) {
      const existingFieldName = match[1];
      const existingFieldIndex = fieldOrder.indexOf(existingFieldName);

      if (existingFieldIndex !== -1) {
        existingFields.push({
          name: existingFieldName,
          orderIndex: existingFieldIndex,
          position: startPos + match.index,
        });
      }
    }

    for (const existing of existingFields) {
      if (existing.orderIndex > fieldIndex) {
        let lineStart = existing.position;
        while (lineStart > startPos && content[lineStart - 1] !== '\n') {
          lineStart--;
        }
        return lineStart;
      }
    }

    return endPos;
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

  const exportMarkdown = async () => {
    if (!content.trim()) {
      showStatusMessage('Nothing to export', 'error');
      return;
    }

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `profile-${timestamp}.md`;

    await browser.downloads.download({
      url: url,
      filename: filename,
      saveAs: true,
    });

    showStatusMessage('Exported as ' + filename, 'success');
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
    window.location.href = browser.runtime.getURL('job-details.html');
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
                ? `Last saved: ${formatLastSavedTime(lastSavedTime)}`
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
