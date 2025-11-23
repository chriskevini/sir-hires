/**
 * useProfileValidation hook - Validates profile content with debouncing
 * Combines validation logic and debounced validation updates
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { parseProfile } from '@/utils/profile-parser';
import { validateProfile } from '@/utils/profile-validator';

export interface ValidationError {
  message: string;
  type?: string;
  section?: string;
  entry?: string;
  field?: string;
  value?: string;
  allowedValues?: string[];
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: { message: string }[];
  info: { message: string }[];
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
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const generateFix = useCallback(
    (error: ValidationError): ValidationFix | null => {
      if (!error || !error.type) {
        return null;
      }

      switch (error.type) {
        case 'missing_type':
          return {
            type: 'insert_at_start',
            text: '<PROFILE>\n',
            buttonLabel: 'Add <PROFILE>',
            description: 'Insert <PROFILE> at the start',
          };

        case 'missing_required_field':
          if (error.section && error.entry) {
            return {
              type: 'insert_field_in_entry',
              section: error.section,
              entry: error.entry,
              field: error.field!,
              text: `${error.field}: `,
              buttonLabel: `Add ${error.field}`,
              description: `Insert ${error.field} field in ${error.section}.${error.entry}`,
            };
          } else {
            return {
              type: 'insert_top_level_field',
              field: error.field!,
              text: `${error.field}: `,
              buttonLabel: `Add ${error.field}`,
              description: `Insert ${error.field} field after <PROFILE>`,
            };
          }

        case 'invalid_enum_value':
          return {
            type: 'replace_enum_value_multi',
            section: error.section,
            entry: error.entry,
            field: error.field,
            currentValue: error.value,
            allowedValues: error.allowedValues,
            description: 'Replace with correct value',
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
        return;
      }

      try {
        const parsed = parseProfile(content);
        const validationResult = validateProfile(parsed);

        setValidation(validationResult);

        // Generate fixes for errors
        const fixes = validationResult.errors.map((error: ValidationError) =>
          generateFix(error)
        );
        setValidationFixes(fixes);
      } catch (error: any) {
        setValidation({
          errors: [{ message: `Parse error: ${error.message}` }],
          warnings: [],
          info: [],
          customFields: [],
          customSections: [],
        });
        setValidationFixes([]);
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
  };
}
