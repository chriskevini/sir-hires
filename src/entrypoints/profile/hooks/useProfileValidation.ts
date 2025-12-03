/**
 * useProfileValidation hook - Validates profile content with debouncing
 * Combines validation logic and debounced validation updates
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { parseProfile } from '@/utils/profile-parser';
import { validateProfile } from '@/utils/profile-validator';
import type { ValidationMessage } from '@/utils/validation-types';

export interface ValidationResult {
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
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
};

/**
 * Validates profile template content with debouncing
 * @param options.content - The content to validate
 * @param options.debounceMs - Debounce delay in milliseconds (default: 500)
 * @returns Validation result (fixes are attached to each message)
 */
export function useProfileValidation({
  content,
  debounceMs = 500,
}: UseProfileValidationOptions) {
  const [validation, setValidation] =
    useState<ValidationResult>(EMPTY_VALIDATION);
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const runValidation = useCallback((content: string) => {
    if (!content || content.trim().length === 0) {
      setValidation(EMPTY_VALIDATION);
      return;
    }

    try {
      const parsed = parseProfile(content);
      const validationResult = validateProfile(parsed);

      // Filter out custom fields/sections info messages (not useful to users)
      const filteredInfo = validationResult.info.filter(
        (info) =>
          info.type !== 'custom_fields' && info.type !== 'custom_sections'
      );

      setValidation({
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        info: filteredInfo,
      });
    } catch (error: unknown) {
      const err = error as Error;
      setValidation({
        errors: [
          { type: 'parse_error', message: `Parse error: ${err.message}` },
        ],
        warnings: [],
        info: [],
      });
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
  };
}
