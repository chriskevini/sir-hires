import { Button } from '@/components/ui/Button';
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
    <div className="bg-background border border-border rounded-md p-6">
      <div className="flex flex-col items-center text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Job Needs Re-Extraction
        </h3>
        <p className="text-muted-foreground text-sm mb-6">
          This job was saved in an old format and needs to be re-extracted from
          the job posting.
        </p>
        <div className="flex flex-col gap-4">
          <a
            href={escapeHtml(jobUrl)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded font-semibold text-sm hover:bg-purple-700 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Re-Extract from Original Posting ↗
          </a>
          <Button variant="danger" onClick={onDelete}>
            Delete This Job
          </Button>
        </div>
      </div>
    </div>
  );
}
