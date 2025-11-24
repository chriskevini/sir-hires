import { useState, useCallback, useRef } from 'react';

interface UseTabStateOptions<T extends string> {
  /**
   * Initial active tab key
   */
  initialTab: T;
  /**
   * Callback when tab changes
   */
  onTabChange?: (tabKey: T) => void;
}

interface UseTabStateReturn<T extends string> {
  /**
   * Current active tab key
   */
  activeTab: T;
  /**
   * Switch to a different tab
   */
  switchTab: (tabKey: T) => void;
  /**
   * Get ref callback for a tab's content element (e.g., textarea)
   * Used to auto-focus when switching tabs
   */
  getTabRef: (tabKey: T) => (el: HTMLElement | null) => void;
}

/**
 * Hook for managing tab state with auto-focus support.
 * Tracks active tab and provides ref callbacks for focusing tab content.
 */
export const useTabState = <T extends string>(
  options: UseTabStateOptions<T>
): UseTabStateReturn<T> => {
  const { initialTab, onTabChange } = options;
  const [activeTab, setActiveTab] = useState<T>(initialTab);
  const tabRefs = useRef<Record<string, HTMLElement | null>>({});

  const switchTab = useCallback(
    (tabKey: T) => {
      setActiveTab(tabKey);

      // Focus the tab's content after switch
      setTimeout(() => {
        const element = tabRefs.current[tabKey];
        if (element && 'focus' in element) {
          (element as HTMLTextAreaElement).focus();
        }
      }, 0);

      if (onTabChange) {
        onTabChange(tabKey);
      }
    },
    [onTabChange]
  );

  const getTabRef = useCallback((tabKey: T) => {
    return (el: HTMLElement | null) => {
      tabRefs.current[tabKey] = el;
    };
  }, []);

  return {
    activeTab,
    switchTab,
    getTabRef,
  };
};
