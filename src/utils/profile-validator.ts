// Profile Template Validator
// Validates parsed MarkdownDB Profile Template against schema rules
// Philosophy: Validate structure, celebrate creativity
//
// New format (v2):
// - ### SECTION for section headers
// - # Item Title for items within sections
// - Only NAME is required - everything else optional
// - Custom sections/fields are encouraged

import type { ParsedProfile } from './profile-parser';
import type { BaseValidationResult, ValidationFix } from './validation-types';

/**
 * Profile validation result interface
 */
export interface ProfileValidationResult extends BaseValidationResult {
  fixes?: ValidationFix[];
}

/**
 * Standard section names (canonical form)
 * Used for typo detection and case normalization
 */
const STANDARD_SECTIONS = [
  'EDUCATION',
  'PROFESSIONAL EXPERIENCE',
  'TECHNICAL PROJECT EXPERIENCE',
  'VOLUNTEER',
  'INTERESTS',
  'SKILLS',
  'CERTIFICATIONS',
];

/**
 * Standard top-level field names
 */
const STANDARD_TOP_LEVEL_FIELDS = [
  'NAME',
  'ADDRESS',
  'EMAIL',
  'PHONE',
  'WEBSITE',
  'GITHUB',
  'LINKEDIN',
];

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
    fixes: [],
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
    result.warnings.push({
      type: 'missing_type',
      message: 'Missing <PROFILE> type declaration at the start',
    });
  } else if (parsedProfile.type !== 'PROFILE') {
    result.warnings.push({
      type: 'unexpected_type',
      message: `Expected <PROFILE> but found <${parsedProfile.type}>`,
    });
  }

  // Validate required field: NAME
  validateRequiredName(parsedProfile, result);

  // Validate top-level fields
  validateTopLevelFields(parsedProfile, result);

  // Validate sections
  validateSections(parsedProfile, result);

  // Add informational messages about custom content
  if (result.customFields.length > 0) {
    result.info.push({
      type: 'custom_fields',
      message: `Custom fields: ${result.customFields.join(', ')}`,
    });
  }

  if (result.customSections.length > 0) {
    result.info.push({
      type: 'custom_sections',
      message: `Custom sections: ${result.customSections.join(', ')}`,
    });
  }

  return result;
}

/**
 * Validate NAME field is present (only required field)
 */
function validateRequiredName(
  parsedProfile: ParsedProfile,
  result: ProfileValidationResult
): void {
  const name = parsedProfile.topLevelFields.NAME;
  if (!name || name.trim() === '') {
    result.valid = false;
    result.errors.push({
      type: 'missing_required_field',
      field: 'NAME',
      message: 'Missing required field "NAME"',
    });
  }
}

/**
 * Validate top-level fields
 */
function validateTopLevelFields(
  parsedProfile: ParsedProfile,
  result: ProfileValidationResult
): void {
  const fields = parsedProfile.topLevelFields || {};

  for (const fieldName of Object.keys(fields)) {
    // Check for lowercase field name
    if (fieldName !== fieldName.toUpperCase()) {
      result.warnings.push({
        type: 'lowercase_key',
        field: fieldName,
        suggestedValue: fieldName.toUpperCase(),
        message: `Field "${fieldName}" should be uppercase`,
      });
    }

    // Track custom fields
    if (!STANDARD_TOP_LEVEL_FIELDS.includes(fieldName.toUpperCase())) {
      result.customFields.push(fieldName);
    }
  }
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
  const seenSections = new Set<string>();

  for (const sectionName of sectionNames) {
    const section = sections[sectionName];
    const normalizedName = sectionName.toUpperCase();

    // Check for duplicate sections
    if (seenSections.has(normalizedName)) {
      result.warnings.push({
        type: 'duplicate_section',
        section: sectionName,
        message: `Duplicate section "${sectionName}" - consider merging`,
      });
    }
    seenSections.add(normalizedName);

    // Check for lowercase section header
    if (sectionName !== normalizedName) {
      result.warnings.push({
        type: 'lowercase_section',
        section: sectionName,
        suggestedValue: normalizedName,
        message: `Section "${sectionName}" should be uppercase`,
      });
    }

    // Check for empty section
    const hasItems = section.items && section.items.length > 0;
    const hasList = section.list && section.list.length > 0;
    if (!hasItems && !hasList) {
      result.warnings.push({
        type: 'empty_section',
        section: sectionName,
        message: `Section "${sectionName}" is empty`,
      });
      // Add delete fix
      result.fixes?.push({
        type: 'delete_section',
        section: sectionName,
        buttonLabel: 'Delete',
        description: `Delete empty section "${sectionName}"`,
      });
    }

    // Check for mixed patterns (items + orphan bullets in same section)
    if (hasItems && hasList) {
      result.warnings.push({
        type: 'mixed_patterns',
        section: sectionName,
        message: `Section "${sectionName}" has both items and orphan bullets - consider restructuring`,
      });
    }

    // Track custom sections
    if (!STANDARD_SECTIONS.includes(normalizedName)) {
      result.customSections.push(sectionName);
    }

    // Validate items within section
    if (section.items) {
      for (const item of section.items) {
        validateItem(sectionName, item, result);
      }
    }
  }
}

/**
 * Validate an item within a section
 */
function validateItem(
  sectionName: string,
  item: { title: string; fields: Record<string, string>; bullets: string[] },
  result: ProfileValidationResult
): void {
  // Check for lowercase field keys within item
  for (const fieldName of Object.keys(item.fields)) {
    if (fieldName !== fieldName.toUpperCase()) {
      result.warnings.push({
        type: 'lowercase_key',
        section: sectionName,
        field: fieldName,
        suggestedValue: fieldName.toUpperCase(),
        message: `Field "${fieldName}" in "${item.title}" should be uppercase`,
      });
    }
  }
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
    parts.push('Profile is valid!');
  } else {
    parts.push('Profile has errors that should be fixed.');
  }

  if (validationResult.errors.length > 0) {
    parts.push(`\n\nErrors (${validationResult.errors.length}):`);
    validationResult.errors.forEach((err) => {
      parts.push(`  - ${err.message}`);
    });
  }

  if (validationResult.warnings.length > 0) {
    parts.push(`\n\nWarnings (${validationResult.warnings.length}):`);
    validationResult.warnings.forEach((warn) => {
      parts.push(`  - ${warn.message}`);
    });
  }

  if (validationResult.info.length > 0) {
    parts.push(`\n\nInfo (${validationResult.info.length}):`);
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
  STANDARD_SECTIONS,
  STANDARD_TOP_LEVEL_FIELDS,
};
