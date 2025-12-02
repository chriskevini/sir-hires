/**
 * useJobValidation hook - Validates job content with debouncing
 * Combines validation logic and debounced validation updates
 */

import { useState, useEffect } from 'react';
import { parseJobTemplate } from '@/utils/job-parser';
import { validateJobTemplate } from '@/utils/job-validator';
import { useDebounce } from './useDebounce';
import type { ValidationFix } from '@/utils/validation-types';

interface ValidationResult {
  valid: boolean;
  errors: Array<{ message: string; fix?: ValidationFix | null }>;
  warnings: Array<{ message: string; fix?: ValidationFix | null }>;
  info: Array<{ message: string }>;
  fixes?: ValidationFix[];
}

interface UseJobValidationOptions {
  content: string;
  isExtracting?: boolean;
  hasError?: boolean;
  debounceMs?: number;
}

/**
 * Validates job template content with debouncing
 * @param options.content - The content to validate
 * @param options.isExtracting - Whether content is currently being extracted
 * @param options.hasError - Whether there's an extraction error
 * @param options.debounceMs - Debounce delay in milliseconds (default: 500)
 * @returns Validation result or null if validation is skipped
 */
export function useJobValidation({
  content,
  isExtracting = false,
  hasError = false,
  debounceMs = 500,
}: UseJobValidationOptions): ValidationResult | null {
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  // Debounced validation (500ms default)
  useDebounce(
    () => {
      // Skip validation if content is being extracted or has error
      if (!content || isExtracting || hasError) {
        setValidation(null);
        return;
      }

      const parsed = parseJobTemplate(content);
      const validationResult = validateJobTemplate(parsed);
      setValidation(validationResult);
    },
    debounceMs,
    [content, isExtracting, hasError]
  );

  // Initialize validation on mount
  useEffect(() => {
    if (content && !isExtracting && !hasError) {
      const parsed = parseJobTemplate(content);
      const validationResult = validateJobTemplate(parsed);
      setValidation(validationResult);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return validation;
}
