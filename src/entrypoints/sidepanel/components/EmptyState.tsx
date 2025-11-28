import React from 'react';
import { Button } from '@/components/ui/Button';
import { ArrowUpLeftIcon } from '../../../components/ui/icons';

interface EmptyStateProps {
  onRestoreBackup: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onRestoreBackup }) => {
  return (
    <div className="empty-state">
      <div className="empty-state-arrow">{ArrowUpLeftIcon}</div>

      <p className="empty-state-instruction">
        Navigate to a job posting, then click <strong>Extract</strong>
      </p>

      <div className="empty-state-footer">
        <Button
          variant="link"
          onClick={onRestoreBackup}
          title="Import a JSON backup (will overwrite current data)"
        >
          Restore Backup
        </Button>
      </div>
    </div>
  );
};
