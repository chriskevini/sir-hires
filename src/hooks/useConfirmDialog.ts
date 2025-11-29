import { useState, useCallback, useRef } from 'react';

export type ConfirmDialogVariant = 'default' | 'destructive';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: ConfirmDialogVariant;
  onConfirm: () => void;
}

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
}

const defaultState: ConfirmDialogState = {
  isOpen: false,
  title: '',
  description: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'default',
  onConfirm: () => {},
};

/**
 * Hook for managing confirmation dialog state
 *
 * Usage:
 * ```tsx
 * const { dialogState, confirm, closeDialog, ConfirmDialog } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Job',
 *     description: 'Are you sure you want to delete this job?',
 *     variant: 'destructive',
 *   });
 *   if (confirmed) {
 *     await deleteJob();
 *   }
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete</button>
 *     <ConfirmDialog />
 *   </>
 * );
 * ```
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] =
    useState<ConfirmDialogState>(defaultState);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const closeDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  const confirm = useCallback(
    (options: ConfirmDialogOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        setDialogState({
          isOpen: true,
          title: options.title,
          description: options.description,
          confirmLabel: options.confirmLabel ?? 'Confirm',
          cancelLabel: options.cancelLabel ?? 'Cancel',
          variant: options.variant ?? 'default',
          onConfirm: () => {
            resolve(true);
            resolveRef.current = null;
            setDialogState((prev) => ({ ...prev, isOpen: false }));
          },
        });
      });
    },
    []
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeDialog();
      }
    },
    [closeDialog]
  );

  return {
    dialogState,
    confirm,
    closeDialog,
    handleOpenChange,
  };
}

/**
 * Simple alert dialog state (no confirmation, just acknowledgment)
 */
export interface AlertDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  buttonLabel: string;
}

const defaultAlertState: AlertDialogState = {
  isOpen: false,
  title: '',
  description: '',
  buttonLabel: 'OK',
};

export interface AlertOptions {
  title: string;
  description: string;
  buttonLabel?: string;
}

/**
 * Hook for managing simple alert dialog state (no confirmation needed)
 *
 * Usage:
 * ```tsx
 * const { alertState, alert, closeAlert } = useAlertDialog();
 *
 * try {
 *   await someOperation();
 * } catch (err) {
 *   await alert({
 *     title: 'Error',
 *     description: 'Operation failed. See console for details.',
 *   });
 * }
 * ```
 */
export function useAlertDialog() {
  const [alertState, setAlertState] =
    useState<AlertDialogState>(defaultAlertState);
  const [resolveRef, setResolveRef] = useState<(() => void) | null>(null);

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
    if (resolveRef) {
      resolveRef();
      setResolveRef(null);
    }
  }, [resolveRef]);

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setResolveRef(() => resolve);
      setAlertState({
        isOpen: true,
        title: options.title,
        description: options.description,
        buttonLabel: options.buttonLabel ?? 'OK',
      });
    });
  }, []);

  return {
    alertState,
    alert,
    closeAlert,
  };
}
