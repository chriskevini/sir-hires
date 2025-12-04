/**
 * WXT Storage Definitions
 *
 * Centralized storage schema using WXT's built-in storage utilities.
 * Provides type-safe, versioned storage items for the extension.
 *
 * Migration Strategy:
 * - Phase 1: Define storage items (this file)
 * - Phase 2: Refactor useJobStorage to use these definitions
 * - Phase 3: Migrate direct browser.storage.local calls
 * - Phase 4: Add data migration logic if needed
 */

import { storage } from 'wxt/utils/storage';
import type {
  Job,
  JobDocument,
  ChecklistItem,
} from '../entrypoints/job-details/hooks';

// ===== Type Definitions =====

/**
 * User profile data (MarkdownDB template)
 */
export interface UserProfile {
  content: string; // Raw MarkdownDB template
  updatedAt: string;
}

/**
 * Per-task LLM settings (maxTokens, temperature)
 */
export interface TaskSettings {
  maxTokens: number;
  temperature: number;
}

/**
 * LLM configuration settings
 * - Shared settings: endpoint, model, apiKey (same for all tasks)
 * - Per-task settings: maxTokens, temperature (vary by task type)
 * - thinkHarder: enables extended reasoning (skips /no_think prefix)
 */
export interface LLMSettings {
  endpoint: string;
  modelsEndpoint: string;
  model: string;
  apiKey?: string;
  /**
   * When true, enables extended reasoning mode by NOT prepending /no_think
   * to system prompts. This allows models to use thinking blocks.
   * @default false
   */
  thinkHarder?: boolean;
  // Per-task settings
  tasks: {
    synthesis: TaskSettings;
    extraction: TaskSettings;
  };
}

/**
 * Viewer filter preferences
 */
export interface ViewerFilters {
  search: string;
  source: string;
  status: string;
  sort: string;
}

/**
 * Storage version for migration tracking
 */
export interface DataVersion {
  version: number;
  migratedAt: string;
}

/**
 * Theme mode preference
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Color theme preference
 */
export type ColorTheme = 'sir-hires' | 'lancelot' | 'gawain' | 'yvain';

/**
 * Theme preference settings
 */
export interface ThemePreference {
  mode: ThemeMode;
  colorTheme: ColorTheme;
}

// ===== Storage Item Definitions =====

/**
 * Jobs storage - Record of all jobs keyed by job ID
 * Uses object format: { [jobId]: Job }
 */
export const jobsStorage = storage.defineItem<Record<string, Job>>(
  'local:jobs',
  {
    defaultValue: {},
    version: 1,
  }
);

/**
 * Job in focus - ID of the currently focused job for sidepanel
 */
export const jobInFocusStorage = storage.defineItem<string | null>(
  'local:jobInFocus',
  {
    defaultValue: null,
    version: 1,
  }
);

/**
 * User profile - Master resume/profile as MarkdownDB template
 */
export const userProfileStorage = storage.defineItem<UserProfile | null>(
  'local:userProfile',
  {
    defaultValue: null,
    version: 1,
  }
);

/**
 * LLM settings - Configuration for LLM API
 */
export const llmSettingsStorage = storage.defineItem<LLMSettings | null>(
  'local:llmSettings',
  {
    defaultValue: null,
    version: 1,
  }
);

/**
 * Viewer filters - User's filter preferences in job-details view
 */
export const viewerFiltersStorage = storage.defineItem<ViewerFilters | null>(
  'local:viewerFilters',
  {
    defaultValue: null,
    version: 1,
  }
);

/**
 * Checklist expanded state - Global UI preference
 */
export const checklistExpandedStorage = storage.defineItem<boolean>(
  'local:checklistExpanded',
  {
    defaultValue: false,
    version: 1,
  }
);

/**
 * Data version - Migration tracking
 */
export const dataVersionStorage = storage.defineItem<DataVersion>(
  'local:dataVersion',
  {
    defaultValue: { version: 1, migratedAt: new Date().toISOString() },
    version: 1,
  }
);

/**
 * Extraction trigger - Signal to sidepanel to start extraction (timestamp)
 * Set by context menu, cleared by sidepanel after handling
 */
export const extractionTriggerStorage = storage.defineItem<number | null>(
  'local:extractionTrigger',
  {
    defaultValue: null,
    version: 1,
  }
);

/**
 * Keepalive storage - Used by background script to prevent service worker termination
 * This is a dummy storage item that gets pinged periodically
 */
export const keepaliveStorage = storage.defineItem<number>('local:_keepalive', {
  defaultValue: 0,
  version: 1,
});

/**
 * Profile template panel visibility - User preference for showing/hiding the template panel
 */
export const profileTemplatePanelStorage = storage.defineItem<boolean>(
  'local:profileTemplatePanel',
  {
    defaultValue: true,
    version: 1,
  }
);

/**
 * Profile suggestions panel visibility - User preference for showing/hiding the suggestions panel
 */
export const profileSuggestionsPanelStorage = storage.defineItem<boolean>(
  'local:profileSuggestionsPanel',
  {
    defaultValue: false,
    version: 1,
  }
);

/**
 * Sidebar collapsed state - User preference for job-details sidebar visibility
 */
export const sidebarCollapsedStorage = storage.defineItem<boolean>(
  'local:sidebarCollapsed',
  {
    defaultValue: false,
    version: 1,
  }
);

/**
 * Theme preference - User's preferred theme mode and color theme
 */
export const themePreferenceStorage = storage.defineItem<ThemePreference>(
  'local:themePreference',
  {
    defaultValue: { mode: 'system', colorTheme: 'sir-hires' },
    version: 1,
  }
);

/**
 * Welcome completed - Whether user has completed the welcome/onboarding flow
 * Used to determine if we should show the welcome view on app load
 */
export const welcomeCompletedStorage = storage.defineItem<boolean>(
  'local:welcomeCompleted',
  {
    defaultValue: false,
    version: 1,
  }
);

/**
 * First extraction message shown - Whether we've shown the post-first-extraction guidance banner
 * Used to show a one-time message after user extracts their first job
 */
export const firstExtractionMessageShownStorage = storage.defineItem<boolean>(
  'local:firstExtractionMessageShown',
  {
    defaultValue: false,
    version: 1,
  }
);

// ===== Helper Functions =====

/**
 * Get all storage items as a backup object
 * Useful for backup/restore functionality
 */
export async function getAllStorageData(): Promise<Record<string, unknown>> {
  const [
    jobs,
    jobInFocus,
    userProfile,
    llmSettings,
    viewerFilters,
    checklistExpanded,
    dataVersion,
    themePreference,
  ] = await Promise.all([
    jobsStorage.getValue(),
    jobInFocusStorage.getValue(),
    userProfileStorage.getValue(),
    llmSettingsStorage.getValue(),
    viewerFiltersStorage.getValue(),
    checklistExpandedStorage.getValue(),
    dataVersionStorage.getValue(),
    themePreferenceStorage.getValue(),
  ]);

  return {
    jobs,
    jobInFocus,
    userProfile,
    llmSettings,
    viewerFilters,
    checklistExpanded,
    dataVersion,
    themePreference,
  };
}

/**
 * Restore storage from backup data
 * @param data - Backup data object
 */
export async function restoreStorageFromBackup(
  data: Record<string, unknown>
): Promise<void> {
  const {
    jobs,
    jobInFocus,
    userProfile,
    llmSettings,
    viewerFilters,
    checklistExpanded,
    dataVersion,
    themePreference,
  } = data;

  await Promise.all([
    jobs !== undefined
      ? jobsStorage.setValue(jobs as Record<string, Job>)
      : Promise.resolve(),
    jobInFocus !== undefined
      ? jobInFocusStorage.setValue(jobInFocus as string | null)
      : Promise.resolve(),
    userProfile !== undefined
      ? userProfileStorage.setValue(userProfile as UserProfile | null)
      : Promise.resolve(),
    llmSettings !== undefined
      ? llmSettingsStorage.setValue(llmSettings as LLMSettings | null)
      : Promise.resolve(),
    viewerFilters !== undefined
      ? viewerFiltersStorage.setValue(viewerFilters as ViewerFilters | null)
      : Promise.resolve(),
    checklistExpanded !== undefined
      ? checklistExpandedStorage.setValue(checklistExpanded as boolean)
      : Promise.resolve(),
    dataVersion !== undefined
      ? dataVersionStorage.setValue(dataVersion as DataVersion)
      : Promise.resolve(),
    themePreference !== undefined
      ? themePreferenceStorage.setValue(themePreference as ThemePreference)
      : Promise.resolve(),
  ]);
}

/**
 * Clear all storage data
 */
export async function clearAllStorage(): Promise<void> {
  await Promise.all([
    jobsStorage.removeValue(),
    jobInFocusStorage.removeValue(),
    userProfileStorage.removeValue(),
    llmSettingsStorage.removeValue(),
    viewerFiltersStorage.removeValue(),
    checklistExpandedStorage.removeValue(),
    dataVersionStorage.removeValue(),
    keepaliveStorage.removeValue(),
    themePreferenceStorage.removeValue(),
    welcomeCompletedStorage.removeValue(),
    firstExtractionMessageShownStorage.removeValue(),
  ]);
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats() {
  const jobs = await jobsStorage.getValue();
  const userProfile = await userProfileStorage.getValue();
  const dataVersion = await dataVersionStorage.getValue();

  // Calculate approximate size (rough estimate)
  const dataString = JSON.stringify({
    jobs,
    userProfile,
  });
  const bytesInUse = new Blob([dataString]).size;

  return {
    bytesInUse,
    jobCount: Object.keys(jobs || {}).length,
    hasUserProfile: userProfile !== null,
    dataVersion: dataVersion.version,
    migratedAt: dataVersion.migratedAt,
  };
}

// ===== Re-export Types =====

export type { Job, JobDocument, ChecklistItem };
