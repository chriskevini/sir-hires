/**
 * Profile-specific utility functions for editor manipulation and template insertion
 */

import type {
  ValidationFix,
  ValidationMessage,
} from '@/utils/validation-types';

// Constants
const DEFAULT_LINE_HEIGHT = 16;
const SCROLL_OFFSET_LINES = 2;

export const FIELD_ORDER = {
  TOP_LEVEL: ['NAME', 'ADDRESS', 'EMAIL', 'PHONE', 'WEBSITE', 'GITHUB'],
  EDUCATION: ['DEGREE', 'SCHOOL', 'LOCATION', 'START', 'END', 'GPA'],
  EXPERIENCE: ['TYPE', 'TITLE', 'AT', 'START', 'END', 'BULLETS'],
};

// Job template field order
export const JOB_FIELD_ORDER = {
  TOP_LEVEL: [
    'TITLE',
    'COMPANY',
    'LOCATION',
    'JOB_TYPE',
    'REMOTE_TYPE',
    'EXPERIENCE_LEVEL',
    'SALARY',
    'POSTED_DATE',
    'DEADLINE',
  ],
};

/**
 * Sets cursor position and scrolls the editor to show the cursor
 */
export const setCursorAndScroll = (
  editor: HTMLTextAreaElement,
  newContent: string,
  cursorPosition: number
): void => {
  editor.value = newContent;
  editor.focus();
  editor.setSelectionRange(cursorPosition, cursorPosition);

  const textBeforeCursor = newContent.slice(0, cursorPosition);
  const linesBefore = textBeforeCursor.split('\n').length;
  const lineHeight =
    parseInt(window.getComputedStyle(editor).lineHeight) || DEFAULT_LINE_HEIGHT;
  const scrollPosition = Math.max(
    0,
    (linesBefore - SCROLL_OFFSET_LINES) * lineHeight
  );

  editor.scrollTop = scrollPosition;
};

/**
 * Inserts text at a specific position in the content
 */
export const insertTextAtPosition = (
  content: string,
  insertPos: number,
  text: string
): { newContent: string; cursorPosition: number } => {
  const newContent =
    content.slice(0, insertPos) + text + '\n' + content.slice(insertPos);
  const cursorPosition = insertPos + text.length;
  return { newContent, cursorPosition };
};

/**
 * Finds the next available entry ID for a given prefix (e.g., EDU_, EXP_)
 */
export const findNextEntryId = (content: string, prefix: string): number => {
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

/**
 * Finds the position of the next section (# SECTION) after startPos
 */
export const findNextSectionPosition = (
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

/**
 * Finds the end position of an entry (## ENTRY_ID)
 */
export const findEntryEndPosition = (
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

/**
 * Finds a smart position to insert a field based on field ordering
 */
export const findSmartInsertPosition = (
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

/**
 * Formats profile content by fixing spacing and whitespace issues
 * @returns The formatted content or null if no changes were made
 */
export const formatProfileContent = (content: string): string | null => {
  if (!content.trim()) {
    return null;
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
    return newContent;
  }

  return null;
};

/**
 * Generates a validation fix object for a given validation message
 * @param message - The validation message to generate a fix for
 * @param content - The current content (needed for computing next entry IDs)
 * @returns A ValidationFix object or null if no fix is available
 */
export const generateFix = (
  message: ValidationMessage,
  content: string
): ValidationFix | null => {
  if (!message || !message.type) {
    return null;
  }

  switch (message.type) {
    // === ERROR FIXES ===
    case 'missing_type':
      return {
        type: 'insert_at_start',
        text: '<PROFILE>\n',
        buttonLabel: 'Add <PROFILE>',
        description: 'Insert <PROFILE> at the start',
      };

    case 'missing_required_field':
      if (message.section && message.entry) {
        return {
          type: 'insert_field_in_entry',
          section: message.section,
          entry: message.entry,
          field: message.field!,
          text: `${message.field}: `,
          buttonLabel: `Add ${message.field}`,
          description: `Insert ${message.field} field in ${message.section}.${message.entry}`,
        };
      } else {
        return {
          type: 'insert_top_level_field',
          field: message.field!,
          text: `${message.field}: `,
          buttonLabel: `Add ${message.field}`,
          description: `Insert ${message.field} field after <PROFILE>`,
        };
      }

    case 'invalid_enum_value':
      return {
        type: 'replace_enum_value_multi',
        section: message.section,
        entry: message.entry,
        field: message.field,
        currentValue: message.value,
        allowedValues: message.allowedValues,
        description: 'Replace with correct value',
      };

    // === WARNING FIXES ===
    case 'duplicate_entry_id': {
      // Entry ID is duplicated - rename to next available
      const entryId = message.entry || '';
      const prefixMatch = entryId.match(/^([A-Z]+_)/);
      let prefix = prefixMatch ? prefixMatch[1] : 'ENTRY_';
      if (!prefixMatch && message.section === 'EDUCATION') prefix = 'EDU_';
      if (!prefixMatch && message.section === 'EXPERIENCE') prefix = 'EXP_';
      const nextId = findNextEntryId(content, prefix);
      const newEntryId = `${prefix}${nextId}`;
      return {
        type: 'rename_entry_id',
        section: message.section,
        entry: message.entry,
        currentValue: message.entry,
        newValue: newEntryId,
        buttonLabel: `→ ${newEntryId}`,
        description: `Rename duplicate entry ID "${message.entry}" to "${newEntryId}"`,
      };
    }

    case 'possible_section_typo': {
      // Use suggestedValue from validation message
      const suggestedSection = message.suggestedValue;
      if (suggestedSection) {
        return {
          type: 'rename_section',
          section: message.section,
          currentValue: message.section,
          newValue: suggestedSection,
          buttonLabel: `→ ${suggestedSection}`,
          description: `Rename section "${message.section}" to "${suggestedSection}"`,
        };
      }
      return null;
    }

    case 'section_name_case': {
      // Use suggestedValue from validation message
      const uppercaseSection = message.suggestedValue;
      if (uppercaseSection) {
        return {
          type: 'rename_section',
          section: message.section,
          currentValue: message.section,
          newValue: uppercaseSection,
          buttonLabel: `→ ${uppercaseSection}`,
          description: `Rename section "${message.section}" to "${uppercaseSection}"`,
        };
      }
      return null;
    }

    case 'invalid_entry_id': {
      // Entry ID doesn't follow naming convention - rename to next available
      let prefix = 'ENTRY_';
      if (message.section === 'EDUCATION') prefix = 'EDU_';
      if (message.section === 'EXPERIENCE') prefix = 'EXP_';
      if (message.section === 'SKILLS') prefix = 'SKILL_';
      if (message.section === 'PROJECTS') prefix = 'PROJ_';
      if (message.section === 'CERTIFICATIONS') prefix = 'CERT_';
      const nextId = findNextEntryId(content, prefix);
      const newEntryId = `${prefix}${nextId}`;
      return {
        type: 'rename_entry_id',
        section: message.section,
        entry: message.entry,
        currentValue: message.entry,
        newValue: newEntryId,
        buttonLabel: `→ ${newEntryId}`,
        description: `Rename entry ID "${message.entry}" to "${newEntryId}"`,
      };
    }

    case 'empty_section':
      // Empty section - offer to delete
      return {
        type: 'delete_section',
        section: message.section,
        buttonLabel: 'Delete',
        description: `Delete empty section "${message.section}"`,
      };

    default:
      return null;
  }
};

/**
 * Template type for applyFix function
 */
export type TemplateType = 'JOB' | 'PROFILE';

/**
 * Applies a validation fix to the content
 * @param fix - The fix to apply
 * @param currentContent - The current content
 * @param enumValue - Optional enum value for replace_enum_value_multi fixes
 * @param templateType - The template type (JOB or PROFILE), defaults to PROFILE for backwards compatibility
 */
export const applyFix = (
  fix: ValidationFix,
  currentContent: string,
  enumValue?: string,
  templateType: TemplateType = 'PROFILE'
): { newContent: string; cursorPosition: number } | null => {
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
    // Use template-specific regex and field order
    const templateTag = templateType === 'JOB' ? 'JOB' : 'PROFILE';
    const fieldOrder =
      templateType === 'JOB'
        ? JOB_FIELD_ORDER.TOP_LEVEL
        : FIELD_ORDER.TOP_LEVEL;

    const templateMatch = currentContent.match(
      new RegExp(`^<${templateTag}>\\s*\\n`, 'm')
    );
    if (templateMatch) {
      const topLevelStart = templateMatch.index! + templateMatch[0].length;
      const topLevelEnd = findNextSectionPosition(
        currentContent,
        topLevelStart
      );
      const insertPos = findSmartInsertPosition(
        currentContent,
        topLevelStart,
        topLevelEnd,
        fix.field!,
        fieldOrder
      );
      const result = insertTextAtPosition(currentContent, insertPos, fix.text!);
      newContent = result.newContent;
      cursorPosition = result.cursorPosition;
    } else {
      // No template tag found, insert at start with template tag
      const templateTag = templateType === 'JOB' ? '<JOB>' : '<PROFILE>';
      newContent = templateTag + '\n' + fix.text! + '\n' + currentContent;
      cursorPosition = templateTag.length + 1 + fix.text!.length;
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
      const result = insertTextAtPosition(currentContent, insertPos, fix.text!);
      newContent = result.newContent;
      cursorPosition = result.cursorPosition;
    }
  } else if (fix.type === 'rename_entry_id') {
    // Rename entry ID (e.g., duplicate or invalid ID)
    const entryId = fix.currentValue || fix.entry;
    if (!entryId) return null;

    // Use pre-computed newValue from generateFix to ensure consistency
    // (avoids race condition if content changes between validation and fix)
    const newEntryId = fix.newValue;
    if (!newEntryId) return null;

    // Replace the entry header
    const entryRegex = new RegExp(
      `^(##\\s+)${escapeRegex(entryId)}(\\s*)$`,
      'm'
    );
    const entryMatch = currentContent.match(entryRegex);

    if (entryMatch) {
      const replaceStart = entryMatch.index!;
      const replaceEnd = replaceStart + entryMatch[0].length;
      const replacement = `${entryMatch[1]}${newEntryId}${entryMatch[2]}`;

      newContent =
        currentContent.slice(0, replaceStart) +
        replacement +
        currentContent.slice(replaceEnd);
      cursorPosition = replaceStart + replacement.length;
    }
  } else if (fix.type === 'rename_section') {
    // Rename section header (e.g., typo or case fix)
    const oldSection = fix.currentValue || fix.section;
    const newSection = fix.newValue;
    if (!oldSection || !newSection) return null;

    // Match section header (# SECTION_NAME with optional trailing colon)
    const sectionRegex = new RegExp(
      `^(#\\s+)${escapeRegex(oldSection)}(:?)(\\s*)$`,
      'm'
    );
    const sectionMatch = currentContent.match(sectionRegex);

    if (sectionMatch) {
      const replaceStart = sectionMatch.index!;
      const replaceEnd = replaceStart + sectionMatch[0].length;
      // Preserve the colon if it was there
      const replacement = `${sectionMatch[1]}${newSection}${sectionMatch[2]}${sectionMatch[3]}`;

      newContent =
        currentContent.slice(0, replaceStart) +
        replacement +
        currentContent.slice(replaceEnd);
      cursorPosition = replaceStart + replacement.length;
    }
  } else if (fix.type === 'delete_section') {
    // Delete empty section
    const sectionName = fix.section;
    if (!sectionName) return null;

    // Match section header (with optional trailing colon)
    const sectionRegex = new RegExp(
      `^#\\s+${escapeRegex(sectionName)}:?\\s*$`,
      'm'
    );
    const sectionMatch = currentContent.match(sectionRegex);

    if (sectionMatch) {
      const sectionStart = sectionMatch.index!;

      // Find where this section ends (next section or end of content)
      const afterHeader = sectionStart + sectionMatch[0].length;
      const sectionEnd = findNextSectionPosition(currentContent, afterHeader);

      // Check if there's content between section header and next section
      const sectionContent = currentContent
        .slice(afterHeader, sectionEnd)
        .trim();

      // Only delete if section is truly empty (no entries)
      if (!sectionContent || !sectionContent.match(/^##\s+/m)) {
        // Find start of line (include leading newline if present)
        let deleteStart = sectionStart;
        if (deleteStart > 0 && currentContent[deleteStart - 1] === '\n') {
          deleteStart--;
        }

        // Include trailing whitespace/newlines
        let deleteEnd = sectionEnd;

        newContent =
          currentContent.slice(0, deleteStart) +
          currentContent.slice(deleteEnd);
        cursorPosition = deleteStart;

        // Clean up multiple consecutive newlines
        newContent = newContent.replace(/\n{3,}/g, '\n\n');
      }
    }
  }

  return { newContent, cursorPosition };
};

/**
 * Escapes special regex characters in a string
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
