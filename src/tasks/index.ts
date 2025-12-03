/**
 * Tasks Index
 * Re-exports all task-related modules for clean imports
 *
 * Usage:
 *   import { jobExtraction, synthesis } from '@/tasks';
 *   jobExtraction.template
 *   synthesis.documents.tailoredResume
 */

// Types
export type {
  StorageContextType,
  RuntimeContextType,
  ContextType,
  TaskConfig,
} from './types';

// Tasks
export { jobExtraction } from './job-extraction';
export { profileExtraction } from './profile-extraction';
export { synthesis } from './synthesis';
export { fitCalculation } from './fit-calculation';

// Re-export document config type
export type { DefaultDocConfig } from './synthesis';
