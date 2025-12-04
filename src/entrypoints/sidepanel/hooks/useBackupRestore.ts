import { useCallback } from 'react';

export interface BackupStorage {
  restoreBackup: (data: Record<string, unknown>) => Promise<void>;
}

export interface BackupDialogCallbacks {
  /** Show a confirmation dialog, returns true if confirmed */
  confirm: (options: {
    title: string;
    description: string;
    confirmLabel?: string;
    variant?: 'default' | 'destructive';
  }) => Promise<boolean>;
  /** Show an alert dialog */
  alert: (options: { title: string; description: string }) => Promise<void>;
}

/**
 * Custom hook for backup restoration functionality
 * Handles file selection, validation, and restoration
 */
export function useBackupRestore(
  storage: BackupStorage,
  dialogs: BackupDialogCallbacks
) {
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
          await dialogs.alert({
            title: 'Invalid Backup',
            description: 'Invalid backup file format.',
          });
          return;
        }

        // Confirm overwrite
        const jobCount = Object.keys(backupData.jobs || {}).length;
        const backupDate = backup.exportDate
          ? new Date(backup.exportDate).toLocaleString()
          : 'unknown date';

        const confirmed = await dialogs.confirm({
          title: 'Restore Backup',
          description: `This will overwrite all your current data with the backup from ${backupDate}. Backup contains ${jobCount} job(s). This cannot be undone.`,
          confirmLabel: 'Restore',
          variant: 'destructive',
        });

        if (!confirmed) {
          return;
        }

        // Pass through all backup data
        const normalizedData = { ...backupData };

        // Restore all data using storage helper
        await storage.restoreBackup(normalizedData);

        console.info('[useBackupRestore] Backup restored successfully');
        await dialogs.alert({
          title: 'Success',
          description: 'Backup restored successfully! Reloading...',
        });

        // Reload
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error('[useBackupRestore] Error restoring backup:', error);
        await dialogs.alert({
          title: 'Error',
          description: 'Error restoring backup: ' + (error as Error).message,
        });
      }
    };

    input.click();
  }, [storage, dialogs]);

  return {
    handleRestoreBackup,
  };
}
