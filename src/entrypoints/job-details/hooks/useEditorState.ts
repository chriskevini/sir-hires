import React, { useState, useCallback, useEffect } from 'react';

interface UseEditorStateOptions {
  /**
   * Initial content value
   */
  initialContent: string;
  /**
   * Callback when content changes (with debounce)
   */
  onChange?: (content: string) => void;
  /**
   * Callback when editor loses focus
   */
  onBlur?: (content: string) => void;
  /**
   * Debounce delay in milliseconds (for onChange)
   */
  debounceDelay?: number;
}

interface UseEditorStateReturn {
  /**
   * Current editor content
   */
  content: string;
  /**
   * Handle change event from textarea
   */
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /**
   * Handle blur event from textarea
   */
  handleBlur: () => void;
  /**
   * Manually update content (e.g., from external source)
   */
  setContent: (content: string) => void;
}

/**
 * Hook for managing textarea editor state with change and blur handlers.
 * Useful for controlled text inputs with auto-save or validation.
 */
export const useEditorState = (
  options: UseEditorStateOptions
): UseEditorStateReturn => {
  const { initialContent, onChange, onBlur, debounceDelay = 0 } = options;

  const [content, setContent] = useState(initialContent);

  // Sync with external content changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // Debounced onChange
  useEffect(() => {
    if (!onChange || debounceDelay === 0) return;

    const timer = setTimeout(() => {
      onChange(content);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [content, onChange, debounceDelay]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);

      // Call onChange immediately if no debounce
      if (onChange && debounceDelay === 0) {
        onChange(newContent);
      }
    },
    [onChange, debounceDelay]
  );

  const handleBlur = useCallback(() => {
    if (onBlur) {
      onBlur(content);
    }
  }, [content, onBlur]);

  return {
    content,
    handleChange,
    handleBlur,
    setContent,
  };
};
