/**
 * useDebounce hook - Debounces a callback function
 * Useful for auto-save, validation, search, etc.
 */

import { useEffect, useRef, type DependencyList } from 'react';

/**
 * Execute a callback after a delay, cancelling previous pending calls
 * @param callback - Function to execute after delay
 * @param delay - Delay in milliseconds
 * @param deps - Dependencies array (like useEffect)
 */
export function useDebounce(
  callback: () => void,
  delay: number,
  deps: DependencyList
): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);

    // Cleanup on unmount or deps change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
