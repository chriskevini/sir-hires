/**
 * Job Merge Utilities
 *
 * Provides intelligent merging of local and remote job state with echo cancellation.
 * Used by useJobStore to handle storage change events without losing local edits.
 *
 * Key Concepts:
 * - Echo Cancellation: Ignore storage events that are "echoes" of our own saves
 * - Referential Identity: Preserve local object references when data is unchanged
 * - Optimistic Updates: Trust local state, only accept genuinely new remote changes
 */

import type { Job } from '../entrypoints/job-details/hooks';

/**
 * Merge remote jobs with local state, preserving local changes
 * and ignoring "echoes" from our own recent saves.
 *
 * @param localJobs - Current local state
 * @param remoteJobs - Jobs fetched from storage
 * @param recentSaves - Map of jobId -> timestamp for recently saved jobs
 * @param echoWindowMs - Time window (ms) to consider a storage event an "echo"
 * @returns Merged job array
 *
 * @example
 * const merged = mergeJobs(
 *   currentState.jobs,
 *   remoteJobs,
 *   recentSavesRef.current,
 *   1000 // 1 second echo window
 * );
 */
export function mergeJobs(
  localJobs: Job[],
  remoteJobs: Job[],
  recentSaves: Map<string, number>,
  echoWindowMs: number
): Job[] {
  const now = Date.now();
  const localMap = new Map(localJobs.map((j) => [j.id, j]));
  const remoteIds = new Set(remoteJobs.map((j) => j.id));

  // Start with remote jobs, merging with local state
  const merged = remoteJobs.map((remoteJob) => {
    const localJob = localMap.get(remoteJob.id);

    // If no local version, use remote (new job from another tab/source)
    if (!localJob) {
      return remoteJob;
    }

    // If we recently saved this job, ignore the echo (keep local)
    const lastSaveTime = recentSaves.get(remoteJob.id);
    if (lastSaveTime && now - lastSaveTime < echoWindowMs) {
      return localJob; // Keep local (we caused this storage change)
    }

    // External change - use remote, but preserve referential identity if equal
    if (isJobEqual(localJob, remoteJob)) {
      return localJob; // Identical content, keep local reference
    }

    // Genuinely different - accept remote version
    return remoteJob;
  });

  // Note: Jobs deleted remotely will naturally be excluded since they're
  // not in remoteJobs. Jobs we deleted locally will also be excluded
  // because we track them in recentSaves (handled by caller clearing state).

  // Check for locally added jobs not yet in remote (rare edge case)
  // This shouldn't happen in normal flow since we save immediately,
  // but handle it for robustness
  for (const localJob of localJobs) {
    if (!remoteIds.has(localJob.id)) {
      const lastSaveTime = recentSaves.get(localJob.id);
      // Only keep if we recently created it (echo hasn't arrived yet)
      if (lastSaveTime && now - lastSaveTime < echoWindowMs) {
        merged.push(localJob);
      }
      // Otherwise, it was deleted remotely - don't add it back
    }
  }

  return merged;
}

/**
 * Check if two jobs are equal (for referential identity preservation).
 *
 * Uses a fast path comparing updatedAt timestamps, with fallback to
 * deep comparison for edge cases where timestamps might not reflect
 * actual content changes.
 *
 * @param a - First job
 * @param b - Second job
 * @returns true if jobs are considered equal
 */
export function isJobEqual(a: Job, b: Job): boolean {
  // Fast path: if updatedAt matches, assume equal
  // This works because we always update updatedAt on any change
  if (a.updatedAt === b.updatedAt) {
    return true;
  }

  // Fallback: deep comparison
  // This handles edge cases like:
  // - Jobs imported without updatedAt
  // - Clock skew between tabs
  return isDeepEqual(a, b);
}

/**
 * Deep equality check for jobs.
 *
 * Uses JSON serialization for simplicity. This is acceptable because:
 * - Jobs are relatively small objects
 * - This is only called when timestamps differ (rare)
 * - Correctness > micro-optimization for merge logic
 *
 * @param a - First job
 * @param b - Second job
 * @returns true if deeply equal
 */
export function isDeepEqual(a: Job, b: Job): boolean {
  // Exclude transient fields from comparison
  const normalize = (
    job: Job
  ): Omit<Job, 'isExtracting' | 'extractionError'> => {
    const { isExtracting: _a, extractionError: _b, ...rest } = job;
    return rest;
  };

  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

/**
 * Clean up old entries from the recent saves map.
 *
 * Should be called periodically (e.g., on every storage change) to prevent
 * memory growth. Map entries are small, but good hygiene to clean up.
 *
 * @param recentSaves - Map to clean
 * @param maxAgeMs - Maximum age of entries to keep
 */
export function cleanupRecentSaves(
  recentSaves: Map<string, number>,
  maxAgeMs: number
): void {
  const now = Date.now();
  for (const [id, timestamp] of recentSaves.entries()) {
    if (now - timestamp > maxAgeMs) {
      recentSaves.delete(id);
    }
  }
}
