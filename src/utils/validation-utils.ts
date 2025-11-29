/**
 * Utility function to compute editor className based on validation state.
 * Returns Tailwind classes for left border coloring.
 */
export function getValidationEditorClass(
  hasErrors: boolean,
  hasWarnings: boolean,
  hasContent: boolean
): string {
  if (hasErrors) {
    return 'border-l-4 border-l-destructive';
  } else if (hasWarnings) {
    return 'border-l-4 border-l-warning';
  } else if (hasContent) {
    return 'border-l-4 border-l-success';
  }
  return '';
}
