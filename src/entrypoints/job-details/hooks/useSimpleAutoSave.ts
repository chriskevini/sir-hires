/**
 * useSimpleAutoSave hook - Auto-saves a single field with debouncing
 * Useful for auto-saving content field after user stops typing
 */

import { useDebounce } from './useDebounce';

interface UseSimpleAutoSaveOptions {
  currentValue: string;
  savedValue: string;
  isExtracting?: boolean;
  hasError?: boolean;
  onSave: (value: string) => void;
  debounceMs?: number;
}

/**
 * Auto-saves a field value after user stops typing
 * @param options.currentValue - Current editor value
 * @param options.savedValue - Last saved value (from storage)
 * @param options.isExtracting - Whether content is currently being extracted
 * @param options.hasError - Whether there's an extraction error
 * @param options.onSave - Callback to save the value
 * @param options.debounceMs - Debounce delay in milliseconds (default: 2000)
 */
export function useSimpleAutoSave({
  currentValue,
  savedValue,
  isExtracting = false,
  hasError = false,
  onSave,
  debounceMs = 2000,
}: UseSimpleAutoSaveOptions): void {
  // Debounced auto-save (2000ms default)
  useDebounce(
    () => {
      // Skip if content is being extracted or has error
      if (!savedValue || isExtracting || hasError) {
        return;
      }

      // Only save if value has changed
      if (currentValue !== savedValue) {
        onSave(currentValue);
      }
    },
    debounceMs,
    [currentValue, savedValue, isExtracting, hasError]
  );
}
