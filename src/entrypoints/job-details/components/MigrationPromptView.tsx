import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/card';
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
    <Card>
      <CardContent className="flex flex-col items-center text-center pt-6">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Job Needs Re-Extraction
        </h3>
        <p className="text-muted-foreground text-sm mb-6">
          This job was saved in an old format and needs to be re-extracted from
          the job posting.
        </p>
        <div className="flex flex-col gap-4">
          <Button variant="primary" asChild>
            <a
              href={escapeHtml(jobUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Re-Extract from Original Posting ↗
            </a>
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Delete This Job
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
