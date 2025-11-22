import { useMemo } from 'react';
import { parseJobTemplate } from '@/utils/job-parser';

/**
 * Hook to parse job content using MarkdownDB pattern
 * Memoizes the parsed result based on content changes
 * @param content - Raw job template string
 * @returns Parsed job data
 */
export const useJobParser = (content: string | undefined) => {
  return useMemo(() => parseJobTemplate(content || ''), [content]);
};
