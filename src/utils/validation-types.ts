// Shared validation types for job and profile validators
// Provides common interfaces for validation results

/**
 * Validation message interface
 * Used by both job and profile validators
 */
export interface ValidationMessage {
  type: string;
  message: string;
  field?: string;
  section?: string;
  entry?: string; // Used by profile validator for entry-based sections
  value?: string;
  allowedValues?: string[];
  suggestedValue?: string; // For typo/case fix suggestions
  fields?: string[]; // Used by profile validator for field lists
  fix?: ValidationFix | null; // Optional fix action for this message
}

/**
 * Base validation result interface
 */
export interface BaseValidationResult {
  valid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
  customFields: string[];
  customSections: string[];
}

/**
 * Valid fix types for validation autofix
 */
export type ValidationFixType =
  | 'insert_at_start'
  | 'insert_top_level_field'
  | 'insert_field_in_entry'
  | 'replace_enum_value_multi'
  | 'replace_type'
  | 'rename_entry_id'
  | 'rename_section'
  | 'rename_field'
  | 'add_section_bullet'
  | 'delete_section';

/**
 * Validation fix interface
 * Represents an actionable fix for a validation error/warning
 */
export interface ValidationFix {
  type: ValidationFixType;
  text?: string;
  buttonLabel?: string;
  description?: string;
  section?: string;
  entry?: string;
  field?: string;
  currentValue?: string;
  newValue?: string; // For rename operations
  allowedValues?: string[];
}
