/**
 * useImmediateSave - Storage-first persistence hook
 *
 * Saves immediately on every change, eliminating:
 * - Debounce timing issues
 * - Save-on-unmount fragility
 * - Navigation data loss bugs
 *
 * The key insight: storage writes are fast enough that debouncing saves
 * is premature optimization. What matters is debouncing UI feedback
 * (like "Saved!" indicators), not the actual persistence.
 *
 * This replaces useAutoSave/useAutoSaveMulti which relied on
 * component unmount for flushing pending saves - a pattern that
 * fails on hard navigation and causes recurring bugs.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

interface UseImmediateSaveOptions {
  /** Initial value */
  initialValue: string;
  /** Callback to save the value - called immediately on every change */
  onSave: (value: string) => void | Promise<void>;
  /** Disable saving (e.g., during extraction) */
  disabled?: boolean;
  /** Key to trigger re-initialization (e.g., job.id) - only re-syncs when this changes */
  resetKey?: string;
}

interface UseImmediateSaveReturn {
  /** Current value */
  value: string;
  /** Update the value (saves immediately) */
  setValue: (value: string) => void;
}

interface UseImmediateSaveMultiOptions {
  /** Initial values keyed by document ID */
  initialValues: Record<string, string>;
  /** Callback to save a value (receives key and value) - called immediately */
  onSave: (key: string, value: string) => void | Promise<void>;
  /** Disable saving (e.g., during extraction) */
  disabled?: boolean;
  /** Key to trigger re-initialization (e.g., job.id) - only re-syncs when this changes */
  resetKey?: string;
}

interface UseImmediateSaveMultiReturn {
  /** Current values */
  values: Record<string, string>;
  /** Update a specific value (saves immediately) */
  setValue: (key: string, value: string) => void;
  /** Get the latest value for a key (reads from ref, avoids stale closures) */
  getLatestValue: (key: string) => string;
  /** Re-initialize values (e.g., when job changes) */
  initializeValues: (values: Record<string, string>) => void;
}

// ============================================================================
// Single Value Hook
// ============================================================================

/**
 * Immediate-save hook for a single value (e.g., job content in ResearchingView)
 *
 * Uses the "Profile pattern": local state + immediate save to storage.
 * Does NOT sync back from storage changes - only re-initializes when resetKey changes.
 * This prevents focus loss during typing.
 *
 * @example
 * const { value, setValue } = useImmediateSave({
 *   initialValue: job.content || '',
 *   onSave: (value) => storage.updateJob(job.id, { content: value }),
 *   disabled: job.isExtracting,
 *   resetKey: job.id, // Re-initialize when switching jobs
 * });
 */
export function useImmediateSave({
  initialValue,
  onSave,
  disabled = false,
  resetKey,
}: UseImmediateSaveOptions): UseImmediateSaveReturn {
  const [value, setValueState] = useState(initialValue);

  // Refs to track latest values and avoid stale closures
  const onSaveRef = useRef(onSave);
  const disabledRef = useRef(disabled);
  const prevResetKeyRef = useRef(resetKey);

  // Keep refs updated
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  // Re-initialize only when resetKey changes (e.g., switching jobs)
  // This is the "Profile pattern" - don't sync with storage changes during editing
  useEffect(() => {
    if (resetKey !== undefined && resetKey !== prevResetKeyRef.current) {
      setValueState(initialValue);
      prevResetKeyRef.current = resetKey;
    }
  }, [resetKey, initialValue]);

  const setValue = useCallback((newValue: string) => {
    setValueState(newValue);

    // Save immediately if not disabled
    if (!disabledRef.current) {
      onSaveRef.current(newValue);
    }
  }, []);

  return {
    value,
    setValue,
  };
}

// ============================================================================
// Multi Value Hook
// ============================================================================

/**
 * Immediate-save hook for multiple keyed values (e.g., documents in DraftingView)
 *
 * Uses the "Profile pattern": local state + immediate save to storage.
 * Does NOT sync back from storage changes - only re-initializes when resetKey changes.
 * This prevents focus loss during typing.
 *
 * @example
 * const { values, setValue, getLatestValue } = useImmediateSaveMulti({
 *   initialValues: { resume: doc.text, coverLetter: doc.text },
 *   onSave: (key, value) => storage.saveDocument(job.id, key, { text: value }),
 *   disabled: isGenerating,
 *   resetKey: job.id, // Re-initialize when switching jobs
 * });
 */
export function useImmediateSaveMulti({
  initialValues,
  onSave,
  disabled = false,
  resetKey,
}: UseImmediateSaveMultiOptions): UseImmediateSaveMultiReturn {
  const [values, setValuesState] =
    useState<Record<string, string>>(initialValues);

  // Refs for latest values and callbacks
  const valuesRef = useRef(values);
  const onSaveRef = useRef(onSave);
  const disabledRef = useRef(disabled);
  const prevResetKeyRef = useRef(resetKey);

  // Keep refs updated
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  // Re-initialize only when resetKey changes (e.g., switching jobs)
  // This is the "Profile pattern" - don't sync with storage changes during editing
  useEffect(() => {
    if (resetKey !== undefined && resetKey !== prevResetKeyRef.current) {
      setValuesState(initialValues);
      valuesRef.current = initialValues;
      prevResetKeyRef.current = resetKey;
    }
  }, [resetKey, initialValues]);

  // Sync NEW keys from initialValues without overwriting existing values
  // This handles the case where a new document is added (new key appears)
  // but we don't want to reset the entire state
  useEffect(() => {
    const currentKeys = Object.keys(valuesRef.current);
    const newKeys = Object.keys(initialValues).filter(
      (key) => !currentKeys.includes(key)
    );

    if (newKeys.length > 0) {
      setValuesState((prev) => {
        const updated = { ...prev };
        newKeys.forEach((key) => {
          updated[key] = initialValues[key];
        });
        valuesRef.current = updated;
        return updated;
      });
    }
  }, [initialValues]);

  const setValue = useCallback((key: string, newValue: string) => {
    setValuesState((prev) => {
      const updated = { ...prev, [key]: newValue };
      valuesRef.current = updated;
      return updated;
    });

    // Save immediately if not disabled
    if (!disabledRef.current) {
      onSaveRef.current(key, newValue);
    }
  }, []);

  const getLatestValue = useCallback((key: string): string => {
    return valuesRef.current[key] || '';
  }, []);

  const initializeValues = useCallback(
    (newValues: Record<string, string>) => {
      setValuesState(newValues);
      valuesRef.current = newValues;
      prevResetKeyRef.current = resetKey;
    },
    [resetKey]
  );

  return {
    values,
    setValue,
    getLatestValue,
    initializeValues,
  };
}
