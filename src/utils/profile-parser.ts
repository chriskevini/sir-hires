// Profile Template Parser
// Thin wrapper around unified template parser for profile-specific functionality
//
// New unified format:
// - <PROFILE> wrapper
// - KEY: value for top-level fields (NAME, EMAIL, etc.)
// - # SECTION for section headers (EDUCATION, PROFESSIONAL EXPERIENCE, etc.)
// - ## Item Title for items within sections
// - KEY: value for fields within items (DATES, LOCATION, etc.)
// - - bullet for achievements/responsibilities
// - Plain text for freeform content (SUMMARY, OBJECTIVE, etc.)
//
// Backward compatibility:
// - Supports old format (### SECTION, # Item) for existing templates

import {
  parseTemplate,
  getSection,
  getSectionItems,
  getSectionList,
  isSectionEmpty,
  type ParsedTemplate,
  type TemplateSection,
  type TemplateItem,
} from './template-parser';

// Re-export types with profile-specific names for convenience
export type ProfileItem = TemplateItem;
export type ProfileSection = TemplateSection;
export type ParsedProfile = ParsedTemplate;

/**
 * Check if a line looks like a section header (ALL CAPS with possible spaces)
 * e.g., "EDUCATION", "PROFESSIONAL EXPERIENCE"
 */
function isSectionHeader(text: string): boolean {
  return /^[A-Z][A-Z ]+$/.test(text);
}

/**
 * Convert a single line from old format to new format
 * - # followed by ALL CAPS = section header, keep as #
 * - # followed by mixed case = item title, convert to ##
 */
function convertLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith('# ')) {
    return line;
  }

  const headerText = trimmed.slice(2).trim();
  if (isSectionHeader(headerText)) {
    return line; // Keep section headers as #
  }

  // Convert item titles to ##
  return line.replace(/^(\s*)# /, '$1## ');
}

/**
 * Normalize content from old format (### section, # item) to new format (# section, ## item)
 * This provides backward compatibility with existing profile templates
 */
function normalizeProfileFormat(content: string): string {
  if (!content.includes('### ')) {
    return content;
  }

  // Step 1: Convert ### SECTION to # SECTION
  const sectionsNormalized = content.replace(/^### /gm, '# ');

  // Step 2: Convert # Item to ## Item (for non-section headers)
  return sectionsNormalized.split('\n').map(convertLine).join('\n');
}

/**
 * Parse a Profile Template string into structured data
 * @param content - The raw profile template content
 * @returns Parsed profile data
 */
function parseProfileTemplate(content: string): ParsedProfile {
  // Normalize old format to new format before parsing
  const normalizedContent = normalizeProfileFormat(content);
  return parseTemplate(normalizedContent);
}

/**
 * Extract all education items from parsed profile
 * @param parsedProfile - Result from parseProfileTemplate()
 * @returns Array of education items
 */
function extractEducation(parsedProfile: ParsedProfile): ProfileItem[] {
  return getSectionItems(parsedProfile, 'EDUCATION');
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
    const items = getSectionItems(parsedProfile, key);
    for (const item of items) {
      result.push({ ...item, type });
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
  return getSectionList(parsedProfile, 'INTERESTS');
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

/**
 * Get a specific section
 * @param parsedProfile - Result from parseProfileTemplate()
 * @param sectionName - Name of the section
 * @returns Section data or null
 */
function getProfileSection(
  parsedProfile: ParsedProfile,
  sectionName: string
): ProfileSection | null {
  return getSection(parsedProfile, sectionName);
}

/**
 * Check if a profile section is empty
 * @param parsedProfile - Result from parseProfileTemplate()
 * @param sectionName - Name of the section
 * @returns true if section doesn't exist or is empty
 */
function isProfileSectionEmpty(
  parsedProfile: ParsedProfile,
  sectionName: string
): boolean {
  const section = getSection(parsedProfile, sectionName);
  if (!section) return true;
  return isSectionEmpty(section);
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
  getTopLevelField,
  getName,
  getEmail,
  getProfileSection,
  isProfileSectionEmpty,
};
