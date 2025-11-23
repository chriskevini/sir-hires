// Profile Template Parser
// Parses MarkdownDB Profile Template format into structured data

/**
 * Parse a Profile Template string into structured data
 * @param {string} content - The raw profile template content
 * @returns {Object} Parsed profile data with structure:
 *   {
 *     type: string,           // Should be "PROFILE"
 *     topLevelFields: {},     // Top-level KEY: value pairs
 *     sections: {},           // Sections (# SECTION_NAME)
 *     raw: string             // Original content
 *   }
 */
function parseProfileTemplate(content) {
  if (!content || typeof content !== 'string') {
    return {
      type: null,
      topLevelFields: {},
      sections: {},
      raw: content || '',
    };
  }

  const lines = content.split('\n');
  const result = {
    type: null,
    topLevelFields: {},
    sections: {},
    raw: content,
  };

  let currentSection = null;
  let currentEntry = null;
  let currentList = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('//')) {
      continue;
    }

    // Check for <PROFILE> type declaration
    if (trimmedLine.match(/^<(\w+)>$/)) {
      result.type = trimmedLine.match(/^<(\w+)>$/)[1];
      continue;
    }

    // Check for section header (# SECTION_NAME)
    if (trimmedLine.match(/^#\s+([A-Z_]+):?(\s|\/\/|$)/)) {
      const sectionName = trimmedLine.match(/^#\s+([A-Z_]+):?(\s|\/\/|$)/)[1];
      currentSection = sectionName;
      currentEntry = null;
      currentList = null;
      result.sections[currentSection] = {
        entries: {},
        list: [], // For sections that are just lists (e.g., # INTERESTS:)
      };
      continue;
    }

    // Check for entry header (## ENTRY_ID)
    if (trimmedLine.match(/^##\s+(\w+)$/)) {
      const entryId = trimmedLine.match(/^##\s+(\w+)$/)[1];
      if (currentSection) {
        currentEntry = entryId;
        currentList = null;
        result.sections[currentSection].entries[currentEntry] = {
          fields: {},
          lists: {},
        };
      }
      continue;
    }

    // Check for list declaration (KEY:)
    if (trimmedLine.match(/^([A-Z_]+):$/)) {
      const listName = trimmedLine.match(/^([A-Z_]+):$/)[1];
      currentList = listName;

      if (currentEntry && currentSection) {
        // List within an entry
        result.sections[currentSection].entries[currentEntry].lists[listName] =
          [];
      } else if (currentSection) {
        // List within a section (no entry)
        result.sections[currentSection].lists =
          result.sections[currentSection].lists || {};
        result.sections[currentSection].lists[listName] = [];
      }
      continue;
    }

    // Check for list item (- item)
    if (trimmedLine.match(/^-\s+(.+)$/)) {
      const itemValue = trimmedLine.match(/^-\s+(.+)$/)[1];

      if (currentList && currentEntry && currentSection) {
        // List item within an entry
        result.sections[currentSection].entries[currentEntry].lists[
          currentList
        ].push(itemValue);
      } else if (currentList && currentSection) {
        // List item within a section
        result.sections[currentSection].lists[currentList].push(itemValue);
      } else if (currentSection && !currentEntry) {
        // Direct list under section (e.g., # INTERESTS: - item)
        result.sections[currentSection].list.push(itemValue);
      }
      continue;
    }

    // Check for key-value pair (KEY: value)
    if (trimmedLine.match(/^([A-Z_]+):\s*(.*)$/)) {
      const match = trimmedLine.match(/^([A-Z_]+):\s*(.*)$/);
      const key = match[1];
      let value = match[2].trim();

      // Remove inline comments (// comment)
      if (value.includes('//')) {
        value = value.split('//')[0].trim();
      }

      if (currentEntry && currentSection) {
        // Field within an entry
        result.sections[currentSection].entries[currentEntry].fields[key] =
          value;
      } else if (currentSection) {
        // Field within a section (but not an entry)
        result.sections[currentSection].fields =
          result.sections[currentSection].fields || {};
        result.sections[currentSection].fields[key] = value;
      } else {
        // Top-level field
        result.topLevelFields[key] = value;
      }
      continue;
    }
  }

  return result;
}

/**
 * Extract all education entries from parsed profile
 * @param {Object} parsedProfile - Result from parseProfileTemplate()
 * @returns {Array} Array of education entries
 */
function extractEducation(parsedProfile) {
  if (!parsedProfile.sections.EDUCATION) {
    return [];
  }

  const entries = parsedProfile.sections.EDUCATION.entries;
  return Object.keys(entries).map((entryId) => ({
    id: entryId,
    ...entries[entryId].fields,
  }));
}

/**
 * Extract all experience entries from parsed profile
 * @param {Object} parsedProfile - Result from parseProfileTemplate()
 * @returns {Array} Array of experience entries with type, fields, and bullets
 */
function extractExperience(parsedProfile) {
  if (!parsedProfile.sections.EXPERIENCE) {
    return [];
  }

  const entries = parsedProfile.sections.EXPERIENCE.entries;
  return Object.keys(entries).map((entryId) => ({
    id: entryId,
    ...entries[entryId].fields,
    bullets: entries[entryId].lists.BULLETS || [],
  }));
}

/**
 * Extract interests list from parsed profile
 * @param {Object} parsedProfile - Result from parseProfileTemplate()
 * @returns {Array} Array of interest strings
 */
function extractInterests(parsedProfile) {
  if (!parsedProfile.sections.INTERESTS) {
    return [];
  }

  return parsedProfile.sections.INTERESTS.list || [];
}

/**
 * Get a specific top-level field value
 * @param {Object} parsedProfile - Result from parseProfileTemplate()
 * @param {string} fieldName - Name of the field (e.g., 'NAME', 'EMAIL')
 * @returns {string|null} Field value or null if not found
 */
function getTopLevelField(parsedProfile, fieldName) {
  return parsedProfile.topLevelFields[fieldName] || null;
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
};
