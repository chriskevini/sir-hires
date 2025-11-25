import { useState } from 'react';
import type {
  ValidationResult,
  ValidationFix,
} from '../hooks/useProfileValidation';

interface ValidationPanelProps {
  validation: ValidationResult;
  validationFixes: (ValidationFix | null)[];
  warningFixes: (ValidationFix | null)[];
  onApplyFix: (fix: ValidationFix, enumValue?: string) => void;
  onInsertEducation?: () => void;
  onInsertExperience?: () => void;
  showQuickActions?: boolean;
  initialCollapsed?: boolean;
}

/**
 * Profile-specific validation panel with auto-fix buttons and quick actions.
 * Displays validation errors, warnings, and info messages with one-click fixes.
 */
export function ValidationPanel({
  validation,
  validationFixes,
  warningFixes,
  onApplyFix,
  onInsertEducation,
  onInsertExperience,
  showQuickActions = true,
  initialCollapsed = true,
}: ValidationPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  // Compute validation UI state
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const hasInfo = validation.info.length > 0;
  const hasCustomFields = validation.customFields.length > 0;
  const hasCustomSections = validation.customSections.length > 0;
  const customCount =
    validation.customFields.length + validation.customSections.length;

  // Compute status icon and text
  let statusIcon = '○';
  let statusIconColor = '#666';
  let statusText = 'No Content';
  let statusTextColor = '#666';

  if (hasErrors) {
    statusIcon = '✗';
    statusIconColor = '#d93025';
    statusText = 'Validation Errors';
    statusTextColor = '#d93025';
  } else if (hasWarnings) {
    statusIcon = '⚠';
    statusIconColor = '#ea8600';
    statusText = 'Validation Warnings';
    statusTextColor = '#ea8600';
  } else if (
    validation.errors.length === 0 &&
    validation.warnings.length === 0
  ) {
    statusIcon = '✓';
    statusIconColor = '#0f9d58';
    statusText = 'Valid Profile';
    statusTextColor = '#0f9d58';
  }

  return (
    <div className={`validation-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div
        className="validation-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="validation-header-left">
          <div className="validation-status">
            <span className="status-icon" style={{ color: statusIconColor }}>
              {statusIcon}
            </span>
            <span style={{ color: statusTextColor }}>{statusText}</span>
          </div>
          <div className="validation-counts">
            {hasErrors && (
              <span className="count-errors" style={{ display: 'block' }}>
                {validation.errors.length} error
                {validation.errors.length > 1 ? 's' : ''}
              </span>
            )}
            {hasWarnings && (
              <span className="count-warnings" style={{ display: 'block' }}>
                {validation.warnings.length} warning
                {validation.warnings.length > 1 ? 's' : ''}
              </span>
            )}
            {(hasInfo || customCount > 0) && (
              <span className="count-info" style={{ display: 'block' }}>
                {customCount} custom
              </span>
            )}
          </div>
        </div>
        <span className="validation-toggle">{isCollapsed ? '▼' : '▲'}</span>
      </div>

      {showQuickActions && (onInsertEducation || onInsertExperience) && (
        <div className="quick-actions">
          <span className="quick-actions-label">Quick Actions:</span>
          {onInsertEducation && (
            <button
              onClick={onInsertEducation}
              className="quick-action-btn"
              title="Insert a new education entry"
            >
              + Education
            </button>
          )}
          {onInsertExperience && (
            <button
              onClick={onInsertExperience}
              className="quick-action-btn"
              title="Insert a new experience entry"
            >
              + Experience
            </button>
          )}
        </div>
      )}

      <div className="validation-content">
        {validation.errors.length === 0 &&
        validation.warnings.length === 0 &&
        validation.info.length === 0 &&
        !hasCustomFields &&
        !hasCustomSections ? (
          <div className="validation-empty">No validation messages</div>
        ) : (
          <>
            {validation.errors.map((error, index) => {
              const fix = validationFixes[index];

              if (fix && fix.type === 'replace_enum_value_multi') {
                const messageWithoutValues = error.message.replace(
                  /\. Allowed values:.*$/,
                  ''
                );
                return (
                  <div
                    key={`error-${index}`}
                    className="validation-message validation-error"
                  >
                    {messageWithoutValues}. Allowed values:
                    {fix.allowedValues?.map((value) => (
                      <button
                        key={value}
                        className="fix-button"
                        onClick={() => onApplyFix(fix, value)}
                        title={`Replace with ${value}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                );
              }

              return (
                <div
                  key={`error-${index}`}
                  className="validation-message validation-error"
                >
                  {error.message}
                  {fix && (
                    <button
                      className="fix-button"
                      onClick={() => onApplyFix(fix)}
                      title={fix.description}
                    >
                      {fix.buttonLabel}
                    </button>
                  )}
                </div>
              );
            })}

            {validation.warnings.map((warning, index) => {
              const fix = warningFixes[index];
              return (
                <div
                  key={`warning-${index}`}
                  className="validation-message validation-warning"
                >
                  {warning.message}
                  {fix && (
                    <button
                      className="fix-button"
                      onClick={() => onApplyFix(fix)}
                      title={fix.description}
                    >
                      {fix.buttonLabel}
                    </button>
                  )}
                </div>
              );
            })}

            {validation.info.map((info, index) => (
              <div
                key={`info-${index}`}
                className="validation-message validation-info"
              >
                {info.message}
              </div>
            ))}

            {hasCustomFields && (
              <div className="validation-message validation-info">
                ✨ Custom fields detected: {validation.customFields.join(', ')}
              </div>
            )}

            {hasCustomSections && (
              <div className="validation-message validation-info">
                ✨ Custom sections detected:{' '}
                {validation.customSections.join(', ')}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Utility hook to compute editor className based on validation state.
 * Returns 'has-errors', 'has-warnings', 'is-valid', or empty string.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useValidationEditorClass(
  validation: ValidationResult,
  content: string
): string {
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  if (hasErrors) {
    return 'has-errors';
  } else if (hasWarnings) {
    return 'has-warnings';
  } else if (content.trim().length > 0) {
    return 'is-valid';
  }
  return '';
}
