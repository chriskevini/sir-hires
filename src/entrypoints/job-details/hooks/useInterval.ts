/**
 * useInterval hook - Execute a callback at regular intervals
 * Useful for auto-save, polling, periodic updates, etc.
 */

import { useEffect, useRef, type DependencyList } from 'react';

/**
 * Execute a callback at regular intervals
 * @param callback - Function to execute at each interval
 * @param delay - Interval delay in milliseconds
 * @param deps - Dependencies array (like useEffect)
 */
export function useInterval(
  callback: () => void,
  delay: number,
  deps: DependencyList
): void {
  const intervalRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set new interval
    intervalRef.current = setInterval(() => {
      callbackRef.current();
    }, delay);

    // Cleanup on unmount or deps change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
