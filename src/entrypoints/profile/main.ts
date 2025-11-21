// Profile Editor (formerly Master Resume Editor)
let savedContent = '';
let draftContent = '';
let autoSaveInterval = null;
let lastSavedTime = null;

// Load profile on page load
async function loadProfile() {
  try {
    // First, check browser.storage.local for saved profile
    const result = await browser.storage.local.get(['userProfile']);

    if (result.userProfile && result.userProfile.content) {
      savedContent = result.userProfile.content;
      lastSavedTime = result.userProfile.updatedAt;
      document.getElementById('profileEditor').value = savedContent;
      updateLastSavedText();
    } else {
      // Check for draft in localStorage
      const draft = localStorage.getItem('userProfileDraft');
      if (draft) {
        draftContent = draft;
        document.getElementById('profileEditor').value = draft;
        updateLastSavedText('Draft recovered');
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    showStatus('Error loading profile', 'error');
  }
}

// Auto-save to browser.storage.local every 3 seconds
function startAutoSave() {
  autoSaveInterval = setInterval(async () => {
    const editor = document.getElementById('profileEditor');
    const currentContent = editor.value.trim();

    if (currentContent !== savedContent) {
      try {
        // Save to browser.storage.local
        const profileData = {
          content: currentContent,
          updatedAt: new Date().toISOString(),
        };

        await browser.storage.local.set({ userProfile: profileData });

        savedContent = currentContent;
        lastSavedTime = profileData.updatedAt;

        // Also save to localStorage as backup
        localStorage.setItem('userProfileDraft', currentContent);

        updateLastSavedText();
      } catch (error) {
        console.error('Auto-save error:', error);
        // Keep localStorage backup even if browser.storage fails
        localStorage.setItem('userProfileDraft', currentContent);
      }
    }
  }, 3000); // Auto-save every 3 seconds
}

// Format date: HH:MM if today, relative date if not today
function formatLastSavedTime(isoTimestamp) {
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
    const diffMs = now - saved;
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
}

// Update last saved text
function updateLastSavedText(customText = null) {
  const lastSavedEl = document.getElementById('lastSaved');

  if (customText) {
    lastSavedEl.textContent = customText;
    lastSavedEl.className = 'last-saved unsaved-indicator';
    return;
  }

  if (!lastSavedTime) {
    lastSavedEl.textContent = '';
    return;
  }

  const timeText = formatLastSavedTime(lastSavedTime);
  lastSavedEl.textContent = `Last saved: ${timeText}`;
  lastSavedEl.className = 'last-saved';
}

// Show status message
function showStatus(message, type = 'success') {
  const lastSavedEl = document.getElementById('lastSaved');

  lastSavedEl.textContent = message;
  lastSavedEl.className = `last-saved ${type === 'error' ? 'unsaved-indicator' : ''}`;

  if (type === 'success') {
    setTimeout(() => {
      updateLastSavedText();
    }, 2000);
  }
}

// Export profile as markdown
function exportMarkdown() {
  const editor = document.getElementById('profileEditor');
  const content = editor.value.trim();

  if (!content) {
    showStatus('Nothing to export', 'error');
    return;
  }

  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `profile-${timestamp}.md`;

  browser.downloads.download({
    url: url,
    filename: filename,
    saveAs: true,
  });

  showStatus('Exported as ' + filename, 'success');
}

// Export profile as plain text
function exportText() {
  const editor = document.getElementById('profileEditor');
  const content = editor.value.trim();

  if (!content) {
    showStatus('Nothing to export', 'error');
    return;
  }

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `profile-${timestamp}.txt`;

  browser.downloads.download({
    url: url,
    filename: filename,
    saveAs: true,
  });

  showStatus('Exported as ' + filename, 'success');
}

// Toggle template panel visibility
function toggleTemplatePanel() {
  const panel = document.getElementById('templatePanel');
  panel.classList.toggle('hidden');
}

// Close template panel
function closeTemplatePanel() {
  const panel = document.getElementById('templatePanel');
  panel.classList.add('hidden');
}

// Navigate back to viewer
function goBack() {
  window.location.href = 'job-details.html';
}

// Validation state
let validationDebounceTimer = null;
let isValidationPanelCollapsed = true;
let currentValidationFixes = []; // Store fixes for button handlers

// Constants
const DEFAULT_LINE_HEIGHT = 16;
const SCROLL_OFFSET_LINES = 2;

// Canonical field order for smart insertion
const FIELD_ORDER = {
  TOP_LEVEL: ['NAME', 'ADDRESS', 'EMAIL', 'PHONE', 'WEBSITE', 'GITHUB'],
  EDUCATION: ['DEGREE', 'SCHOOL', 'LOCATION', 'START', 'END', 'GPA'],
  EXPERIENCE: ['TYPE', 'TITLE', 'AT', 'START', 'END', 'BULLETS'],
};

// Helper: Set cursor position and scroll to make it visible
function setCursorAndScroll(editor, newContent, cursorPosition) {
  editor.value = newContent;
  editor.focus();
  editor.setSelectionRange(cursorPosition, cursorPosition);

  // Scroll to cursor position
  const textBeforeCursor = newContent.slice(0, cursorPosition);
  const linesBefore = textBeforeCursor.split('\n').length;
  const lineHeight =
    parseInt(window.getComputedStyle(editor).lineHeight) || DEFAULT_LINE_HEIGHT;
  const scrollPosition = Math.max(
    0,
    (linesBefore - SCROLL_OFFSET_LINES) * lineHeight
  );

  editor.scrollTop = scrollPosition;
}

// Helper: Insert text at position and return new content with cursor position
function insertTextAtPosition(content, insertPos, text) {
  const newContent =
    content.slice(0, insertPos) + text + '\n' + content.slice(insertPos);
  const cursorPosition = insertPos + text.length;
  return { newContent, cursorPosition };
}

// Helper: Find next available entry ID for a given prefix (e.g., "EDU_", "EXP_")
function findNextEntryId(content, prefix) {
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
}

// Helper: Find the position of the next section or entry after a given start position
function findNextSectionPosition(content, startPos) {
  const restContent = content.slice(startPos);
  const nextSectionMatch = restContent.match(/^#\s+\w+/m);

  if (nextSectionMatch) {
    return startPos + nextSectionMatch.index;
  }
  return content.length;
}

// Helper: Find the end position of an entry (before next ## or # or end of file)
function findEntryEndPosition(content, entryStartPos) {
  const restContent = content.slice(entryStartPos);
  const nextEntryMatch = restContent.match(/^##\s+\w+/m);
  const nextSectionMatch = restContent.match(/^#\s+\w+/m);

  if (
    nextEntryMatch &&
    (!nextSectionMatch || nextEntryMatch.index < nextSectionMatch.index)
  ) {
    return entryStartPos + nextEntryMatch.index;
  } else if (nextSectionMatch) {
    return entryStartPos + nextSectionMatch.index;
  }
  return content.length;
}

// Helper: Find smart insertion position for a field based on canonical order
function findSmartInsertPosition(
  content,
  startPos,
  endPos,
  fieldName,
  fieldOrder
) {
  // Extract the text content between start and end
  const sectionContent = content.slice(startPos, endPos);

  // Find the desired field's index in the canonical order
  const fieldIndex = fieldOrder.indexOf(fieldName);
  if (fieldIndex === -1) {
    // Field not in order, insert at end
    return endPos;
  }

  // Find all existing fields in this section and their positions
  const fieldRegex = /^([A-Z_]+):/gm;
  const existingFields = [];
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

  // Find the first existing field that comes AFTER our desired field in the canonical order
  for (const existing of existingFields) {
    if (existing.orderIndex > fieldIndex) {
      // Insert before this field - find the start of the line
      // Look backwards from the field position to find the newline before it
      let lineStart = existing.position;
      while (lineStart > startPos && content[lineStart - 1] !== '\n') {
        lineStart--;
      }
      return lineStart;
    }
  }

  // No field comes after - insert at the end
  return endPos;
}

// Toggle validation panel
function toggleValidationPanel() {
  const panel = document.getElementById('validationPanel');
  const toggle = document.querySelector('.validation-toggle');

  isValidationPanelCollapsed = !isValidationPanelCollapsed;

  if (isValidationPanelCollapsed) {
    panel.classList.add('collapsed');
    toggle.textContent = '▼';
  } else {
    panel.classList.remove('collapsed');
    toggle.textContent = '▲';
  }
}

// Validate profile content (wrapper function)
function runValidation(content) {
  // If content is empty, show no validation
  if (!content || content.trim().length === 0) {
    return {
      errors: [],
      warnings: [],
      info: [],
      customFields: [],
      customSections: [],
    };
  }

  try {
    // Parse the profile
    const parsed = parseProfile(content);

    // Validate the parsed profile
    const validation = validateProfile(parsed);

    return validation;
  } catch (error) {
    // Parse error
    return {
      errors: [`Parse error: ${error.message}`],
      warnings: [],
      info: [],
      customFields: [],
      customSections: [],
    };
  }
}

// Update validation UI
function updateValidationUI(validation) {
  const editor = document.getElementById('profileEditor');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const errorCount = document.getElementById('errorCount');
  const warningCount = document.getElementById('warningCount');
  const infoCount = document.getElementById('infoCount');
  const validationContent = document.getElementById('validationContent');

  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const hasInfo = validation.info.length > 0;
  const hasCustomFields = validation.customFields.length > 0;
  const hasCustomSections = validation.customSections.length > 0;

  // Update textarea border color
  editor.classList.remove('has-errors', 'has-warnings', 'is-valid');
  if (hasErrors) {
    editor.classList.add('has-errors');
  } else if (hasWarnings) {
    editor.classList.add('has-warnings');
  } else if (editor.value.trim().length > 0) {
    editor.classList.add('is-valid');
  }

  // Update status icon and text
  if (hasErrors) {
    statusIcon.textContent = '✗';
    statusIcon.style.color = '#d93025';
    statusText.textContent = 'Validation Errors';
    statusText.style.color = '#d93025';
  } else if (hasWarnings) {
    statusIcon.textContent = '⚠';
    statusIcon.style.color = '#ea8600';
    statusText.textContent = 'Validation Warnings';
    statusText.style.color = '#ea8600';
  } else if (editor.value.trim().length > 0) {
    statusIcon.textContent = '✓';
    statusIcon.style.color = '#0f9d58';
    statusText.textContent = 'Valid Profile';
    statusText.style.color = '#0f9d58';
  } else {
    statusIcon.textContent = '○';
    statusIcon.style.color = '#666';
    statusText.textContent = 'No Content';
    statusText.style.color = '#666';
  }

  // Update counts
  if (hasErrors) {
    errorCount.textContent = `${validation.errors.length} error${validation.errors.length > 1 ? 's' : ''}`;
    errorCount.style.display = 'block';
  } else {
    errorCount.style.display = 'none';
  }

  if (hasWarnings) {
    warningCount.textContent = `${validation.warnings.length} warning${validation.warnings.length > 1 ? 's' : ''}`;
    warningCount.style.display = 'block';
  } else {
    warningCount.style.display = 'none';
  }

  const customCount =
    validation.customFields.length + validation.customSections.length;
  if (hasInfo || customCount > 0) {
    infoCount.textContent = `${customCount} custom`;
    infoCount.style.display = 'block';
  } else {
    infoCount.style.display = 'none';
  }

  // Build validation messages HTML and collect fixes
  let messagesHTML = '';
  currentValidationFixes = []; // Reset fixes array

  // Errors
  validation.errors.forEach((error, index) => {
    const fix = generateFix(error);
    currentValidationFixes.push(fix); // Store fix (may be null)

    let errorHTML = `<div class="validation-message validation-error">`;

    if (fix && fix.type === 'replace_enum_value_multi') {
      // Special handling for enum fixes - show message without allowed values, then show buttons
      const messageWithoutValues = error.message.replace(
        /\. Allowed values:.*$/,
        ''
      );
      errorHTML += `${escapeHtml(messageWithoutValues)}. Allowed values:`;

      // Add a button for each allowed value
      fix.allowedValues.forEach((value) => {
        errorHTML += `<button class="fix-button" data-fix-index="${index}" data-enum-value="${escapeHtml(value)}" title="Replace with ${escapeHtml(value)}">${escapeHtml(value)}</button>`;
      });
    } else {
      // Regular error with single fix button or no fix
      errorHTML += escapeHtml(error.message);

      if (fix) {
        errorHTML += `<button class="fix-button" data-fix-index="${index}" title="${escapeHtml(fix.description)}">${escapeHtml(fix.buttonLabel)}</button>`;
      }
    }

    errorHTML += `</div>`;
    messagesHTML += errorHTML;
  });

  // Warnings
  validation.warnings.forEach((warning) => {
    messagesHTML += `<div class="validation-message validation-warning">${escapeHtml(warning.message)}</div>`;
  });

  // Info messages
  validation.info.forEach((info) => {
    messagesHTML += `<div class="validation-message validation-info">${escapeHtml(info.message)}</div>`;
  });

  // Custom fields
  if (hasCustomFields) {
    const fieldsText = validation.customFields.join(', ');
    messagesHTML += `<div class="validation-message validation-info">✨ Custom fields detected: ${escapeHtml(fieldsText)}</div>`;
  }

  // Custom sections
  if (hasCustomSections) {
    const sectionsText = validation.customSections.join(', ');
    messagesHTML += `<div class="validation-message validation-info">✨ Custom sections detected: ${escapeHtml(sectionsText)}</div>`;
  }

  // If no messages, show empty state
  if (!messagesHTML) {
    messagesHTML = '<div class="validation-empty">No validation messages</div>';
  }

  validationContent.innerHTML = messagesHTML;
}

// Debounced validation
function scheduleValidation() {
  if (validationDebounceTimer) {
    clearTimeout(validationDebounceTimer);
  }

  validationDebounceTimer = setTimeout(() => {
    const editor = document.getElementById('profileEditor');
    const content = editor.value;
    const validation = runValidation(content);
    updateValidationUI(validation);
  }, 500); // Validate 500ms after user stops typing
}

// Escape HTML for safe display
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Generate fix action for a validation error
function generateFix(error) {
  if (!error || !error.type) {
    return null;
  }

  switch (error.type) {
    case 'missing_type':
      // Insert <PROFILE> at line 1
      return {
        type: 'insert_at_start',
        text: '<PROFILE>\n',
        buttonLabel: 'Add <PROFILE>',
        description: 'Insert <PROFILE> at the start',
      };

    case 'missing_required_field':
      if (error.section && error.entry) {
        // Missing field in an entry (e.g., DEGREE in EDU_1)
        return {
          type: 'insert_field_in_entry',
          section: error.section,
          entry: error.entry,
          field: error.field,
          text: `${error.field}: `,
          buttonLabel: `Add ${error.field}`,
          description: `Insert ${error.field} field in ${error.section}.${error.entry}`,
        };
      } else {
        // Missing top-level field
        return {
          type: 'insert_top_level_field',
          field: error.field,
          text: `${error.field}: `,
          buttonLabel: `Add ${error.field}`,
          description: `Insert ${error.field} field after <PROFILE>`,
        };
      }

    case 'invalid_enum_value':
      // Show multiple buttons for user to select correct value
      return {
        type: 'replace_enum_value_multi',
        section: error.section,
        entry: error.entry,
        field: error.field,
        currentValue: error.value,
        allowedValues: error.allowedValues,
        description: `Replace with correct value`,
      };

    default:
      // No automatic fix available
      return null;
  }
}

// Apply a fix by index (called from fix button onclick)
function applyFixByIndex(index, enumValue = null) {
  if (index >= 0 && index < currentValidationFixes.length) {
    const fix = currentValidationFixes[index];
    if (fix) {
      if (fix.type === 'replace_enum_value_multi' && enumValue) {
        applyEnumFix(fix, enumValue);
      } else {
        applyFix(fix);
      }
    }
  }
}

// Apply enum fix with user-selected value
function applyEnumFix(fix, selectedValue) {
  const editor = document.getElementById('profileEditor');
  const content = editor.value;

  // Find and replace the enum value
  const enumRegex = new RegExp(
    `(##\\s+${fix.entry}[\\s\\S]*?${fix.field}:\\s*)${fix.currentValue}`,
    'm'
  );
  const enumMatch = content.match(enumRegex);

  if (enumMatch) {
    const replaceStart = enumMatch.index + enumMatch[1].length;
    const replaceEnd = replaceStart + fix.currentValue.length;
    const newContent =
      content.slice(0, replaceStart) +
      selectedValue +
      content.slice(replaceEnd);
    const cursorPosition = replaceStart + selectedValue.length;

    setCursorAndScroll(editor, newContent, cursorPosition);
    scheduleValidation();
  }
}

// Apply a fix to the editor content
function applyFix(fix) {
  const editor = document.getElementById('profileEditor');
  const content = editor.value;
  let newContent = content;
  let cursorPosition = 0;

  switch (fix.type) {
    case 'insert_at_start':
      // Insert text at the very beginning
      newContent = fix.text + content;
      cursorPosition = fix.text.length;
      break;

    case 'insert_top_level_field':
      // Insert field after <PROFILE> line in correct position based on template order
      const profileMatch = content.match(/^<PROFILE>\s*\n/m);
      if (profileMatch) {
        const topLevelStart = profileMatch.index + profileMatch[0].length;

        // Find the end of top-level fields (before first # section)
        const topLevelEnd = findNextSectionPosition(content, topLevelStart);

        // Find smart insertion position based on field order
        const insertPos = findSmartInsertPosition(
          content,
          topLevelStart,
          topLevelEnd,
          fix.field,
          FIELD_ORDER.TOP_LEVEL
        );

        // Insert field with newline after
        const result = insertTextAtPosition(content, insertPos, fix.text);
        newContent = result.newContent;
        cursorPosition = result.cursorPosition;
      } else {
        // If no <PROFILE> found, insert at start
        newContent = '<PROFILE>\n' + fix.text + '\n' + content;
        cursorPosition = '<PROFILE>\n'.length + fix.text.length;
      }
      break;

    case 'insert_field_in_entry':
      // Find the entry and insert field in the correct position based on template order
      const entryRegex = new RegExp(`^##\\s+${fix.entry}\\s*$`, 'm');
      const entryMatch = content.match(entryRegex);

      if (entryMatch) {
        const entryStart = entryMatch.index + entryMatch[0].length;
        const entryEnd = findEntryEndPosition(content, entryStart);

        // Determine field order based on section type
        let fieldOrder = [];
        if (fix.section === 'EDUCATION') {
          fieldOrder = FIELD_ORDER.EDUCATION;
        } else if (fix.section === 'EXPERIENCE') {
          fieldOrder = FIELD_ORDER.EXPERIENCE;
        }

        // Find smart insertion position
        const insertPos = findSmartInsertPosition(
          content,
          entryStart,
          entryEnd,
          fix.field,
          fieldOrder
        );

        // Insert field with newline after
        const result = insertTextAtPosition(content, insertPos, fix.text);
        newContent = result.newContent;
        cursorPosition = result.cursorPosition;
      }
      break;
  }

  setCursorAndScroll(editor, newContent, cursorPosition);
  scheduleValidation();
}

// Fix formatting (normalize whitespace)
function formatProfile() {
  const editor = document.getElementById('profileEditor');
  const content = editor.value;

  if (!content.trim()) {
    showStatus('Nothing to format', 'error');
    return;
  }

  // Split into lines
  const lines = content.split('\n');
  const formatted = [];

  for (let line of lines) {
    // Trim trailing whitespace
    line = line.trimEnd();

    // Normalize whitespace after colons (KEY: value -> KEY: value)
    if (line.match(/^\s*[A-Z_]+:\s/)) {
      line = line.replace(/^(\s*)([A-Z_]+):\s+/, '$1$2: ');
    }

    // Normalize section headers (remove extra spaces)
    if (line.match(/^#+\s+/)) {
      line = line.replace(/^(#+)\s+/, '$1 ');
    }

    formatted.push(line);
  }

  // Join lines back together
  let newContent = formatted.join('\n');

  // Remove excessive newlines (collapse 3+ consecutive blank lines to 2)
  newContent = newContent.replace(/\n{3,}/g, '\n\n');

  // Remove empty lines between key-value pairs (KEY: value)
  // Match: KEY: value\n\nKEY: value -> KEY: value\nKEY: value
  newContent = newContent.replace(
    /^(\s*[A-Z_]+:.*)\n\n(\s*[A-Z_]+:)/gm,
    '$1\n$2'
  );

  // Remove empty lines between list items (- item)
  // Match: - item\n\n- item -> - item\n- item
  newContent = newContent.replace(/^(\s*-.*)\n\n(\s*-)/gm, '$1\n$2');

  // Remove empty line between list name and first list item
  // Match: KEY:\n\n- item -> KEY:\n- item
  newContent = newContent.replace(/^(\s*[A-Z_]+:)\s*\n\n(\s*-)/gm, '$1\n$2');

  // Remove empty line between section header and first key-value pair
  // Match: # SECTION\n\nKEY: value -> # SECTION\nKEY: value
  newContent = newContent.replace(
    /^(#+\s+[A-Z_]+)\s*\n\n(\s*[A-Z_]+:)/gm,
    '$1\n$2'
  );

  // Remove empty line between entry header and first key-value pair
  // Match: ## ENTRY_ID\n\nKEY: value -> ## ENTRY_ID\nKEY: value
  newContent = newContent.replace(
    /^(##\s+[A-Z0-9_]+)\s*\n\n(\s*[A-Z_]+:)/gm,
    '$1\n$2'
  );

  // Only update if content changed
  if (newContent !== content) {
    editor.value = newContent;
    scheduleValidation();
    showStatus('Formatting fixed', 'success');
  } else {
    showStatus('No formatting issues found', 'success');
  }
}

// Insert Education template
function insertEducationTemplate() {
  const editor = document.getElementById('profileEditor');
  const content = editor.value;

  // Find the next available EDU_ entry ID
  const newId = findNextEntryId(content, 'EDU_');

  // Template for new education entry
  const template = `## EDU_${newId}
DEGREE: 
SCHOOL: 
LOCATION: 
START: 
END: 
`;

  // Find where to insert: after last education entry or create section
  const eduSectionMatch = content.match(/^#\s+EDUCATION\s*$/m);

  if (eduSectionMatch) {
    // EDUCATION section exists - find where to insert
    const sectionStart = eduSectionMatch.index + eduSectionMatch[0].length;
    const insertPos = findNextSectionPosition(content, sectionStart);

    const newContent =
      content.slice(0, insertPos) +
      '\n' +
      template +
      '\n' +
      content.slice(insertPos);
    const cursorPos = insertPos + 1 + template.indexOf('DEGREE: ') + 8;

    setCursorAndScroll(editor, newContent, cursorPos);
  } else {
    // No EDUCATION section - create it
    // Find where to insert: after top-level fields, before first section
    const profileMatch = content.match(/^<PROFILE>\s*$/m);
    let insertPos = 0;

    if (profileMatch) {
      const afterProfile = profileMatch.index + profileMatch[0].length;
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

    setCursorAndScroll(editor, newContent, cursorPos);
  }

  scheduleValidation();
}

// Insert Experience template
function insertExperienceTemplate() {
  const editor = document.getElementById('profileEditor');
  const content = editor.value;

  // Find the next available EXP_ entry ID
  const newId = findNextEntryId(content, 'EXP_');

  // Template for new experience entry
  const template = `## EXP_${newId}
TYPE: PROFESSIONAL
TITLE: 
AT: 
START: 
END: 
BULLETS:
- 
`;

  // Find where to insert: after last experience entry or create section
  const expSectionMatch = content.match(/^#\s+EXPERIENCE\s*$/m);

  if (expSectionMatch) {
    // EXPERIENCE section exists - find where to insert
    const sectionStart = expSectionMatch.index + expSectionMatch[0].length;
    const insertPos = findNextSectionPosition(content, sectionStart);

    const newContent =
      content.slice(0, insertPos) +
      '\n' +
      template +
      '\n' +
      content.slice(insertPos);
    const cursorPos = insertPos + 1 + template.indexOf('TITLE: ') + 7;

    setCursorAndScroll(editor, newContent, cursorPos);
  } else {
    // No EXPERIENCE section - create it
    // Find where to insert: after EDUCATION or after top-level fields
    const eduSectionMatch = content.match(/^#\s+EDUCATION\s*$/m);
    let insertPos = 0;

    if (eduSectionMatch) {
      // Insert after EDUCATION section
      const sectionStart = eduSectionMatch.index;
      const restContent = content.slice(sectionStart);
      const nextSectionMatch = restContent.match(/^#\s+(?!EDUCATION)\w+/m);

      if (nextSectionMatch) {
        insertPos = sectionStart + nextSectionMatch.index;
      } else {
        insertPos = content.length;
      }
    } else {
      // No EDUCATION section either - find first section or end
      const profileMatch = content.match(/^<PROFILE>\s*$/m);

      if (profileMatch) {
        const afterProfile = profileMatch.index + profileMatch[0].length;
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

    setCursorAndScroll(editor, newContent, cursorPos);
  }

  scheduleValidation();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
  loadProfile();
  startAutoSave();

  // Run initial validation after content loads
  setTimeout(() => {
    const editor = document.getElementById('profileEditor');
    const validation = runValidation(editor.value);
    updateValidationUI(validation);
  }, 100);

  // Update last saved time every minute
  setInterval(() => {
    if (lastSavedTime) {
      updateLastSavedText();
    }
  }, 60000);

  // Back button
  document.getElementById('backBtn').addEventListener('click', goBack);

  // Export and formatting buttons
  document
    .getElementById('fixFormattingBtn')
    .addEventListener('click', formatProfile);
  document
    .getElementById('exportMdBtn')
    .addEventListener('click', exportMarkdown);
  document.getElementById('exportTxtBtn').addEventListener('click', exportText);

  // Template panel close button
  document
    .getElementById('templatePanelClose')
    .addEventListener('click', closeTemplatePanel);

  // Show template button (when hidden)
  document
    .getElementById('templateGuideBtn')
    .addEventListener('click', toggleTemplatePanel);

  // Validation panel toggle
  document
    .getElementById('validationHeader')
    .addEventListener('click', toggleValidationPanel);

  // Quick Actions buttons
  document
    .getElementById('addEducationBtn')
    .addEventListener('click', insertEducationTemplate);
  document
    .getElementById('addExperienceBtn')
    .addEventListener('click', insertExperienceTemplate);

  // Fix buttons (event delegation)
  document
    .getElementById('validationContent')
    .addEventListener('click', function (e) {
      if (e.target.classList.contains('fix-button')) {
        const fixIndex = parseInt(e.target.getAttribute('data-fix-index'), 10);
        const enumValue = e.target.getAttribute('data-enum-value');

        if (!isNaN(fixIndex)) {
          applyFixByIndex(fixIndex, enumValue);
        }
      }
    });

  // Real-time validation on content change
  document
    .getElementById('profileEditor')
    .addEventListener('input', scheduleValidation);
});
