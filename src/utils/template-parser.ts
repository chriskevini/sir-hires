// Unified Template Parser
// Parses MarkdownDB template format into structured data
//
// Format:
// - <TYPE> wrapper (JOB, PROFILE, etc.)
// - KEY: value for top-level fields
// - # SECTION for section headers
// - ## Item Title for items within sections
// - KEY: value for fields within items
// - - bullet for list items
// - Plain text for freeform content (SUMMARY, etc.)

/**
 * Parsed item within a section
 */
export interface TemplateItem {
  title: string;
  fields: Record<string, string>;
  bullets: string[];
}

/**
 * Parsed section containing items, lists, or text
 */
export interface TemplateSection {
  items: TemplateItem[];
  list: string[]; // Simple bullet lists
  text: string[]; // Freeform text lines
  fields: Record<string, string>; // Section-level fields (rare)
}

/**
 * Parsed template data structure
 */
export interface ParsedTemplate {
  type: string | null;
  topLevelFields: Record<string, string>;
  sections: Record<string, TemplateSection>;
  raw: string;
}

/**
 * Create an empty section
 */
function createEmptySection(): TemplateSection {
  return {
    items: [],
    list: [],
    text: [],
    fields: {},
  };
}

/**
 * Parse a template string into structured data
 * @param content - The raw template content
 * @returns Parsed template data
 */
export function parseTemplate(content: string): ParsedTemplate {
  if (!content || typeof content !== 'string') {
    return {
      type: null,
      topLevelFields: {},
      sections: {},
      raw: content || '',
    };
  }

  const lines = content.split('\n');
  const result: ParsedTemplate = {
    type: null,
    topLevelFields: {},
    sections: {},
    raw: content,
  };

  let currentSection: string | null = null;
  let currentItem: TemplateItem | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('//')) {
      continue;
    }

    // Skip closing tags (</JOB>, </PROFILE>, etc.)
    if (trimmedLine.match(/^<\/\w+>$/)) {
      continue;
    }

    // Check for <TYPE> declaration
    const typeMatch = trimmedLine.match(/^<(\w+)>$/);
    if (typeMatch) {
      result.type = typeMatch[1];
      continue;
    }

    // Check for section header (# SECTION NAME)
    // Must not be ## (that's an item)
    const sectionMatch = trimmedLine.match(/^#\s+([^#].+?)(?:\s*\/\/.*)?$/);
    if (sectionMatch && !trimmedLine.startsWith('##')) {
      const sectionName = sectionMatch[1].trim().toUpperCase();
      currentSection = sectionName;
      currentItem = null;
      result.sections[currentSection] = createEmptySection();
      continue;
    }

    // Check for item header (## Item Title)
    // Must be within a section
    const itemMatch = trimmedLine.match(/^##\s+(.+?)(?:\s*\/\/.*)?$/);
    if (itemMatch && currentSection) {
      const itemTitle = itemMatch[1].trim();
      currentItem = {
        title: itemTitle,
        fields: {},
        bullets: [],
      };
      result.sections[currentSection].items.push(currentItem);
      continue;
    }

    // Check for list item (- item)
    const listMatch = trimmedLine.match(/^-\s+(.+)$/);
    if (listMatch) {
      const itemValue = listMatch[1];

      if (currentItem) {
        // Bullet within an item
        currentItem.bullets.push(itemValue);
      } else if (currentSection) {
        // Simple list item within section
        result.sections[currentSection].list.push(itemValue);
      }
      continue;
    }

    // Check for key-value pair (KEY: value or Key Name: value)
    // Supports both SCREAMING_CASE and Title Case with spaces
    const kvMatch = trimmedLine.match(/^([A-Z][A-Z0-9_ ]*[A-Z0-9]):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      let value = kvMatch[2].trim();

      // Remove inline comments (// comment)
      if (value.includes('//')) {
        value = value.split('//')[0].trim();
      }

      if (currentItem) {
        // Field within an item
        currentItem.fields[key] = value;
      } else if (currentSection) {
        // Field within a section (not in an item)
        result.sections[currentSection].fields[key] = value;
      } else {
        // Top-level field
        result.topLevelFields[key] = value;
      }
      continue;
    }

    // Unmatched line within a section (not in an item) - capture as text
    // This supports SUMMARY, OBJECTIVE, and other freeform text sections
    if (currentSection && !currentItem) {
      result.sections[currentSection].text.push(trimmedLine);
    }
  }

  return result;
}

/**
 * Get a specific top-level field value
 * @param parsed - Result from parseTemplate()
 * @param fieldName - Name of the field
 * @returns Field value or null if not found
 */
export function getField(
  parsed: ParsedTemplate,
  fieldName: string
): string | null {
  return parsed.topLevelFields[fieldName] || null;
}

/**
 * Get a section by name
 * @param parsed - Result from parseTemplate()
 * @param sectionName - Name of the section (case-insensitive)
 * @returns Section data or null if not found
 */
export function getSection(
  parsed: ParsedTemplate,
  sectionName: string
): TemplateSection | null {
  return parsed.sections[sectionName.toUpperCase()] || null;
}

/**
 * Get all items from a section
 * @param parsed - Result from parseTemplate()
 * @param sectionName - Name of the section
 * @returns Array of items or empty array
 */
export function getSectionItems(
  parsed: ParsedTemplate,
  sectionName: string
): TemplateItem[] {
  return getSection(parsed, sectionName)?.items || [];
}

/**
 * Get the list from a section
 * @param parsed - Result from parseTemplate()
 * @param sectionName - Name of the section
 * @returns Array of list items or empty array
 */
export function getSectionList(
  parsed: ParsedTemplate,
  sectionName: string
): string[] {
  return getSection(parsed, sectionName)?.list || [];
}

/**
 * Get the text content from a section
 * @param parsed - Result from parseTemplate()
 * @param sectionName - Name of the section
 * @returns Array of text lines or empty array
 */
export function getSectionText(
  parsed: ParsedTemplate,
  sectionName: string
): string[] {
  return getSection(parsed, sectionName)?.text || [];
}

/**
 * Check if a section exists
 * @param parsed - Result from parseTemplate()
 * @param sectionName - Name of the section
 * @returns true if section exists
 */
export function hasSection(
  parsed: ParsedTemplate,
  sectionName: string
): boolean {
  return sectionName.toUpperCase() in parsed.sections;
}

/**
 * Check if a section is empty (no items, no list, no text)
 * @param section - The section to check
 * @returns true if section has no content
 */
export function isSectionEmpty(section: TemplateSection): boolean {
  return (
    section.items.length === 0 &&
    section.list.length === 0 &&
    section.text.length === 0 &&
    Object.keys(section.fields).length === 0
  );
}
