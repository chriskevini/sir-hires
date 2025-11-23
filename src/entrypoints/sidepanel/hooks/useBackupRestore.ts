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

        // Validate backup structure (support both old nested and new flat format)
        const isOldFormat = backup.data !== undefined;
        const backupData = isOldFormat ? backup.data : backup;

        if (!backup.version) {
          alert('Invalid backup file format.');
          return;
        }

        // Confirm overwrite
        const jobCount = Object.keys(backupData.jobs || {}).length;
        const confirmMsg = `This will overwrite all your current data with the backup from ${new Date(backup.exportDate).toLocaleString()}.\n\nBackup contains ${jobCount} job(s).\n\nThis cannot be undone. Continue?`;

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
