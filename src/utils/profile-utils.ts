/**
 * Profile-specific utility functions for editor manipulation and template insertion
 */

import type { ValidationFix } from '@/entrypoints/profile/hooks/useProfileValidation';

// Constants
const DEFAULT_LINE_HEIGHT = 16;
const SCROLL_OFFSET_LINES = 2;

export const FIELD_ORDER = {
  TOP_LEVEL: ['NAME', 'ADDRESS', 'EMAIL', 'PHONE', 'WEBSITE', 'GITHUB'],
  EDUCATION: ['DEGREE', 'SCHOOL', 'LOCATION', 'START', 'END', 'GPA'],
  EXPERIENCE: ['TYPE', 'TITLE', 'AT', 'START', 'END', 'BULLETS'],
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
 * Applies a validation fix to the content
 */
export const applyFix = (
  fix: ValidationFix,
  currentContent: string,
  enumValue?: string
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
      const result = insertTextAtPosition(currentContent, insertPos, fix.text!);
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
      const result = insertTextAtPosition(currentContent, insertPos, fix.text!);
      newContent = result.newContent;
      cursorPosition = result.cursorPosition;
    }
  }

  return { newContent, cursorPosition };
};
