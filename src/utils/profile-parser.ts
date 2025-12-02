// Profile Template Parser
// Parses MarkdownDB Profile Template format into structured data
//
// New format (v2):
// - ### SECTION for section headers
// - # Item Title for items within sections
// - No entry IDs - items identified by title
// - Bullets directly under items (no BULLETS: label)

/**
 * Parsed item within a section
 */
interface ProfileItem {
  title: string;
  fields: Record<string, string>;
  bullets: string[];
}

/**
 * Parsed section containing items or a simple list
 */
interface ProfileSection {
  items: ProfileItem[];
  list: string[]; // For simple list sections (INTERESTS, SKILLS)
  text: string[]; // Plain text lines (for SUMMARY, OBJECTIVE, etc.)
}

/**
 * Parsed profile data structure
 */
interface ParsedProfile {
  type: string | null;
  topLevelFields: Record<string, string>;
  sections: Record<string, ProfileSection>;
  raw: string;
}

/**
 * Parse a Profile Template string into structured data
 * @param content - The raw profile template content
 * @returns Parsed profile data
 */
function parseProfileTemplate(content: string): ParsedProfile {
  if (!content || typeof content !== 'string') {
    return {
      type: null,
      topLevelFields: {},
      sections: {},
      raw: content || '',
    };
  }

  const lines = content.split('\n');
  const result: ParsedProfile = {
    type: null,
    topLevelFields: {},
    sections: {},
    raw: content,
  };

  let currentSection: string | null = null;
  let currentItem: ProfileItem | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('//')) {
      continue;
    }

    // Skip closing tags (</PROFILE>, etc.)
    if (trimmedLine.match(/^<\/\w+>$/)) {
      continue;
    }

    // Check for <PROFILE> type declaration
    const typeMatch = trimmedLine.match(/^<(\w+)>$/);
    if (typeMatch) {
      result.type = typeMatch[1];
      continue;
    }

    // Check for section header (### SECTION_NAME)
    // Matches: ### EDUCATION, ### PROFESSIONAL EXPERIENCE, etc.
    const sectionMatch = trimmedLine.match(/^###\s+(.+?)(?:\s*\/\/.*)?$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim().toUpperCase();
      currentSection = sectionName;
      currentItem = null;
      result.sections[currentSection] = {
        items: [],
        list: [],
        text: [],
      };
      continue;
    }

    // Check for item header (# Item Title)
    // Must be within a section
    const itemMatch = trimmedLine.match(/^#\s+(.+?)(?:\s*\/\/.*)?$/);
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
        // Simple list item within section (e.g., INTERESTS, SKILLS)
        result.sections[currentSection].list.push(itemValue);
      }
      continue;
    }

    // Check for key-value pair (KEY: value)
    const kvMatch = trimmedLine.match(/^([A-Z_]+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let value = kvMatch[2].trim();

      // Remove inline comments (// comment)
      if (value.includes('//')) {
        value = value.split('//')[0].trim();
      }

      if (currentItem) {
        // Field within an item
        currentItem.fields[key] = value;
      } else if (currentSection) {
        // Field within a section but not an item (unusual but supported)
        // Create an anonymous item to hold it
        if (result.sections[currentSection].items.length === 0) {
          currentItem = { title: '', fields: {}, bullets: [] };
          result.sections[currentSection].items.push(currentItem);
        }
        currentItem =
          result.sections[currentSection].items[
            result.sections[currentSection].items.length - 1
          ];
        currentItem.fields[key] = value;
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
 * Extract all education items from parsed profile
 * @param parsedProfile - Result from parseProfileTemplate()
 * @returns Array of education items
 */
function extractEducation(parsedProfile: ParsedProfile): ProfileItem[] {
  return parsedProfile.sections.EDUCATION?.items || [];
}

/**
 * Extract all experience items from parsed profile
 * Combines PROFESSIONAL EXPERIENCE, TECHNICAL PROJECT EXPERIENCE, and VOLUNTEER
 * @param parsedProfile - Result from parseProfileTemplate()
 * @returns Array of experience items with their section type
 */
function extractExperience(
  parsedProfile: ParsedProfile
): Array<ProfileItem & { type: string }> {
  const result: Array<ProfileItem & { type: string }> = [];

  const experienceSections = [
    { key: 'PROFESSIONAL EXPERIENCE', type: 'PROFESSIONAL' },
    { key: 'TECHNICAL PROJECT EXPERIENCE', type: 'PROJECT' },
    { key: 'VOLUNTEER', type: 'VOLUNTEER' },
  ];

  for (const { key, type } of experienceSections) {
    const section = parsedProfile.sections[key];
    if (section?.items) {
      for (const item of section.items) {
        result.push({ ...item, type });
      }
    }
  }

  return result;
}

/**
 * Extract interests list from parsed profile
 * @param parsedProfile - Result from parseProfileTemplate()
 * @returns Array of interest strings
 */
function extractInterests(parsedProfile: ParsedProfile): string[] {
  return parsedProfile.sections.INTERESTS?.list || [];
}

/**
 * Extract skills list from parsed profile
 * @param parsedProfile - Result from parseProfileTemplate()
 * @returns Array of skill strings
 */
function extractSkills(parsedProfile: ParsedProfile): string[] {
  return parsedProfile.sections.SKILLS?.list || [];
}

/**
 * Get a specific top-level field value
 * @param parsedProfile - Result from parseProfileTemplate()
 * @param fieldName - Name of the field (e.g., 'NAME', 'EMAIL')
 * @returns Field value or null if not found
 */
function getTopLevelField(
  parsedProfile: ParsedProfile,
  fieldName: string
): string | null {
  return parsedProfile.topLevelFields[fieldName] || null;
}

/**
 * Get the profile name
 * @param parsedProfile - Result from parseProfileTemplate()
 * @returns Name or null if not found
 */
function getName(parsedProfile: ParsedProfile): string | null {
  return getTopLevelField(parsedProfile, 'NAME');
}

/**
 * Get the profile email
 * @param parsedProfile - Result from parseProfileTemplate()
 * @returns Email or null if not found
 */
function getEmail(parsedProfile: ParsedProfile): string | null {
  return getTopLevelField(parsedProfile, 'EMAIL');
}

// Short aliases for convenience
const parseProfile = parseProfileTemplate;

// ES Module exports
export {
  parseProfileTemplate,
  parseProfile,
  extractEducation,
  extractExperience,
  extractInterests,
  extractSkills,
  getTopLevelField,
  getName,
  getEmail,
};

// Type exports
export type { ParsedProfile, ProfileSection, ProfileItem };
