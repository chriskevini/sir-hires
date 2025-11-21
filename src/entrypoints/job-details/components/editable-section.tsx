import React, { useState, useRef, useEffect } from 'react';

interface EditableSectionProps {
  fieldName: string;
  value: string;
  title: string;
  placeholder?: string;
  readonly?: boolean;
  onSave?: (fieldName: string, newValue: string) => Promise<void>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export const EditableSection: React.FC<EditableSectionProps> = ({
  fieldName,
  value,
  title,
  placeholder = '(Click to add...)',
  readonly = false,
  onSave,
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const originalValueRef = useRef(value);
  const contentRef = useRef<HTMLDivElement>(null);

  // Update value when prop changes
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const displayContent = currentValue || placeholder;
  const hasContent = !!currentValue;

  const handleFocus = () => {
    if (readonly) return;
    setIsFocused(true);
    originalValueRef.current = contentRef.current?.textContent?.trim() || '';

    // Select all text if it's a placeholder
    if (!hasContent && contentRef.current) {
      setTimeout(() => {
        const range = document.createRange();
        const sel = window.getSelection();
        if (contentRef.current && sel) {
          range.selectNodeContents(contentRef.current);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }, 0);
    }
  };

  const handleBlur = async () => {
    if (readonly) return;
    setIsFocused(false);
    const newValue = contentRef.current?.textContent?.trim() || '';

    // Update state to remove/add empty class
    setCurrentValue(newValue);

    // Only save if value changed
    if (newValue !== originalValueRef.current && onSave) {
      await save(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readonly) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      contentRef.current?.blur();
    }
  };

  const save = async (newValue: string) => {
    if (!onSave) return;

    setSaveState('saving');

    try {
      await onSave(fieldName, newValue);
      setSaveState('saved');

      // Hide after 2 seconds
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (error) {
      console.error(`[EditableSection] Error saving ${fieldName}:`, error);
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
    <div className="job-section editable-section" data-field={fieldName}>
      <h3 className="section-title">
        {title}
        {!readonly && (
          <span className={`save-indicator ${saveState}`}>
            {getSaveIndicator()}
          </span>
        )}
      </h3>
      <div
        ref={contentRef}
        className={`section-content ${hasContent ? '' : 'empty-content'} ${isHovered && !readonly ? 'editing-hover' : ''} ${isFocused ? 'editing-active' : ''}`}
        contentEditable={!readonly}
        onMouseEnter={() => !readonly && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
      >
        {displayContent}
      </div>
    </div>
  );
};
