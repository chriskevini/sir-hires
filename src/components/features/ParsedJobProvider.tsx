import React, { createContext, useContext, useMemo, useRef } from 'react';
import { parseJobTemplate } from '../../utils/job-parser';
import type { JobTemplateData } from '../../utils/job-parser';
import type { Job } from '../../entrypoints/job-details/hooks/useJobState';

/**
 * Cache entry for parsed job data
 */
interface ParseCacheEntry {
  contentHash: string; // First 50 chars of content (proxy for change detection)
  parsed: JobTemplateData;
}

/**
 * Performance stats for debugging
 */
interface CacheStats {
  hits: number;
  misses: number;
  invalidations: number;
}

/**
 * Context type for parsed job data
 */
interface ParsedJobContextValue {
  getParsedJob: (jobId: string) => JobTemplateData | null;
}

/**
 * Context for accessing parsed job data with caching
 */
const ParsedJobContext = createContext<ParsedJobContextValue | null>(null);

/**
 * Props for ParsedJobProvider
 */
interface ParsedJobProviderProps {
  jobs: Job[];
  children: React.ReactNode;
}

/**
 * Provider component that caches parsed job data
 *
 * **Performance Optimization Strategy:**
 * - **Lazy Parsing:** Only parses jobs when requested (not on mount)
 * - **Content-Based Invalidation:** Re-parses when job content changes
 * - **Automatic Pruning:** Removes cache entries for deleted jobs
 * - **Persistent Cache:** Survives component re-renders via useRef
 *
 * **Cache Lifecycle:**
 * 1. First access: Parse and store (cache miss)
 * 2. Subsequent access: Return cached data (cache hit)
 * 3. Content change: Detect via hash, re-parse (invalidation)
 * 4. Job deletion: Remove from cache (pruning)
 *
 * **Performance Monitoring:**
 * - Logs cache stats every 10 parses (hits, misses, hit rate)
 * - Logs pruning operations when jobs are deleted
 * - Use browser console to monitor cache effectiveness
 *
 * @param jobs - Array of all jobs to make available for parsing
 * @param children - Child components that can access parsed data
 *
 * @example
 * <ParsedJobProvider jobs={allJobs}>
 *   <JobList />
 * </ParsedJobProvider>
 */
export function ParsedJobProvider({ jobs, children }: ParsedJobProviderProps) {
  // Cache stored in ref to persist across renders without causing re-renders
  const cacheRef = useRef<Map<string, ParseCacheEntry>>(new Map());

  // Performance tracking (dev mode only)
  const statsRef = useRef<CacheStats>({ hits: 0, misses: 0, invalidations: 0 });

  // Create a map of current job IDs for quick lookup
  const jobMap = useMemo(() => {
    const map = new Map<string, Job>();
    jobs.forEach((job) => {
      map.set(job.id, job);
    });
    return map;
  }, [jobs]);

  // Prune stale cache entries when job list changes
  useMemo(() => {
    const cache = cacheRef.current;
    const currentJobIds = new Set(jobs.map((j) => j.id));

    // Remove entries for deleted jobs
    let pruned = 0;
    for (const cachedJobId of cache.keys()) {
      if (!currentJobIds.has(cachedJobId)) {
        cache.delete(cachedJobId);
        pruned++;
      }
    }

    if (pruned > 0) {
      statsRef.current.invalidations += pruned;
      console.info(
        `[ParsedJobProvider] Pruned ${pruned} stale entries. Cache size: ${cache.size}`
      );
    }
  }, [jobs]);

  // Context value with lazy parsing
  const contextValue = useMemo<ParsedJobContextValue>(
    () => ({
      getParsedJob: (jobId: string): JobTemplateData | null => {
        const job = jobMap.get(jobId);
        if (!job || !job.content) {
          return null;
        }

        const cache = cacheRef.current;
        const stats = statsRef.current;
        const content = job.content;
        const contentHash = content.substring(0, 50); // Quick hash proxy

        // Check cache
        const cached = cache.get(jobId);
        if (cached && cached.contentHash === contentHash) {
          stats.hits++;
          return cached.parsed;
        }

        // Cache miss or stale - parse and cache
        stats.misses++;
        const parsed = parseJobTemplate(content);
        cache.set(jobId, { contentHash, parsed });

        // Log every 10 parses to avoid spam
        if (stats.misses % 10 === 0) {
          const hitRate =
            stats.hits + stats.misses > 0
              ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)
              : '0.0';
          console.info(
            `[ParsedJobProvider] Stats - Hits: ${stats.hits}, Misses: ${stats.misses}, Hit Rate: ${hitRate}%, Cache Size: ${cache.size}`
          );
        }

        return parsed;
      },
    }),
    [jobMap]
  );

  return (
    <ParsedJobContext.Provider value={contextValue}>
      {children}
    </ParsedJobContext.Provider>
  );
}

/**
 * Hook to access parsed job data from context
 *
 * @param jobId - ID of the job to parse
 * @returns Parsed job data or null if not found/invalid
 *
 * @example
 * const parsed = useParsedJob(job.id);
 * const title = parsed?.topLevelFields['TITLE'] || 'Untitled';
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useParsedJob(jobId: string | null): JobTemplateData | null {
  const context = useContext(ParsedJobContext);

  if (!context) {
    throw new Error('useParsedJob must be used within ParsedJobProvider');
  }

  return useMemo(() => {
    if (!jobId) {
      return null;
    }
    return context.getParsedJob(jobId);
  }, [context, jobId]);
}

/**
 * Hook to access the raw getParsedJob function for bulk operations
 * Useful for filtering/sorting where you need to parse multiple jobs
 *
 * @returns Function to get parsed job data by ID
 *
 * @example
 * const getParsedJob = useGetParsedJob();
 * const sorted = jobs.sort((a, b) => {
 *   const parsedA = getParsedJob(a.id);
 *   const parsedB = getParsedJob(b.id);
 *   return compareFunction(parsedA, parsedB);
 * });
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useGetParsedJob(): (jobId: string) => JobTemplateData | null {
  const context = useContext(ParsedJobContext);

  if (!context) {
    throw new Error('useGetParsedJob must be used within ParsedJobProvider');
  }

  return context.getParsedJob;
}
