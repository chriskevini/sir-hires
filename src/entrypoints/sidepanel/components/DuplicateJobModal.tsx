import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

interface DuplicateJobModalProps {
  isOpen: boolean;
  onRefresh: () => void;
  onExtractNew: () => void;
  onCancel: () => void;
  jobUrl: string;
}

/**
 * DuplicateJobModal Component
 * Shown when user tries to extract a job from the same URL as current job
 * Offers 3 choices: Refresh existing, Extract as new, or Cancel
 */
export const DuplicateJobModal: React.FC<DuplicateJobModalProps> = ({
  isOpen,
  onRefresh,
  onExtractNew,
  onCancel,
  jobUrl,
}) => {
  // Truncate URL for display (max 60 chars)
  const displayUrl =
    jobUrl.length > 60 ? jobUrl.substring(0, 57) + '...' : jobUrl;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Duplicate Job Detected">
      <div className="p-5">
        <p className="mb-4 text-gray-700">
          You already have a job from this URL:
        </p>
        <p className="mb-6 p-3 bg-gray-100 rounded font-mono text-xs break-all">
          {displayUrl}
        </p>

        <p className="mb-5 text-gray-500 text-sm">What would you like to do?</p>

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            onClick={onRefresh}
            className="w-full p-3 text-left flex flex-col gap-1"
          >
            <strong>Refresh Job Data</strong>
            <span className="text-xs opacity-90">
              Update job description only. Preserves your checklist, documents,
              and status.
            </span>
          </Button>

          <Button
            variant="secondary"
            onClick={onExtractNew}
            className="w-full p-3 text-left flex flex-col gap-1"
          >
            <strong>Extract as New Job</strong>
            <span className="text-xs opacity-90">
              Create a separate job entry with a new ID.
            </span>
          </Button>

          <Button variant="secondary" onClick={onCancel} className="w-full p-3">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
