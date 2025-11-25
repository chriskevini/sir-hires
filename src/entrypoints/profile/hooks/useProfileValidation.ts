/**
 * useProfileValidation hook - Validates profile content with debouncing
 * Combines validation logic and debounced validation updates
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { parseProfile } from '@/utils/profile-parser';
import { validateProfile } from '@/utils/profile-validator';
import { generateFix } from '@/utils/profile-utils';
import type {
  ValidationFix,
  ValidationMessage,
} from '@/utils/validation-types';

export interface ValidationResult {
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
  customFields: string[];
  customSections: string[];
}

// Re-export types for consumers
export type {
  ValidationFix,
  ValidationMessage,
} from '@/utils/validation-types';

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

  const runValidation = useCallback((content: string) => {
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
        (error: ValidationMessage) => generateFix(error, content)
      );
      setValidationFixes(errorFixes);

      // Generate fixes for warnings
      const warnFixes = validationResult.warnings.map(
        (warning: ValidationMessage) => generateFix(warning, content)
      );
      setWarningFixes(warnFixes);
    } catch (error: unknown) {
      const err = error as Error;
      setValidation({
        errors: [
          { type: 'parse_error', message: `Parse error: ${err.message}` },
        ],
        warnings: [],
        info: [],
        customFields: [],
        customSections: [],
      });
      setValidationFixes([]);
      setWarningFixes([]);
    }
  }, []);

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
