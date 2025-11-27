// Export all hooks from a single entry point
export { useJobState } from './useJobState';
export { useJobStorage } from './useJobStorage';
export { useJobService } from './useJobService';
export { useNavigation } from './useNavigation';
export { useExtractionEvents } from './useExtractionEvents';
export { useDebounce } from './useDebounce';
export { useInterval } from './useInterval';
export { useAutoSave, useAutoSaveMulti } from '@/hooks/useAutoSave';
export { useEditorState } from './useEditorState';
export { useToggleState } from './useToggleState';
export { useTabState } from './useTabState';
export { useJobValidation } from './useJobValidation';
export { useDocumentManager } from './useDocumentManager';
export { useParsedJob } from './useParsedJob';
export { useJobHandlers } from './useJobHandlers';

// Re-export types
export type { JobHandlers } from './useJobHandlers';
export type {
  Job,
  JobDocument,
  ChecklistItem,
  Filters,
  JobState,
} from './useJobState';

export type { StorageChanges, StorageChangeCallback } from './useJobStorage';

export type {
  JobServiceConfig,
  ValidationResult,
  BackupData,
  StatusStats,
} from './useJobService';

export type { NavigationHookParams } from './useNavigation';

export type {
  ExtractionEvent,
  ExtractionEventType,
  ExtractionMessage,
  ExtractionStartedMessage,
  ExtractionChunkMessage,
  ExtractionCompleteMessage,
  ExtractionErrorMessage,
  ExtractionCancelledMessage,
  ExtractionEventCallback,
} from './useExtractionEvents';
