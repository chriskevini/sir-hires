/**
 * useProfileValidation hook - Validates profile content with debouncing
 * Combines validation logic and debounced validation updates
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { parseProfile } from '@/utils/profile-parser';
import { validateProfile } from '@/utils/profile-validator';

export interface ValidationMessage {
  message: string;
  type?: string;
  section?: string;
  entry?: string;
  field?: string;
  value?: string;
  allowedValues?: string[];
  suggestedValue?: string; // For typo fixes
}

export interface ValidationResult {
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
  customFields: string[];
  customSections: string[];
}

export interface ValidationFix {
  type: string;
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

interface UseProfileValidationOptions {
  content: string;
  debounceMs?: number;
}

const EMPTY_VALIDATION: ValidationResult = {
  errors: [],
  warnings: [],
  info: [],
  customFields: [],
  customSections: [],
};

/**
 * Validates profile template content with debouncing
 * @param options.content - The content to validate
 * @param options.debounceMs - Debounce delay in milliseconds (default: 500)
 * @returns Validation result and fixes
 */
export function useProfileValidation({
  content,
  debounceMs = 500,
}: UseProfileValidationOptions) {
  const [validation, setValidation] =
    useState<ValidationResult>(EMPTY_VALIDATION);
  const [validationFixes, setValidationFixes] = useState<
    (ValidationFix | null)[]
  >([]);
  const [warningFixes, setWarningFixes] = useState<(ValidationFix | null)[]>(
    []
  );
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const generateFix = useCallback(
    (message: ValidationMessage): ValidationFix | null => {
      if (!message || !message.type) {
        return null;
      }

      switch (message.type) {
        // === ERROR FIXES ===
        case 'missing_type':
          return {
            type: 'insert_at_start',
            text: '<PROFILE>\n',
            buttonLabel: 'Add <PROFILE>',
            description: 'Insert <PROFILE> at the start',
          };

        case 'missing_required_field':
          if (message.section && message.entry) {
            return {
              type: 'insert_field_in_entry',
              section: message.section,
              entry: message.entry,
              field: message.field!,
              text: `${message.field}: `,
              buttonLabel: `Add ${message.field}`,
              description: `Insert ${message.field} field in ${message.section}.${message.entry}`,
            };
          } else {
            return {
              type: 'insert_top_level_field',
              field: message.field!,
              text: `${message.field}: `,
              buttonLabel: `Add ${message.field}`,
              description: `Insert ${message.field} field after <PROFILE>`,
            };
          }

        case 'invalid_enum_value':
          return {
            type: 'replace_enum_value_multi',
            section: message.section,
            entry: message.entry,
            field: message.field,
            currentValue: message.value,
            allowedValues: message.allowedValues,
            description: 'Replace with correct value',
          };

        // === WARNING FIXES ===
        case 'duplicate_entry_id':
          // Entry ID is duplicated - rename to next available
          return {
            type: 'rename_entry_id',
            section: message.section,
            entry: message.entry,
            currentValue: message.entry,
            buttonLabel: 'Rename',
            description: `Rename duplicate entry ID "${message.entry}" to next available`,
          };

        case 'possible_section_typo': {
          // Use suggestedValue from validation message
          const suggestedSection = message.suggestedValue;
          if (suggestedSection) {
            return {
              type: 'rename_section',
              section: message.section,
              currentValue: message.section,
              newValue: suggestedSection,
              buttonLabel: `→ ${suggestedSection}`,
              description: `Rename section "${message.section}" to "${suggestedSection}"`,
            };
          }
          return null;
        }

        case 'section_name_case': {
          // Use suggestedValue from validation message
          const uppercaseSection = message.suggestedValue;
          if (uppercaseSection) {
            return {
              type: 'rename_section',
              section: message.section,
              currentValue: message.section,
              newValue: uppercaseSection,
              buttonLabel: `→ ${uppercaseSection}`,
              description: `Rename section "${message.section}" to "${uppercaseSection}"`,
            };
          }
          return null;
        }

        case 'invalid_entry_id':
          // Entry ID doesn't follow naming convention - rename
          return {
            type: 'rename_entry_id',
            section: message.section,
            entry: message.entry,
            currentValue: message.entry,
            buttonLabel: 'Rename',
            description: `Rename entry ID "${message.entry}" to follow naming convention`,
          };

        case 'empty_section':
          // Empty section - offer to delete
          return {
            type: 'delete_section',
            section: message.section,
            buttonLabel: 'Delete',
            description: `Delete empty section "${message.section}"`,
          };

        default:
          return null;
      }
    },
    []
  );

  const runValidation = useCallback(
    (content: string) => {
      if (!content || content.trim().length === 0) {
        setValidation(EMPTY_VALIDATION);
        setValidationFixes([]);
        setWarningFixes([]);
        return;
      }

      try {
        const parsed = parseProfile(content);
        const validationResult = validateProfile(parsed);

        setValidation(validationResult);

        // Generate fixes for errors
        const errorFixes = validationResult.errors.map(
          (error: ValidationMessage) => generateFix(error)
        );
        setValidationFixes(errorFixes);

        // Generate fixes for warnings
        const warnFixes = validationResult.warnings.map(
          (warning: ValidationMessage) => generateFix(warning)
        );
        setWarningFixes(warnFixes);
      } catch (error: unknown) {
        const err = error as Error;
        setValidation({
          errors: [{ message: `Parse error: ${err.message}` }],
          warnings: [],
          info: [],
          customFields: [],
          customSections: [],
        });
        setValidationFixes([]);
        setWarningFixes([]);
      }
    },
    [generateFix]
  );

  const scheduleValidation = useCallback(() => {
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    validationTimerRef.current = setTimeout(() => {
      runValidation(content);
    }, debounceMs);
  }, [content, debounceMs, runValidation]);

  // Run validation when content changes (debounced)
  useEffect(() => {
    scheduleValidation();
  }, [scheduleValidation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, []);

  return {
    validation,
    validationFixes,
    warningFixes,
  };
}
