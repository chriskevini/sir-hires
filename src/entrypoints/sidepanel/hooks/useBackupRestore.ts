import { useCallback } from 'react';

export interface BackupStorage {
  restoreBackup: (data: {
    jobs: Record<string, unknown>;
    userProfile: unknown;
    llmSettings: unknown;
    jobInFocus: string | null;
  }) => Promise<void>;
}

/**
 * Custom hook for backup restoration functionality
 * Handles file selection, validation, and restoration
 */
export function useBackupRestore(storage: BackupStorage) {
  /**
   * Restore backup from a JSON file (for empty state)
   */
  const handleRestoreBackup = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const backup = JSON.parse(text);

        // Validate backup structure (support both new format with metadata and legacy format)
        const isNewFormat = backup.version && backup.data !== undefined;
        const backupData = isNewFormat ? backup.data : backup;

        // Basic validation - check if backup has jobs field
        if (!backupData || typeof backupData !== 'object') {
          alert('Invalid backup file format.');
          return;
        }

        // Confirm overwrite
        const jobCount = Object.keys(backupData.jobs || {}).length;
        const backupDate = backup.exportDate
          ? new Date(backup.exportDate).toLocaleString()
          : 'unknown date';
        const confirmMsg = `This will overwrite all your current data with the backup from ${backupDate}.\n\nBackup contains ${jobCount} job(s).\n\nThis cannot be undone. Continue?`;

        // eslint-disable-next-line no-undef
        if (!confirm(confirmMsg)) {
          return;
        }

        // Normalize old format to new format if needed
        const normalizedData = {
          jobs: backupData.jobs || {},
          userProfile:
            backupData.userProfile || backupData.masterResume || null,
          llmSettings: backupData.llmSettings || null,
          jobInFocus: backupData.jobInFocus || null,
        };

        // Restore all data using storage helper
        await storage.restoreBackup(normalizedData);

        console.info('[useBackupRestore] Backup restored successfully');
        alert('Backup restored successfully! Reloading...');

        // Reload
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error('[useBackupRestore] Error restoring backup:', error);
        alert('Error restoring backup: ' + (error as Error).message);
      }
    };

    input.click();
  }, [storage]);

  return {
    handleRestoreBackup,
  };
}
