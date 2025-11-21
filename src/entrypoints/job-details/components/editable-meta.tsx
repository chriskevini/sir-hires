import React, { useState, useRef } from 'react';

interface EditableMetaProps {
  fieldName: string;
  value: string;
  type?: 'text' | 'date' | 'select';
  icon?: string;
  label?: string;
  options?: string[];
  onSave: (fieldName: string, newValue: string) => Promise<void>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export const EditableMeta: React.FC<EditableMetaProps> = ({
  fieldName,
  value,
  type = 'text',
  icon = '',
  label = '',
  options = [],
  onSave,
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (_error) {
      return dateString;
    }
  };

  const getDisplayValue = (): string => {
    if (currentValue) {
      if (type === 'date') {
        return formatDate(currentValue);
      }
      return currentValue;
    }

    // Placeholder when empty
    if (label) {
      return `(Add ${label})`;
    }
    return '(Click to edit)';
  };

  const handleClick = () => {
    setIsEditing(true);
  };

  const save = async (newValue: string) => {
    setSaveState('saving');

    try {
      await onSave(fieldName, newValue);
      setCurrentValue(newValue);
      setSaveState('saved');

      // Hide after 2 seconds
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (error) {
      console.error(`[EditableMeta] Error saving ${fieldName}:`, error);
      setSaveState('error');

      // Hide after 2 seconds
      setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  const handleTextInputBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    await save(newValue);
    setIsEditing(false);
  };

  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleDateInputBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    await save(newValue);
    setIsEditing(false);
  };

  const handleSelectChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newValue = e.target.value;
    await save(newValue);
    setIsEditing(false);
  };

  const handleSelectBlur = () => {
    setIsEditing(false);
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

  const renderInput = () => {
    if (type === 'select') {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          className="inline-select"
          value={currentValue}
          onChange={handleSelectChange}
          onBlur={handleSelectBlur}
          autoFocus
        >
          <option value="">(None)</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    } else if (type === 'date') {
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="date"
          className="inline-input"
          defaultValue={currentValue}
          onBlur={handleDateInputBlur}
          autoFocus
        />
      );
    } else {
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          className="inline-input"
          defaultValue={currentValue}
          onBlur={handleTextInputBlur}
          onKeyDown={handleTextInputKeyDown}
          autoFocus
        />
      );
    }
  };

  return (
    <div
      className="meta-item editable-meta"
      data-field={fieldName}
      data-type={type}
      onClick={!isEditing ? handleClick : undefined}
    >
      {icon && <span className="meta-icon">{icon}</span>}
      {label && <span className="meta-label">{label}:</span>}
      <span className="meta-value">
        {isEditing ? renderInput() : getDisplayValue()}
      </span>
      <span className={`save-indicator ${saveState}`}>
        {getSaveIndicator()}
      </span>
    </div>
  );
};
