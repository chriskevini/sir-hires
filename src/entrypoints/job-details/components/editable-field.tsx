import React, { useState, useRef, useEffect } from 'react';

interface EditableFieldProps {
  fieldName: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  onSave: (fieldName: string, newValue: string) => Promise<void>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export const EditableField: React.FC<EditableFieldProps> = ({
  fieldName,
  value,
  placeholder = 'Click to edit...',
  multiline = false,
  className = '',
  onSave,
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const originalValueRef = useRef(value);
  const elementRef = useRef<HTMLSpanElement>(null);

  // Update value when prop changes
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const displayValue = currentValue || placeholder;
  const isEmpty = !currentValue;

  const handleFocus = () => {
    setIsFocused(true);
    originalValueRef.current = elementRef.current?.textContent?.trim() || '';

    // Select all text if it's a placeholder
    if (isEmpty && elementRef.current) {
      setTimeout(() => {
        const range = document.createRange();
        const sel = window.getSelection();
        if (elementRef.current && sel) {
          range.selectNodeContents(elementRef.current);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }, 0);
    }
  };

  const handleBlur = async () => {
    setIsFocused(false);
    const newValue = elementRef.current?.textContent?.trim() || '';

    // Update state to remove/add empty class
    setCurrentValue(newValue);

    // Only save if value changed
    if (newValue !== originalValueRef.current) {
      await save(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      elementRef.current?.blur();
    }
  };

  const save = async (newValue: string) => {
    setSaveState('saving');

    try {
      await onSave(fieldName, newValue);
      setSaveState('saved');

      // Hide after 2 seconds
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (error) {
      console.error(`[EditableField] Error saving ${fieldName}:`, error);
      setSaveState('error');

      // Hide after 2 seconds
      setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  const getSaveIndicator = () => {
    switch (saveState) {
      case 'saving':
        return '💾';
      case 'saved':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '';
    }
  };

  return (
    <>
      <span
        ref={elementRef}
        className={`editable-field ${className} ${isEmpty ? 'empty-content' : ''} ${isHovered ? 'editing-hover' : ''} ${isFocused ? 'editing-active' : ''}`}
        data-field={fieldName}
        contentEditable="true"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
      >
        {displayValue}
      </span>
      <span className={`save-indicator ${saveState}`}>
        {getSaveIndicator()}
      </span>
    </>
  );
};
