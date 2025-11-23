// Profile Template Validator
// Validates parsed MarkdownDB Profile Template against schema rules
// Philosophy: Validate structure, celebrate creativity

import type {
  ValidationMessage,
  BaseValidationResult,
} from './validation-types';

/**
 * Profile validation result interface
 */
export interface ProfileValidationResult extends BaseValidationResult {}

/**
 * Profile section schema
 */
interface SectionSchema {
  required?: string[];
  optional?: string[];
  isList?: boolean;
  enums?: Record<string, string[]>;
}

/**
 * Profile schema definition
 */
interface ProfileSchema {
  topLevelRequired: string[];
  topLevelOptional: string[];
  standardSections: Record<string, SectionSchema>;
}

/**
 * Parsed profile data structure
 */
interface ParsedProfile {
  type: string | null;
  topLevelFields: Record<string, string>;
  sections: Record<
    string,
    {
      list?: string[];
      entries?: Record<string, { fields: Record<string, string> }>;
    }
  >;
  raw: string;
}

/**
 * Validation schema for standard Profile Template fields
 * Note: This is NOT exhaustive - custom fields are ENCOURAGED
 */
const PROFILE_SCHEMA: ProfileSchema = {
  // Top-level required fields
  topLevelRequired: ['NAME'],

  // Top-level optional standard fields
  topLevelOptional: [
    'ADDRESS',
    'EMAIL',
    'PHONE',
    'WEBSITE',
    'GITHUB',
    'LINKEDIN',
  ],

  // Standard sections
  standardSections: {
    EDUCATION: {
      required: ['DEGREE', 'SCHOOL'],
      optional: ['LOCATION', 'START', 'END', 'GPA'],
    },
    EXPERIENCE: {
      required: ['TYPE', 'TITLE'],
      optional: ['AT', 'START', 'END', 'BULLETS'],
      enums: {
        TYPE: ['PROFESSIONAL', 'PROJECT', 'VOLUNTEER'],
      },
    },
    INTERESTS: {
      isList: true, // Section is just a list, no entries
    },
  },
};

/**
 * Validate a parsed profile template
 * @param parsedProfile - Result from parseProfileTemplate()
 * @returns Validation result with errors, warnings, and info
 */
function validateProfileTemplate(
  parsedProfile: ParsedProfile
): ProfileValidationResult {
  const result: ProfileValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
    customFields: [],
    customSections: [],
  };

  if (!parsedProfile) {
    result.valid = false;
    result.errors.push({
      type: 'invalid_input',
      message: 'No parsed profile provided',
    });
    return result;
  }

  // Validate type declaration
  if (!parsedProfile.type) {
    result.errors.push({
      type: 'missing_type',
      message: 'Missing <PROFILE> type declaration at the start',
    });
    result.valid = false;
  } else if (parsedProfile.type !== 'PROFILE') {
    result.warnings.push({
      type: 'unexpected_type',
      message: `Expected <PROFILE> but found <${parsedProfile.type}>`,
    });
  }

  // Validate top-level fields
  validateTopLevelFields(parsedProfile, result);

  // Validate sections
  validateSections(parsedProfile, result);

  // Add informational messages about custom content
  if (result.customFields.length > 0) {
    result.info.push({
      type: 'custom_fields',
      message: `Your profile includes ${result.customFields.length} custom field(s): ${result.customFields.join(', ')}. These are fully supported and will be preserved.`,
    });
  }

  if (result.customSections.length > 0) {
    result.info.push({
      type: 'custom_sections',
      message: `Your profile includes ${result.customSections.length} custom section(s): ${result.customSections.join(', ')}. These are fully supported and will be preserved.`,
    });
  }

  return result;
}

/**
 * Validate top-level fields
 */
function validateTopLevelFields(
  parsedProfile: ParsedProfile,
  result: ProfileValidationResult
): void {
  const fields = parsedProfile.topLevelFields || {};
  const fieldNames = Object.keys(fields);

  // Check required fields
  PROFILE_SCHEMA.topLevelRequired.forEach((requiredField) => {
    if (!fields[requiredField] || fields[requiredField].trim() === '') {
      result.errors.push({
        type: 'missing_required_field',
        field: requiredField,
        message: `Required field "${requiredField}" is missing or empty`,
      });
      result.valid = false;
    }
  });

  // Identify custom fields
  const standardFields = [
    ...PROFILE_SCHEMA.topLevelRequired,
    ...PROFILE_SCHEMA.topLevelOptional,
  ];
  fieldNames.forEach((fieldName) => {
    if (!standardFields.includes(fieldName)) {
      result.customFields.push(fieldName);
    }
  });
}

/**
 * Validate sections
 */
function validateSections(
  parsedProfile: ParsedProfile,
  result: ProfileValidationResult
): void {
  const sections = parsedProfile.sections || {};
  const sectionNames = Object.keys(sections);

  sectionNames.forEach((sectionName) => {
    const section = sections[sectionName];
    const schema = PROFILE_SCHEMA.standardSections[sectionName];

    if (!schema) {
      // Custom section - this is encouraged!
      result.customSections.push(sectionName);
      return;
    }

    // Validate standard section
    if (schema.isList) {
      // Section is just a list (e.g., INTERESTS)
      validateListSection(sectionName, section, result);
    } else {
      // Section has entries with fields
      validateEntrySection(sectionName, section, schema, result);
    }
  });
}

/**
 * Validate a list-type section (e.g., INTERESTS)
 */
function validateListSection(
  sectionName: string,
  section: {
    list?: string[];
    entries?: Record<string, { fields: Record<string, string> }>;
  },
  result: ProfileValidationResult
): void {
  if (!section.list || section.list.length === 0) {
    result.warnings.push({
      type: 'empty_section',
      section: sectionName,
      message: `Section "${sectionName}" is empty`,
    });
  }
}

/**
 * Validate an entry-based section (e.g., EDUCATION, EXPERIENCE)
 */
function validateEntrySection(
  sectionName: string,
  section: {
    list?: string[];
    entries?: Record<string, { fields: Record<string, string> }>;
  },
  schema: SectionSchema,
  result: ProfileValidationResult
): void {
  const entries = section.entries || {};
  const entryIds = Object.keys(entries);

  if (entryIds.length === 0) {
    result.warnings.push({
      type: 'empty_section',
      section: sectionName,
      message: `Section "${sectionName}" has no entries`,
    });
    return;
  }

  entryIds.forEach((entryId) => {
    const entry = entries[entryId];
    const fields = entry.fields || {};

    // Check required fields
    if (schema.required) {
      schema.required.forEach((requiredField) => {
        if (!fields[requiredField] || fields[requiredField].trim() === '') {
          result.errors.push({
            type: 'missing_required_field',
            section: sectionName,
            entry: entryId,
            field: requiredField,
            message: `Required field "${requiredField}" is missing in ${sectionName}.${entryId}`,
          });
          result.valid = false;
        }
      });
    }

    // Validate enum fields
    if (schema.enums) {
      Object.keys(schema.enums).forEach((enumField) => {
        const value = fields[enumField];
        const allowedValues = schema.enums![enumField];

        if (value && !allowedValues.includes(value)) {
          result.errors.push({
            type: 'invalid_enum_value',
            section: sectionName,
            entry: entryId,
            field: enumField,
            value: value,
            allowedValues: allowedValues,
            message: `Invalid value "${value}" for ${enumField} in ${sectionName}.${entryId}. Allowed values: ${allowedValues.join(', ')}`,
          });
          result.valid = false;
        }
      });
    }

    // Identify custom fields in this entry
    const standardFields = [
      ...(schema.required || []),
      ...(schema.optional || []),
    ];
    const customEntryFields = Object.keys(fields).filter(
      (f) => !standardFields.includes(f)
    );

    if (customEntryFields.length > 0) {
      result.info.push({
        type: 'custom_entry_fields',
        section: sectionName,
        entry: entryId,
        fields: customEntryFields,
        message: `Entry ${sectionName}.${entryId} includes custom field(s): ${customEntryFields.join(', ')}`,
      });
    }
  });
}

/**
 * Get a human-readable summary of validation results
 * @param validationResult - Result from validateProfileTemplate()
 * @returns Summary text
 */
function getProfileValidationSummary(
  validationResult: ProfileValidationResult
): string {
  const parts: string[] = [];

  if (validationResult.valid) {
    parts.push('✅ Profile is valid!');
  } else {
    parts.push('❌ Profile has errors that should be fixed.');
  }

  if (validationResult.errors.length > 0) {
    parts.push(`\n\n🔴 Errors (${validationResult.errors.length}):`);
    validationResult.errors.forEach((err) => {
      parts.push(`  - ${err.message}`);
    });
  }

  if (validationResult.warnings.length > 0) {
    parts.push(`\n\n🟡 Warnings (${validationResult.warnings.length}):`);
    validationResult.warnings.forEach((warn) => {
      parts.push(`  - ${warn.message}`);
    });
  }

  if (validationResult.info.length > 0) {
    parts.push(`\n\nℹ️ Info (${validationResult.info.length}):`);
    validationResult.info.forEach((info) => {
      parts.push(`  - ${info.message}`);
    });
  }

  return parts.join('\n');
}

// Short aliases for convenience
const validateProfile = validateProfileTemplate;

// ES Module exports
export {
  validateProfileTemplate,
  validateProfile,
  getProfileValidationSummary,
  PROFILE_SCHEMA,
};
