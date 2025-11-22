import { escapeHtml } from '@/utils/shared-utils';

interface MigrationPromptViewProps {
  jobUrl: string;
  onDelete: () => void;
}

/**
 * Displays re-extraction prompt for old jobs without content
 * Used in ResearchingView when jobs need migration to new format
 */
export function MigrationPromptView({
  jobUrl,
  onDelete,
}: MigrationPromptViewProps) {
  return (
    <div className="job-card">
      <div className="migration-prompt">
        <div className="migration-icon">⚠️</div>
        <h3>Job Needs Re-Extraction</h3>
        <p>
          This job was saved in an old format and needs to be re-extracted from
          the job posting.
        </p>
        <div className="migration-actions">
          <a
            href={escapeHtml(jobUrl)}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Re-Extract from Original Posting ↗
          </a>
        </div>
        <div className="job-actions" style={{ marginTop: '24px' }}>
          <button className="btn btn-delete" onClick={onDelete}>
            Delete This Job
          </button>
        </div>
      </div>
    </div>
  );
}
