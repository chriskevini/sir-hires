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
    <Modal isOpen={isOpen} onClose={onCancel} title="⚠️ Duplicate Job Detected">
      <div className="modal-body" style={{ padding: '20px' }}>
        <p style={{ marginBottom: '16px', color: '#333' }}>
          You already have a job from this URL:
        </p>
        <p
          style={{
            marginBottom: '24px',
            padding: '12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            wordBreak: 'break-all',
          }}
        >
          {displayUrl}
        </p>

        <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
          What would you like to do?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Button
            variant="primary"
            onClick={onRefresh}
            style={{
              width: '100%',
              padding: '12px 16px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <strong>🔄 Refresh Job Data</strong>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              Update job description only. Preserves your checklist, documents,
              and status.
            </span>
          </Button>

          <Button
            variant="secondary"
            onClick={onExtractNew}
            style={{
              width: '100%',
              padding: '12px 16px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <strong>➕ Extract as New Job</strong>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              Create a separate job entry with a new ID.
            </span>
          </Button>

          <Button
            variant="secondary"
            onClick={onCancel}
            style={{
              width: '100%',
              padding: '12px 16px',
            }}
          >
            ✖️ Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
