/**
 * Shared types for task configurations
 * These types define the structure of LLM task configurations
 */

// Context types for LLM tasks
// Storage-backed: fetched from storage by runTask()
// Runtime: passed directly to runTask() as parameters
export type StorageContextType =
  | 'profile' // User profile content from userProfileStorage
  | 'job' // Job content from jobInFocus (or explicit jobId)
  | 'jobTemplate' // Empty job template for extraction
  | 'profileTemplate'; // Empty profile template for extraction

export type RuntimeContextType =
  | 'rawText' // Raw text passed directly (e.g., page content for extraction)
  | 'template' // Document template content (e.g., resume/cover letter being edited)
  | 'tone' // Tone modifier for synthesis
  | 'task'; // Task instruction (last context item for quick task-switching)

export type ContextType = StorageContextType | RuntimeContextType;

/**
 * Configuration for an LLM task
 * Defines how to invoke the LLM for a specific task type
 */
export interface TaskConfig {
  model?: string; // Override global model
  temperature: number;
  maxTokens: number;
  prompt: string; // System prompt for the task
  context: ContextType[]; // Context items to include in user prompt
}
