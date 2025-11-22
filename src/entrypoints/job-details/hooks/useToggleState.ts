import { useState, useCallback } from 'react';

/**
 * Hook for managing simple boolean toggle state.
 * Returns the current state, toggle function, and explicit set functions.
 */
export const useToggleState = (
  initialState = false
): [boolean, () => void, (value: boolean) => void] => {
  const [state, setState] = useState(initialState);

  const toggle = useCallback(() => {
    setState((prev) => !prev);
  }, []);

  const setValue = useCallback((value: boolean) => {
    setState(value);
  }, []);

  return [state, toggle, setValue];
};
