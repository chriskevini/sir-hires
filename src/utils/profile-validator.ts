// Profile Template Validator
// Thin wrapper around unified template validator with profile-specific schema

import type { ParsedProfile } from './profile-parser';
import {
  validateTemplate,
  getValidationSummary,
  type ValidationResult,
  type ValidationSchema,
} from './template-validator';

/**
 * Profile validation result interface (alias for unified result)
 */
export type ProfileValidationResult = ValidationResult;

/**
 * Profile validation schema
 */
const PROFILE_SCHEMA: ValidationSchema = {
  expectedType: 'PROFILE',
  missingTypeIsError: false, // Missing type is a warning for profiles
  requiredFields: ['NAME'],
  sections: {},
  validateItems: true, // Profiles have ## items with fields
};

/**
 * Validate a parsed profile template
 * @param parsedProfile - Result from parseProfileTemplate()
 * @returns Validation result with errors, warnings, and info
 */
function validateProfileTemplate(
  parsedProfile: ParsedProfile
): ProfileValidationResult {
  if (!parsedProfile) {
    return {
      valid: false,
      errors: [
        { type: 'invalid_input', message: 'No parsed profile provided' },
      ],
      warnings: [],
      info: [],
      fixes: [],
    };
  }

  return validateTemplate(parsedProfile, PROFILE_SCHEMA);
}

/**
 * Get a human-readable summary of validation results
 * @param validationResult - Result from validateProfileTemplate()
 * @returns Summary text
 */
function getProfileValidationSummary(
  validationResult: ProfileValidationResult
): string {
  return getValidationSummary(validationResult);
}

// Short aliases for convenience
const validateProfile = validateProfileTemplate;

// ES Module exports
export {
  validateProfileTemplate,
  validateProfile,
  getProfileValidationSummary,
};
