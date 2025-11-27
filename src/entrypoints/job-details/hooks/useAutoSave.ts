/**
 * useAutoSave - Unified auto-save hook with save-on-unmount
 *
 * Features:
 * - Debounced saving (saves after user stops typing)
 * - Automatic save on unmount (prevents data loss on navigation)
 * - Supports single value or multiple keyed values
 * - Ref-based tracking to avoid stale closures
 *
 * Usage:
 * - Single value (ResearchingView): useAutoSave({ initialValue, onSave })
 * - Multi value (DraftingView): useAutoSaveMulti({ initialValues, onSave })
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

interface UseAutoSaveOptions {
  /** Initial value */
  initialValue: string;
  /** Callback to save the value */
  onSave: (value: string) => void;
  /** Debounce delay in ms (default: 2000) */
  debounceMs?: number;
  /** Disable auto-save (e.g., during extraction) */
  disabled?: boolean;
}

interface UseAutoSaveReturn {
  /** Current value */
  value: string;
  /** Update the value */
  setValue: (value: string) => void;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Manually flush pending saves */
  flush: () => void;
}

interface UseAutoSaveMultiOptions {
  /** Initial values keyed by document ID */
  initialValues: Record<string, string>;
  /** Callback to save a value (receives key and value) */
  onSave: (key: string, value: string) => void;
  /** Debounce delay in ms (default: 2000) */
  debounceMs?: number;
  /** Disable auto-save (e.g., during extraction) */
  disabled?: boolean;
}

interface UseAutoSaveMultiReturn {
  /** Current values */
  values: Record<string, string>;
  /** Update a specific value */
  setValue: (key: string, value: string) => void;
  /** Whether any value has unsaved changes */
  isDirty: boolean;
  /** Manually flush all pending saves */
  flush: () => void;
  /** Re-initialize values (e.g., when job changes) */
  initializeValues: (values: Record<string, string>) => void;
}

// ============================================================================
// Single Value Hook
// ============================================================================

/**
 * Auto-save hook for a single value (e.g., job content in ResearchingView)
 */
export function useAutoSave({
  initialValue,
  onSave,
  debounceMs = 2000,
  disabled = false,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [value, setValueState] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);

  // Refs for save-on-unmount (avoids stale closures)
  const valueRef = useRef(value);
  const savedValueRef = useRef(savedValue);
  const onSaveRef = useRef(onSave);
  const disabledRef = useRef(disabled);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs updated
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    savedValueRef.current = savedValue;
  }, [savedValue]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  // Sync with external initialValue changes (e.g., job content updated from extraction)
  useEffect(() => {
    setValueState(initialValue);
    setSavedValue(initialValue);
  }, [initialValue]);

  // Debounced save effect
  useEffect(() => {
    if (disabled || value === savedValue) {
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced save
    timeoutRef.current = setTimeout(() => {
      onSaveRef.current(value);
      setSavedValue(value);
      savedValueRef.current = value;
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, savedValue, disabled, debounceMs]);

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      // Clear any pending debounce
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Flush if dirty and not disabled
      if (!disabledRef.current && valueRef.current !== savedValueRef.current) {
        onSaveRef.current(valueRef.current);
      }
    };
  }, []);

  const setValue = useCallback((newValue: string) => {
    setValueState(newValue);
    valueRef.current = newValue;
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!disabledRef.current && valueRef.current !== savedValueRef.current) {
      onSaveRef.current(valueRef.current);
      setSavedValue(valueRef.current);
      savedValueRef.current = valueRef.current;
    }
  }, []);

  return {
    value,
    setValue,
    isDirty: value !== savedValue,
    flush,
  };
}

// ============================================================================
// Multi Value Hook
// ============================================================================

/**
 * Auto-save hook for multiple keyed values (e.g., documents in DraftingView)
 */
export function useAutoSaveMulti({
  initialValues,
  onSave,
  debounceMs = 2000,
  disabled = false,
}: UseAutoSaveMultiOptions): UseAutoSaveMultiReturn {
  const [values, setValuesState] =
    useState<Record<string, string>>(initialValues);
  const [savedValues, setSavedValues] =
    useState<Record<string, string>>(initialValues);

  // Refs for save-on-unmount
  const valuesRef = useRef(values);
  const savedValuesRef = useRef(savedValues);
  const onSaveRef = useRef(onSave);
  const disabledRef = useRef(disabled);
  const timeoutRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Keep refs updated
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    savedValuesRef.current = savedValues;
  }, [savedValues]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  // Debounced save effect - runs when any value changes
  useEffect(() => {
    if (disabled) return;

    // Check each key for changes
    Object.keys(values).forEach((key) => {
      const currentValue = values[key];
      const lastSaved = savedValues[key];

      if (currentValue === lastSaved) {
        // No change for this key, clear any pending timeout
        if (timeoutRefs.current[key]) {
          clearTimeout(timeoutRefs.current[key]);
          delete timeoutRefs.current[key];
        }
        return;
      }

      // Clear previous timeout for this key
      if (timeoutRefs.current[key]) {
        clearTimeout(timeoutRefs.current[key]);
      }

      // Set new debounced save for this key
      timeoutRefs.current[key] = setTimeout(() => {
        onSaveRef.current(key, currentValue);
        setSavedValues((prev) => ({ ...prev, [key]: currentValue }));
        savedValuesRef.current[key] = currentValue;
        delete timeoutRefs.current[key];
      }, debounceMs);
    });

    return () => {
      // Cleanup all timeouts on deps change
      Object.values(timeoutRefs.current).forEach(clearTimeout);
      timeoutRefs.current = {};
    };
  }, [values, savedValues, disabled, debounceMs]);

  // Save on unmount if any values are dirty
  useEffect(() => {
    return () => {
      // Clear all pending timeouts
      Object.values(timeoutRefs.current).forEach(clearTimeout);
      timeoutRefs.current = {};

      // Flush all dirty values
      if (!disabledRef.current) {
        Object.keys(valuesRef.current).forEach((key) => {
          const currentValue = valuesRef.current[key];
          const lastSaved = savedValuesRef.current[key];

          if (currentValue !== lastSaved) {
            onSaveRef.current(key, currentValue);
          }
        });
      }
    };
  }, []);

  const setValue = useCallback((key: string, newValue: string) => {
    setValuesState((prev) => {
      const updated = { ...prev, [key]: newValue };
      valuesRef.current = updated;
      return updated;
    });
  }, []);

  const flush = useCallback(() => {
    // Clear all pending timeouts
    Object.values(timeoutRefs.current).forEach(clearTimeout);
    timeoutRefs.current = {};

    if (!disabledRef.current) {
      Object.keys(valuesRef.current).forEach((key) => {
        const currentValue = valuesRef.current[key];
        const lastSaved = savedValuesRef.current[key];

        if (currentValue !== lastSaved) {
          onSaveRef.current(key, currentValue);
          savedValuesRef.current[key] = currentValue;
        }
      });

      setSavedValues({ ...valuesRef.current });
    }
  }, []);

  const initializeValues = useCallback((newValues: Record<string, string>) => {
    // Clear any pending saves
    Object.values(timeoutRefs.current).forEach(clearTimeout);
    timeoutRefs.current = {};

    setValuesState(newValues);
    setSavedValues(newValues);
    valuesRef.current = newValues;
    savedValuesRef.current = newValues;
  }, []);

  // Calculate isDirty
  const isDirty = Object.keys(values).some(
    (key) => values[key] !== savedValues[key]
  );

  return {
    values,
    setValue,
    isDirty,
    flush,
    initializeValues,
  };
}
