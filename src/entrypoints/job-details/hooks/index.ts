// Export all hooks from a single entry point

// Active hooks (unified store replaces useJobState/useJobStorage/useJobHandlers)
export { useJobStore } from './useJobStore';
export { useJobService } from './useJobService';
export { useNavigation } from './useNavigation';
export { useExtractionEvents } from './useExtractionEvents';
export { useDebounce } from './useDebounce';
export { useInterval } from './useInterval';
export { useEditorState } from './useEditorState';
export { useToggleState } from './useToggleState';
export { useTabState } from './useTabState';
export { useJobValidation } from './useJobValidation';
export { useDocumentManager } from './useDocumentManager';
export { useParsedJob } from './useParsedJob';

// Re-export types from types.ts (source of truth for shared types)
export type {
  Job,
  JobDocument,
  ChecklistItem,
  Filters,
  JobState,
  StorageChanges,
  StorageChangeCallback,
} from './types';

// Re-export types from active hooks
export type { JobStoreState, JobStoreActions, JobStore } from './useJobStore';

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
