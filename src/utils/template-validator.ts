// Unified Template Validator
// Schema-driven validation for MarkdownDB templates (JOB, PROFILE, etc.)
// Philosophy: Validate structure, celebrate creativity

import type {
  ParsedTemplate,
  TemplateSection,
  TemplateItem,
} from './template-parser';
import type { BaseValidationResult, ValidationFix } from './validation-types';

/**
 * Validation result interface with fixes
 */
export interface ValidationResult extends BaseValidationResult {
  fixes: ValidationFix[];
}

/**
 * Section schema definition
 */
export interface SectionSchema {
  required?: boolean;
}

/**
 * Template validation schema
 */
export interface ValidationSchema {
  /** Expected type declaration (JOB, PROFILE, etc.) */
  expectedType: string;

  /** Whether missing type is an error (true) or warning (false) */
  missingTypeIsError?: boolean;

  /** Required top-level fields */
  requiredFields: string[];

  /** Standard top-level fields (for tracking custom fields) */
  standardFields?: string[];

  /** Section schemas */
  sections?: Record<string, SectionSchema>;

  /** Standard section names (for tracking custom sections) */
  standardSections?: string[];

  /** Validate items within sections (for PROFILE which has ## items) */
  validateItems?: boolean;
}

/**
 * Create a fix for inserting the type declaration at the start
 */
function createInsertTypeFix(expectedType: string): ValidationFix {
  return {
    type: 'insert_at_start',
    text: `<${expectedType}>\n`,
    buttonLabel: 'Insert',
    description: `Insert <${expectedType}> declaration`,
  };
}

/**
 * Create a fix for replacing an incorrect type declaration
 */
function createReplaceTypeFix(
  currentType: string,
  expectedType: string
): ValidationFix {
  return {
    type: 'replace_type',
    currentValue: currentType,
    newValue: expectedType,
    buttonLabel: 'Fix',
    description: `Replace <${currentType}> with <${expectedType}>`,
  };
}

/**
 * Create a fix for inserting a missing top-level field
 */
function createInsertFieldFix(fieldName: string): ValidationFix {
  return {
    type: 'insert_top_level_field',
    field: fieldName,
    text: `${fieldName}: `,
    buttonLabel: 'Insert',
    description: `Insert ${fieldName} field`,
  };
}

/**
 * Create a fix for adding a bullet placeholder to an empty section
 */
function createAddBulletFix(sectionName: string): ValidationFix {
  return {
    type: 'add_section_bullet',
    section: sectionName,
    text: '- ',
    buttonLabel: 'Add',
    description: `Add bullet to "${sectionName}"`,
  };
}

/**
 * Create a fix for deleting an empty section
 */
function createDeleteSectionFix(sectionName: string): ValidationFix {
  return {
    type: 'delete_section',
    section: sectionName,
    buttonLabel: 'Delete',
    description: `Delete empty section "${sectionName}"`,
  };
}

/**
 * Create a fix for renaming a section (case correction)
 */
function createRenameSectionFix(
  currentName: string,
  newName: string
): ValidationFix {
  return {
    type: 'rename_section',
    section: currentName,
    currentValue: currentName,
    newValue: newName,
    buttonLabel: 'Fix',
    description: `Rename "${currentName}" to "${newName}"`,
  };
}

/**
 * Create a fix for renaming a field (case correction)
 */
function createRenameFieldFix(
  currentName: string,
  newName: string,
  section?: string
): ValidationFix {
  return {
    type: 'rename_field',
    field: currentName,
    section: section,
    currentValue: currentName,
    newValue: newName,
    buttonLabel: 'Fix',
    description: `Rename "${currentName}" to "${newName}"`,
  };
}

/**
 * Check if a section is empty
 */
function isSectionEmpty(section: TemplateSection): boolean {
  const hasItems = section.items && section.items.length > 0;
  const hasList = section.list && section.list.length > 0;
  const hasText = section.text && section.text.length > 0;
  const hasFields = section.fields && Object.keys(section.fields).length > 0;
  return !hasItems && !hasList && !hasText && !hasFields;
}

/**
 * Validate a parsed template against a schema
 */
export function validateTemplate(
  parsed: ParsedTemplate,
  schema: ValidationSchema
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
    customFields: [],
    customSections: [],
    fixes: [],
  };

  if (!parsed) {
    result.valid = false;
    result.errors.push({
      type: 'invalid_input',
      message: 'No parsed template provided',
    });
    return result;
  }

  // Validate type declaration
  validateType(parsed, schema, result);

  // Validate required top-level fields
  validateRequiredFields(parsed, schema, result);

  // Validate top-level field case
  validateFieldCase(parsed, schema, result);

  // Validate sections
  validateSections(parsed, schema, result);

  // Add info messages about custom content
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
 * Validate type declaration
 */
function validateType(
  parsed: ParsedTemplate,
  schema: ValidationSchema,
  result: ValidationResult
): void {
  if (!parsed.type) {
    const fix = createInsertTypeFix(schema.expectedType);
    const message = {
      type: 'missing_type',
      message: `Missing <${schema.expectedType}> type declaration at the start`,
      fix,
    };

    if (schema.missingTypeIsError) {
      result.errors.push(message);
      result.valid = false;
    } else {
      result.warnings.push(message);
    }
    result.fixes.push(fix);
  } else if (parsed.type !== schema.expectedType) {
    const fix = createReplaceTypeFix(parsed.type, schema.expectedType);
    result.warnings.push({
      type: 'unexpected_type',
      message: `Expected <${schema.expectedType}> but found <${parsed.type}>`,
      fix,
    });
    result.fixes.push(fix);
  }
}

/**
 * Validate required top-level fields
 */
function validateRequiredFields(
  parsed: ParsedTemplate,
  schema: ValidationSchema,
  result: ValidationResult
): void {
  const fields = parsed.topLevelFields || {};

  for (const requiredField of schema.requiredFields) {
    if (!fields[requiredField] || fields[requiredField].trim() === '') {
      const fix = createInsertFieldFix(requiredField);
      result.errors.push({
        type: 'missing_required_field',
        field: requiredField,
        message: `Missing required field "${requiredField}"`,
        fix,
      });
      result.fixes.push(fix);
      result.valid = false;
    }
  }
}

/**
 * Validate field case (warn on lowercase)
 */
function validateFieldCase(
  parsed: ParsedTemplate,
  schema: ValidationSchema,
  result: ValidationResult
): void {
  const fields = parsed.topLevelFields || {};
  const standardFields = schema.standardFields || [];

  for (const fieldName of Object.keys(fields)) {
    // Check for lowercase field name
    if (fieldName !== fieldName.toUpperCase()) {
      const fix = createRenameFieldFix(fieldName, fieldName.toUpperCase());
      result.warnings.push({
        type: 'lowercase_key',
        field: fieldName,
        suggestedValue: fieldName.toUpperCase(),
        message: `Field "${fieldName}" should be uppercase`,
        fix,
      });
    }

    // Track custom fields
    if (!standardFields.includes(fieldName.toUpperCase())) {
      result.customFields.push(fieldName);
    }
  }
}

/**
 * Validate sections
 */
function validateSections(
  parsed: ParsedTemplate,
  schema: ValidationSchema,
  result: ValidationResult
): void {
  const sections = parsed.sections || {};
  const sectionSchemas = schema.sections || {};
  const standardSections = schema.standardSections || [];
  const seenSections = new Set<string>();

  // Check for required sections
  for (const [sectionName, sectionSchema] of Object.entries(sectionSchemas)) {
    if (sectionSchema.required) {
      const section = sections[sectionName];
      if (!section) {
        result.errors.push({
          type: 'missing_required_section',
          section: sectionName,
          message: `Required section "${sectionName}" is missing`,
        });
        result.valid = false;
      } else if (isSectionEmpty(section)) {
        const fix = createAddBulletFix(sectionName);
        result.warnings.push({
          type: 'empty_section',
          section: sectionName,
          message: `Required section "${sectionName}" is empty`,
          fix,
        });
        result.fixes.push(fix);
      }
    }
  }

  // Validate each section
  for (const sectionName of Object.keys(sections)) {
    const section = sections[sectionName];
    const originalName = section.originalName || sectionName;
    const normalizedName = sectionName.toUpperCase();

    // Check for duplicate sections (case-insensitive)
    if (seenSections.has(normalizedName)) {
      result.warnings.push({
        type: 'duplicate_section',
        section: originalName,
        message: `Duplicate section "${originalName}" - consider merging`,
      });
    }
    seenSections.add(normalizedName);

    // Check for lowercase section header (compare original to normalized)
    if (originalName !== normalizedName) {
      const fix = createRenameSectionFix(originalName, normalizedName);
      result.warnings.push({
        type: 'lowercase_section',
        section: originalName,
        suggestedValue: normalizedName,
        message: `Section "${originalName}" should be uppercase`,
        fix,
      });
      result.fixes.push(fix);
    }

    // Get schema for this section
    const sectionSchema =
      sectionSchemas[sectionName] || sectionSchemas[normalizedName];

    // Check for empty section (if not required - required sections handled above)
    if (isSectionEmpty(section) && !sectionSchema?.required) {
      const fix = createDeleteSectionFix(originalName);
      result.warnings.push({
        type: 'empty_section',
        section: originalName,
        message: `Section "${originalName}" is empty`,
        fix,
      });
      result.fixes.push(fix);
    }

    // Check for mixed patterns (items + orphan bullets in same section)
    const hasItems = section.items && section.items.length > 0;
    const hasList = section.list && section.list.length > 0;
    if (hasItems && hasList) {
      result.warnings.push({
        type: 'mixed_patterns',
        section: sectionName,
        message: `Section "${sectionName}" has both items and orphan bullets - consider restructuring`,
      });
    }

    // Track custom sections
    if (!standardSections.includes(normalizedName)) {
      result.customSections.push(sectionName);
    }

    // Validate items within section (if enabled - for PROFILE)
    if (schema.validateItems && section.items) {
      for (const item of section.items) {
        validateItem(sectionName, item, result);
      }
    }
  }
}

/**
 * Validate an item within a section (for PROFILE templates)
 */
function validateItem(
  sectionName: string,
  item: TemplateItem,
  result: ValidationResult
): void {
  // Check for lowercase field keys within item
  for (const fieldName of Object.keys(item.fields)) {
    if (fieldName !== fieldName.toUpperCase()) {
      const fix = createRenameFieldFix(
        fieldName,
        fieldName.toUpperCase(),
        sectionName
      );
      result.warnings.push({
        type: 'lowercase_key',
        section: sectionName,
        field: fieldName,
        suggestedValue: fieldName.toUpperCase(),
        message: `Field "${fieldName}" in "${item.title}" should be uppercase`,
        fix,
      });
    }
  }
}

/**
 * Get a human-readable summary of validation results
 */
export function getValidationSummary(
  validationResult: ValidationResult
): string {
  const parts: string[] = [];

  if (validationResult.valid) {
    parts.push('Template is valid!');
  } else {
    parts.push('Template has errors that should be fixed.');
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
