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
  getSectionText,
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
 * Normalize content from old format (### section, # item) to new format (# section, ## item)
 * This provides backward compatibility with existing profile templates
 */
function normalizeProfileFormat(content: string): string {
  // If content uses old format (### for sections), convert it
  if (content.includes('### ')) {
    return (
      content
        // Convert ### SECTION to # SECTION (must do this first)
        .replace(/^### /gm, '# ')
        // Convert # Item Title to ## Item Title (only for lines that aren't sections)
        // We need to be careful here - after the above replacement, we need to identify items
        // Items are lines starting with # that are NOT uppercase section names
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          // Check if this is a # line that's NOT a section (i.e., it's an item title)
          // Sections are typically ALL CAPS or Title Case with spaces
          // Items are typically mixed case like "Senior Engineer at Acme Corp"
          if (trimmed.startsWith('# ')) {
            const afterHash = trimmed.slice(2).trim();
            // If it looks like a section name (ALL CAPS with possible spaces), keep as #
            // Otherwise, convert to ## for item
            if (afterHash.match(/^[A-Z][A-Z ]+$/)) {
              return line; // Keep as section
            } else {
              return line.replace(/^(\s*)# /, '$1## '); // Convert to item
            }
          }
          return line;
        })
        .join('\n')
    );
  }
  return content;
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
 * Extract skills list from parsed profile
 * @param parsedProfile - Result from parseProfileTemplate()
 * @returns Array of skill strings
 */
function extractSkills(parsedProfile: ParsedProfile): string[] {
  return getSectionList(parsedProfile, 'SKILLS');
}

/**
 * Extract summary text from parsed profile
 * @param parsedProfile - Result from parseProfileTemplate()
 * @returns Summary as a single string (lines joined)
 */
function extractSummary(parsedProfile: ParsedProfile): string {
  return getSectionText(parsedProfile, 'SUMMARY').join(' ');
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
  extractSkills,
  extractSummary,
  getTopLevelField,
  getName,
  getEmail,
  getProfileSection,
  isProfileSectionEmpty,
};
