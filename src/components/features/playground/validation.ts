/**
 * Validation helpers for Prompt Playground
 */

import type { JobTemplateData } from '@/utils/job-parser';
import type { ParsedProfile } from '@/utils/profile-parser';

/**
 * Type guard for JobTemplateData
 */
export function isValidJobData(data: unknown): data is JobTemplateData {
  if (!data || typeof data !== 'object') return false;
  const jobData = data as JobTemplateData;
  // Valid if it has a type or has extracted top-level fields
  return (
    jobData.type !== null ||
    Object.keys(jobData.topLevelFields || {}).length > 0
  );
}

/**
 * Type guard for ParsedProfile
 */
export function isValidProfileData(data: unknown): data is ParsedProfile {
  if (!data || typeof data !== 'object') return false;
  const profileData = data as ParsedProfile;
  // Valid if it has extracted any meaningful content
  return (
    Object.keys(profileData.topLevelFields || {}).length > 0 ||
    Object.keys(profileData.sections || {}).length > 0
  );
}
