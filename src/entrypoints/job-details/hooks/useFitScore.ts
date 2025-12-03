/**
 * useFitScore Hook
 *
 * Calculates fit score when jobInFocus or profile content changes.
 * Features:
 * - 2s debounce before calculation starts
 * - Cancels previous calculation if inputs change
 * - Provides braille spinner state for UI indicator
 * - Stores fit score in local state (hidden from user)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fitCalculation } from '@/tasks/fit-calculation';
import { runTask, startKeepalive } from '@/utils/llm-task-runner';
import { LLMClient } from '@/utils/llm-client';
import { llmSettingsStorage, userProfileStorage } from '@/utils/storage';

// Braille spinner frames for unicode animation
const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_INTERVAL_MS = 80;

export interface UseFitScoreOptions {
  /** Job content (raw MarkdownDB template) */
  jobContent: string | undefined;
  /** Job ID for tracking changes */
  jobId: string | undefined;
}

export interface UseFitScoreResult {
  /** Current fit score (0-100) or null if not calculated */
  fitScore: number | null;
  /** Whether calculation is in progress */
  isCalculating: boolean;
  /** Current braille spinner character (only when calculating) */
  spinnerChar: string;
  /** Error message if calculation failed */
  error: string | null;
}

/**
 * Hook to calculate fit score with debouncing and cancellation
 */
export function useFitScore(options: UseFitScoreOptions): UseFitScoreResult {
  const { jobContent, jobId } = options;

  // State
  const [fitScore, setFitScore] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for cancellation and debouncing
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinnerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // Profile content from storage (watched for changes)
  const [profileContent, setProfileContent] = useState<string | null>(null);

  // Load and watch profile content
  useEffect(() => {
    // Initial load
    userProfileStorage.getValue().then((profile) => {
      setProfileContent(profile?.content || null);
    });

    // Watch for changes
    const unwatch = userProfileStorage.watch((newProfile) => {
      setProfileContent(newProfile?.content || null);
    });

    return () => {
      unwatch();
    };
  }, []);

  // Spinner animation effect
  useEffect(() => {
    if (isCalculating) {
      spinnerIntervalRef.current = setInterval(() => {
        setSpinnerIndex((prev) => (prev + 1) % BRAILLE_FRAMES.length);
      }, SPINNER_INTERVAL_MS);
    } else {
      if (spinnerIntervalRef.current) {
        clearInterval(spinnerIntervalRef.current);
        spinnerIntervalRef.current = null;
      }
      setSpinnerIndex(0);
    }

    return () => {
      if (spinnerIntervalRef.current) {
        clearInterval(spinnerIntervalRef.current);
      }
    };
  }, [isCalculating]);

  // Cancel any in-progress calculation
  const cancelCalculation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsCalculating(false);
  }, []);

  // Main effect: trigger calculation when inputs change
  useEffect(() => {
    // Cancel any existing calculation/timer
    cancelCalculation();

    // Reset score when job changes
    setFitScore(null);
    setError(null);

    // Skip if missing required inputs
    if (!jobContent || !profileContent || !jobId) {
      return;
    }

    // Set up debounce timer (2 seconds)
    debounceTimerRef.current = setTimeout(async () => {
      // Create new abort controller for this calculation
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsCalculating(true);
      setError(null);

      const stopKeepalive = startKeepalive();

      try {
        // Load LLM settings
        const settings = await llmSettingsStorage.getValue();
        if (!settings?.endpoint || !settings?.model) {
          throw new Error('LLM settings not configured');
        }

        // Check if cancelled before starting
        if (abortController.signal.aborted) {
          return;
        }

        // Create LLM client
        const llmClient = new LLMClient({
          endpoint: settings.endpoint,
          modelsEndpoint: settings.modelsEndpoint,
        });

        // Run fit calculation task
        const result = await runTask({
          config: fitCalculation,
          context: {
            job: jobContent,
            profile: profileContent,
            task: fitCalculation.defaultTask,
          },
          llmClient,
          model: settings.model,
          signal: abortController.signal,
        });

        // Check if cancelled during execution
        if (result.cancelled || abortController.signal.aborted) {
          return;
        }

        // Parse the score from response (expecting a number 0-100)
        const scoreText = result.content.trim();
        const score = parseInt(scoreText, 10);

        if (isNaN(score) || score < 0 || score > 100) {
          console.warn('[useFitScore] Invalid score response:', scoreText);
          setError('Invalid score response');
          setFitScore(null);
        } else {
          setFitScore(score);
          console.info('[useFitScore] Fit score calculated:', score);
        }
      } catch (err) {
        // Don't set error if cancelled
        if (abortController.signal.aborted) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[useFitScore] Calculation failed:', message);
        setError(message);
        setFitScore(null);
      } finally {
        stopKeepalive();
        // Only update state if this is still the active calculation
        if (abortControllerRef.current === abortController) {
          setIsCalculating(false);
          abortControllerRef.current = null;
        }
      }
    }, 2000); // 2 second debounce

    // Cleanup on unmount or input change
    return () => {
      cancelCalculation();
    };
  }, [jobContent, profileContent, jobId, cancelCalculation]);

  // Memoize spinner character
  const spinnerChar = useMemo(
    () => BRAILLE_FRAMES[spinnerIndex],
    [spinnerIndex]
  );

  return {
    fitScore,
    isCalculating,
    spinnerChar,
    error,
  };
}
