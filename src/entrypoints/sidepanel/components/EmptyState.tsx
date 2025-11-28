import React from 'react';

interface EmptyStateProps {
  extracting: boolean;
  onExtractJob: () => void;
  onRestoreBackup: () => void;
}

/**
 * EmptyState Component - Welcome screen shown when no job is in focus
 * Provides instructions and action buttons for getting started
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  extracting,
  onExtractJob,
  onRestoreBackup,
}) => {
  return (
    <div id="emptyState" className="empty-state">
      <div className="welcome-content">
        <h2>👋 Welcome to Sir Hires!</h2>

        <div className="instructions">
          <p>
            <strong>To get started:</strong>
          </p>
          <ol>
            <li>
              Pin this extension for quick access (click the puzzle piece icon
              🧩 in your toolbar, then pin Sir Hires)
            </li>
            <li>Navigate to a job posting (LinkedIn, Indeed, etc.)</li>
            <li>Click the extension icon</li>
            <li>Click "Extract Job Data" in the popup</li>
          </ol>
          <p className="instructions-note">
            The job will appear here for editing.
          </p>
        </div>

        <div className="tips">
          <p>
            <strong>💡 Tips:</strong>
          </p>
          <ul>
            <li>Open this panel anytime from Chrome's side panel menu</li>
            <li>All job fields are editable - just click to edit!</li>
          </ul>
        </div>

        <div className="supported-sites">
          <p>Works on LinkedIn, Indeed, Glassdoor, and more!</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            id="extractJobBtn"
            className="btn btn-primary"
            onClick={onExtractJob}
            disabled={extracting}
            title="Extract job data from the current tab"
          >
            {extracting ? 'Extracting...' : 'Extract Job Data'}
          </button>

          <button
            id="restoreBackupBtn"
            className="btn-restore-backup"
            onClick={onRestoreBackup}
            title="Will import a JSON backup and overwrite all current data"
          >
            Restore Backup
          </button>
        </div>
      </div>
    </div>
  );
};
