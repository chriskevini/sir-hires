import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface DuplicateJobModalProps {
  isOpen: boolean;
  onRefresh: () => void;
  onExtractNew: () => void;
  onCancel: () => void;
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
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Duplicate Job Detected">
      <div className="flex flex-col items-center text-center p-5">
        <p className="text-sm text-gray-500 mb-6">
          You already have a job saved from this page.
        </p>

        <div className="flex flex-col gap-3 w-full">
          <Button variant="primary" onClick={onRefresh} className="w-full">
            Refresh Existing Job
          </Button>
          <Button variant="secondary" onClick={onExtractNew} className="w-full">
            Save as New Job
          </Button>
          <Button variant="subtle" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
