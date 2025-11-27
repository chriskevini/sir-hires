/**
 * Tasks Index
 * Re-exports all task-related modules for clean imports
 *
 * Usage:
 *   import { jobExtractionConfig, JOB_TEMPLATE } from '@/tasks';
 *   import { synthesisConfig, documentTemplates } from '@/tasks';
 */

// Types
export type {
  StorageContextType,
  RuntimeContextType,
  ContextType,
  TaskConfig,
} from './types';

// Job Extraction
export {
  JOB_TEMPLATE,
  JOB_EXTRACTION_PROMPT,
  jobExtractionConfig,
} from './job-extraction';

// Profile Extraction
export {
  PROFILE_TEMPLATE,
  PROFILE_EXTRACTION_PROMPT,
  profileExtractionConfig,
} from './profile-extraction';

// Synthesis
export {
  SYNTHESIS_DEFAULT_TASK,
  SYNTHESIS_PROMPT,
  synthesisConfig,
  defaultDocuments,
  documentTemplates,
} from './synthesis';
export type { DefaultDocConfig } from './synthesis';
