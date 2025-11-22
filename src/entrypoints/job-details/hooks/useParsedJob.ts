import { useMemo } from 'react';
import { parseJobTemplate } from '../../../utils/job-parser';
import type { Job } from './useJobState';
import type { JobTemplateData } from '../../../utils/job-parser';

/**
 * Hook to parse job content with memoization
 * Prevents redundant parsing operations across components
 *
 * @param job - Job object to parse (can be null)
 * @returns Parsed job data or null if no job/content
 */
export function useParsedJob(job: Job | null): JobTemplateData | null {
  return useMemo(() => {
    if (!job || !job.content) {
      return null;
    }

    return parseJobTemplate(job.content);
  }, [job]);
}
