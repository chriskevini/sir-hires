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
