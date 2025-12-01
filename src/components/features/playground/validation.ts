/**
 * Validation helpers for Prompt Playground
 */

import type { JobTemplateData } from '@/utils/job-parser';
import type { ParsedProfile } from '@/utils/profile-parser';

/**
 * Type guard helper: checks if value is a non-null object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/**
 * Type guard for JobTemplateData
 *
 * Validates that the data has the expected shape of a parsed job template.
 * Valid if it has a non-null type field OR has extracted top-level fields.
 */
export function isValidJobData(data: unknown): data is JobTemplateData {
  if (!isObject(data)) return false;

  // Check for 'type' property (can be null, but must exist for valid job data)
  const hasType = 'type' in data && data.type !== null;

  // Check for topLevelFields with at least one entry
  const hasTopLevelFields =
    'topLevelFields' in data &&
    isObject(data.topLevelFields) &&
    Object.keys(data.topLevelFields).length > 0;

  return hasType || hasTopLevelFields;
}

/**
 * Type guard for ParsedProfile
 *
 * Validates that the data has the expected shape of a parsed profile.
 * Valid if it has extracted any top-level fields OR sections.
 */
export function isValidProfileData(data: unknown): data is ParsedProfile {
  if (!isObject(data)) return false;

  // Check for topLevelFields with at least one entry
  const hasTopLevelFields =
    'topLevelFields' in data &&
    isObject(data.topLevelFields) &&
    Object.keys(data.topLevelFields).length > 0;

  // Check for sections with at least one entry
  const hasSections =
    'sections' in data &&
    isObject(data.sections) &&
    Object.keys(data.sections).length > 0;

  return hasTopLevelFields || hasSections;
}
