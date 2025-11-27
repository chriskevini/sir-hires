/**
 * Shared Types for Job Details Hooks
 *
 * This file contains type definitions used across multiple hooks and components.
 * These were extracted from the deprecated useJobState hook during the
 * unified optimistic store refactor (Phase 3).
 */

// ============================================================================
// Core Job Types
// ============================================================================

/**
 * Represents a job application being tracked
 */
export interface Job {
  id: string;
  content?: string; // Raw MarkdownDB template (source of truth)
  url: string;
  applicationStatus: string;
  checklist?: Record<string, ChecklistItem[]>;
  documents?: Record<string, JobDocument>;
  updatedAt: string;
  createdAt: string;
  // Transient extraction state (not persisted)
  isExtracting?: boolean;
  extractionError?: string;
}

/**
 * Represents a document associated with a job (resume, cover letter, etc.)
 */
export interface JobDocument {
  title: string;
  text: string;
  lastEdited: string | null;
  order: number;
}

/**
 * Represents a checklist item for tracking job application progress
 */
export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  order: number;
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filter configuration for job list views
 */
export interface Filters {
  search: string;
  source: string;
  status: string;
  sort: string;
}

// ============================================================================
// State Types (Legacy - kept for backwards compatibility)
// ============================================================================

/**
 * @deprecated Use JobStoreState from useJobStore instead
 * Legacy job state interface - retained for type compatibility during migration
 */
export interface JobState {
  // Job data
  allJobs: Job[];
  filteredJobs: Job[];
  selectedJobIndex: number;
  jobInFocusId: string | null;

  // UI state
  isAnimating: boolean;
  pendingReload: boolean;
  checklistExpanded: boolean;

  // Filter state
  filters: Filters;
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Storage change event structure
 */
export interface StorageChanges {
  [key: string]: {
    oldValue?: unknown;
    newValue?: unknown;
  };
}

/**
 * Callback type for storage change listeners
 */
export type StorageChangeCallback = (_changes: StorageChanges) => void;
