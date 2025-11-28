import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
  const customCount =
    validation.customFields.length + validation.customSections.length;

  // Compute status icon and text
  let statusIcon = '○';
  let statusIconColor = 'text-gray-500';
  let statusText = 'No Content';
  let statusTextColor = 'text-gray-500';

  if (hasErrors) {
    statusIcon = '✗';
    statusIconColor = 'text-red-600';
    statusText = 'Validation Errors';
    statusTextColor = 'text-red-600';
  } else if (hasWarnings) {
    statusIcon = '⚠';
    statusIconColor = 'text-amber-600';
    statusText = 'Validation Warnings';
    statusTextColor = 'text-amber-600';
  } else if (
    validation.errors.length === 0 &&
    validation.warnings.length === 0
  ) {
    statusIcon = '✓';
    statusIconColor = 'text-green-600';
    statusText = 'Valid Profile';
    statusTextColor = 'text-green-600';
  }

  return (
    <div
      className={`shrink-0 overflow-y-auto border-t-2 border-gray-200 bg-white transition-[max-height] duration-300 ${isCollapsed ? 'max-h-11 overflow-hidden' : 'max-h-[250px]'}`}
    >
      <div
        className="flex cursor-pointer select-none items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 hover:bg-gray-100"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <div className="flex items-center gap-1.5">
            <span className={`text-base ${statusIconColor}`}>{statusIcon}</span>
            <span className={statusTextColor}>{statusText}</span>
          </div>
          <div className="flex gap-3 text-xs font-medium">
            {hasErrors && (
              <span className="text-red-600">
                {validation.errors.length} error
                {validation.errors.length > 1 ? 's' : ''}
              </span>
            )}
            {hasWarnings && (
              <span className="text-amber-600">
                {validation.warnings.length} warning
                {validation.warnings.length > 1 ? 's' : ''}
              </span>
            )}
            {customCount > 0 && (
              <span className="text-blue-700">{customCount} custom</span>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-500">
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </span>
      </div>

      {showQuickActions && (onInsertEducation || onInsertExperience) && (
        <div className="flex gap-2 border-b border-gray-300 bg-gray-100 px-3 py-2 text-xs">
          <span className="self-center font-semibold text-gray-600">
            Quick Actions:
          </span>
          {onInsertEducation && (
            <Button
              variant="link"
              onClick={onInsertEducation}
              title="Insert a new education entry"
            >
              + Education
            </Button>
          )}
          {onInsertExperience && (
            <Button
              variant="link"
              onClick={onInsertExperience}
              title="Insert a new experience entry"
            >
              + Experience
            </Button>
          )}
        </div>
      )}

      <div className="max-h-[200px] overflow-y-auto px-4 py-3">
        {validation.errors.length === 0 &&
        validation.warnings.length === 0 &&
        validation.info.length === 0 ? (
          <div className="p-4 text-center text-[13px] text-gray-500">
            No validation messages
          </div>
        ) : (
          <>
            {validation.errors.map((error, index) => {
              const fix = validationFixes[index];

              if (fix && fix.type === 'replace_enum_value_multi') {
                return (
                  <div
                    key={`error-${index}`}
                    className="mb-2 rounded border-l-[3px] border-l-red-600 bg-red-50 px-3 py-2 text-[13px] leading-normal text-red-900 last:mb-0"
                  >
                    {error.message}. Allowed:
                    {fix.allowedValues?.map((value) => (
                      <Button
                        key={value}
                        variant="link"
                        onClick={() => onApplyFix(fix, value)}
                        title={`Replace with ${value}`}
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                );
              }

              return (
                <div
                  key={`error-${index}`}
                  className="mb-2 rounded border-l-[3px] border-l-red-600 bg-red-50 px-3 py-2 text-[13px] leading-normal text-red-900 last:mb-0"
                >
                  {error.message}
                  {fix && (
                    <Button
                      variant="link"
                      onClick={() => onApplyFix(fix)}
                      title={fix.description}
                    >
                      {fix.buttonLabel}
                    </Button>
                  )}
                </div>
              );
            })}

            {validation.warnings.map((warning, index) => {
              const fix = warningFixes[index];
              return (
                <div
                  key={`warning-${index}`}
                  className="mb-2 rounded border-l-[3px] border-l-amber-500 bg-amber-50 px-3 py-2 text-[13px] leading-normal text-amber-900 last:mb-0"
                >
                  {warning.message}
                  {fix && (
                    <Button
                      variant="link"
                      onClick={() => onApplyFix(fix)}
                      title={fix.description}
                    >
                      {fix.buttonLabel}
                    </Button>
                  )}
                </div>
              );
            })}

            {validation.info.map((info, index) => (
              <div
                key={`info-${index}`}
                className="mb-2 rounded border-l-[3px] border-l-blue-700 bg-blue-50 px-3 py-2 text-[13px] leading-normal text-blue-900 last:mb-0"
              >
                {info.message}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Utility hook to compute editor className based on validation state.
 * Returns Tailwind classes for left border coloring.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useValidationEditorClass(
  validation: ValidationResult,
  content: string
): string {
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  if (hasErrors) {
    return 'border-l-4 border-l-red-600';
  } else if (hasWarnings) {
    return 'border-l-4 border-l-amber-500';
  } else if (content.trim().length > 0) {
    return 'border-l-4 border-l-green-600';
  }
  return '';
}
