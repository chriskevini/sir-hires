# Unified Optimistic Store Architecture

## Status: In Progress (Phase 2)

## Problem Statement

The current job state management has several architectural issues that lead to fragile behavior:

### 1. Fragile Time-Based Suppression

`suppressReloadUntil` in `useJobHandlers` uses timestamps to prevent storage change events from triggering full reloads during saves:

```typescript
// Current pattern in useJobHandlers.ts
if (suppressReloadUntil && Date.now() < suppressReloadUntil) {
  console.info('[useJobHandlers] Reload suppressed during document save');
  return;
}
```

This is fragile because:

- Race conditions can occur if operations take longer than expected
- Hard-coded timeouts (500ms) may not match actual operation duration
- No guarantee the suppression window covers the storage echo

### 2. Stale Closures

`handleSaveField` reads from `jobState.allJobs[index]` which may be stale:

```typescript
// Current pattern - vulnerable to stale closure
const handleSaveField = useCallback(
  async (index: number, fieldName: string, value: string) => {
    const job = jobState.allJobs[index]; // May be stale!
    // ...
  },
  [jobState.allJobs, storage, setSuppressReloadUntil]
);
```

When `handleSaveField` is called from an async chain or timeout, `jobState.allJobs` captures the value at callback creation time, not execution time.

### 3. Dual Sources of Truth

Two hooks manage overlapping concerns:

- `useJobState` - React state for UI
- `useJobStorage` - Browser storage operations

This creates coordination overhead and opportunities for desync:

```typescript
// App.tsx must coordinate between these manually
const jobState = useJobState();
const storage = useJobStorage();
// ...
await storage.updateJob(job.id, updatedJob);
// Must also update local state or trigger reload
```

### 4. Full Reloads on Any Change

Storage changes currently trigger `loadJobs()` which replaces all state:

```typescript
// Current pattern - nukes all state
if (changes.jobs || changes.jobInFocus) {
  console.info('[useJobHandlers] Jobs changed, reloading...');
  loadJobs(); // Replaces allJobs, causes re-renders, loses focus
}
```

## Proposed Solution: Optimistic Updates with Echo Cancellation

### Core Concept

Instead of treating Browser Storage as the "source of truth" that React must poll, treat **React State** as the immediate source of truth for UI, which proactively synchronizes to Storage.

The key to removing `suppressReloadUntil` and fresh reads is to **trust local state** and only accept external updates that actually differ from what we already have.

## Architecture

### 1. Centralized Job Store (`useJobStore`)

Replace the loose coordination between `useJobState` and `useJobStorage` with a single hook that manages both. This ensures all updates go through one funnel.

```typescript
// src/entrypoints/job-details/hooks/useJobStore.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { browser } from 'wxt/browser';
import { jobsStorage, jobInFocusStorage } from '../../../utils/storage';
import type { Job } from './useJobState';

interface JobStoreState {
  jobs: Job[];
  jobInFocusId: string | null;
  isLoading: boolean;
}

export function useJobStore() {
  const [state, setState] = useState<JobStoreState>({
    jobs: [],
    jobInFocusId: null,
    isLoading: true,
  });

  // Track which jobs we've recently saved (for echo cancellation)
  const recentSavesRef = useRef<Map<string, number>>(new Map());
  const ECHO_WINDOW_MS = 1000; // Ignore storage echoes within 1 second

  // 1. ID-Based Updates with Functional State
  const updateJob = useCallback((jobId: string, changes: Partial<Job>) => {
    setState((prev) => {
      const jobIndex = prev.jobs.findIndex((j) => j.id === jobId);
      if (jobIndex === -1) return prev;

      const updatedJob = {
        ...prev.jobs[jobIndex],
        ...changes,
        updatedAt: new Date().toISOString(),
      };

      const newJobs = [...prev.jobs];
      newJobs[jobIndex] = updatedJob;

      // Mark this job as recently saved (echo cancellation)
      recentSavesRef.current.set(jobId, Date.now());

      // Persist to storage (fire-and-forget)
      jobsStorage.getValue().then((jobsObj) => {
        jobsObj[jobId] = updatedJob;
        jobsStorage.setValue(jobsObj);
      });

      return { ...prev, jobs: newJobs };
    });
  }, []);

  // 2. Delete with optimistic update
  const deleteJob = useCallback(async (jobId: string) => {
    // Optimistic removal from state
    setState((prev) => ({
      ...prev,
      jobs: prev.jobs.filter((j) => j.id !== jobId),
      jobInFocusId: prev.jobInFocusId === jobId ? null : prev.jobInFocusId,
    }));

    // Mark as recently modified
    recentSavesRef.current.set(jobId, Date.now());

    // Persist via background (for cross-tab sync)
    await browser.runtime.sendMessage({
      action: 'deleteJob',
      jobId,
    });
  }, []);

  // 3. Intelligent Merge on Storage Changes
  useEffect(() => {
    const handleStorageChange = async () => {
      const [jobsObj, focusId] = await Promise.all([
        jobsStorage.getValue(),
        jobInFocusStorage.getValue(),
      ]);

      const remoteJobs = Object.values(jobsObj);

      setState((currentState) => {
        // Merge logic with echo cancellation
        const mergedJobs = mergeJobs(
          currentState.jobs,
          remoteJobs,
          recentSavesRef.current,
          ECHO_WINDOW_MS
        );

        // Clean up old entries from recentSaves
        const now = Date.now();
        recentSavesRef.current.forEach((timestamp, id) => {
          if (now - timestamp > ECHO_WINDOW_MS) {
            recentSavesRef.current.delete(id);
          }
        });

        return {
          ...currentState,
          jobs: mergedJobs,
          jobInFocusId: focusId,
        };
      });
    };

    const listener = (changes: Record<string, unknown>, namespace: string) => {
      if (namespace === 'local' && (changes.jobs || changes.jobInFocus)) {
        handleStorageChange();
      }
    };

    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  // 4. Initial Load
  useEffect(() => {
    const loadInitial = async () => {
      const [jobsObj, focusId] = await Promise.all([
        jobsStorage.getValue(),
        jobInFocusStorage.getValue(),
      ]);

      setState({
        jobs: Object.values(jobsObj),
        jobInFocusId: focusId,
        isLoading: false,
      });
    };

    loadInitial();
  }, []);

  return {
    ...state,
    updateJob,
    deleteJob,
    // ... other methods
  };
}
```

### 2. Merge Utility with Echo Cancellation

```typescript
// src/utils/job-merge.ts

/**
 * Merge remote jobs with local state, preserving local changes
 * and ignoring "echoes" from our own recent saves.
 */
export function mergeJobs(
  localJobs: Job[],
  remoteJobs: Job[],
  recentSaves: Map<string, number>,
  echoWindowMs: number
): Job[] {
  const now = Date.now();
  const localMap = new Map(localJobs.map((j) => [j.id, j]));

  return remoteJobs.map((remoteJob) => {
    const localJob = localMap.get(remoteJob.id);

    // If no local version, use remote
    if (!localJob) return remoteJob;

    // If we recently saved this job, ignore the echo
    const lastSaveTime = recentSaves.get(remoteJob.id);
    if (lastSaveTime && now - lastSaveTime < echoWindowMs) {
      return localJob; // Keep local (we caused this change)
    }

    // Otherwise, use remote (external change)
    // Preserve referential identity if deeply equal
    if (isDeepEqual(localJob, remoteJob)) {
      return localJob;
    }

    return remoteJob;
  });
}

/**
 * Deep equality check for jobs (can be optimized with updatedAt comparison)
 */
function isDeepEqual(a: Job, b: Job): boolean {
  // Fast path: compare updatedAt timestamps
  if (a.updatedAt === b.updatedAt) return true;

  // Full comparison if timestamps differ
  return JSON.stringify(a) === JSON.stringify(b);
}
```

### 3. Refactored Handlers

Handlers become pure "action dispatchers" that don't need to read state:

```typescript
// src/entrypoints/job-details/hooks/useJobHandlers.ts

export function useJobHandlers(store: ReturnType<typeof useJobStore>) {
  const { updateJob, deleteJob } = store;

  // No more stale closure issues - updateJob uses functional updates internally
  const handleSaveField = useCallback(
    (jobId: string, fieldName: string, value: string) => {
      updateJob(jobId, { [fieldName]: value });
    },
    [updateJob]
  );

  // No more reading from stale allJobs array
  const handleChecklistToggle = useCallback(
    (jobId: string, itemId: string) => {
      // updateJob handles the functional update internally
      updateJob(jobId, {
        // The store's updateJob will merge this with current state
        checklist: {
          /* toggle logic in store */
        },
      });
    },
    [updateJob]
  );

  const handleDeleteJob = useCallback(
    async (jobId: string) => {
      if (!confirm('Are you sure you want to delete this job?')) return;
      await deleteJob(jobId);
    },
    [deleteJob]
  );

  // No more suppressReloadUntil or handleStorageChange needed!

  return {
    handleSaveField,
    handleChecklistToggle,
    handleDeleteJob,
  };
}
```

### 4. Integration with useImmediateSave

`useImmediateSave` continues to handle high-frequency typing, but calls `updateJob`:

```typescript
// In ResearchingView.tsx
const { value, setValue } = useImmediateSave({
  initialValue: job.content || '',
  onSave: (content) => updateJob(job.id, { content }),
  disabled: job.isExtracting,
  resetKey: job.id,
});
```

## Migration Strategy

### Phase 1: Create useJobStore (Non-Breaking)

1. Create `src/entrypoints/job-details/hooks/useJobStore.ts`
2. Create `src/utils/job-merge.ts` with merge utilities
3. Keep existing hooks working

### Phase 2: Migrate Components Incrementally

1. Update `App.tsx` to use `useJobStore` instead of `useJobState` + `useJobStorage`
2. Simplify `useJobHandlers` to accept store instead of raw state/storage
3. Remove `suppressReloadUntil` and `pendingReload` logic

### Phase 3: Cleanup

1. Remove `useJobState.ts` (merged into store)
2. Remove storage coordination from `useJobStorage.ts`
3. Update hook exports in `index.ts`

## Implementation Checklist

### Phase 1: Core Infrastructure ✅

- [x] Create `src/entrypoints/job-details/hooks/useJobStore.ts`
- [x] Create `src/utils/job-merge.ts` with `mergeJobs` and `isDeepEqual`
- [x] Update hook exports in `index.ts`

### Phase 2: Migrate Consumers (In Progress)

- [x] Migrate `job-details/App.tsx` to use `useJobStore`
- [x] Migrate `sidepanel/App.tsx` to use `useJobStore`
- [ ] Refactor `useJobHandlers` to use ID-based `updateJob` (currently uses adapter)
- [ ] Update `ResearchingView` to pass `updateJob` to `useImmediateSave`
- [ ] Update `DraftingView` similarly
- [ ] Remove `suppressReloadUntil` and `pendingReload` from state

### Phase 3: Cleanup

- [ ] Remove deprecated `useJobState.ts` (merged into store)
- [ ] Remove deprecated `useJobStorage.ts` (merged into store)
- [ ] Remove storage listener duplication from `useJobHandlers.ts`

### Testing

- [ ] Test: Rapid typing doesn't lose focus
- [ ] Test: Navigation during edit preserves data
- [ ] Test: Multi-tab sync works correctly
- [ ] Test: Extraction streaming updates properly

## Benefits

### Eliminates Fragile Patterns

| Before                           | After                                   |
| -------------------------------- | --------------------------------------- |
| `suppressReloadUntil` timestamps | Echo cancellation via save tracking     |
| `pendingReload` flags            | Merge logic handles all cases           |
| `loadJobs()` full reloads        | Incremental merge preserves references  |
| Index-based updates              | ID-based updates (immune to reordering) |

### Fixes Stale Closures

| Before                                | After                                              |
| ------------------------------------- | -------------------------------------------------- |
| `jobState.allJobs[index]` in handlers | `updateJob(jobId, changes)` with functional update |
| Reading state in async callbacks      | Store uses refs internally                         |

### Single Source of Truth

| Before                                       | After                        |
| -------------------------------------------- | ---------------------------- |
| `useJobState` + `useJobStorage` coordination | `useJobStore` manages both   |
| Manual state/storage sync                    | Automatic optimistic updates |

## Risks and Mitigations

### Risk: Conflicts in Multi-Tab Editing

**Mitigation:** The echo cancellation window (1 second) is short enough that genuine external changes will still propagate. For true collaborative editing, we'd need OT/CRDT, but that's out of scope.

### Risk: Memory Growth from recentSavesRef

**Mitigation:** Clean up old entries on every storage change event. Map entries are small (id string + timestamp number).

### Risk: Breaking Existing Tests

**Mitigation:** Phase migration allows keeping old hooks working during transition. Update tests incrementally.

## Related Files

- `src/entrypoints/job-details/hooks/useJobState.ts` - Current state hook (to be replaced)
- `src/entrypoints/job-details/hooks/useJobStorage.ts` - Current storage hook (to be simplified)
- `src/entrypoints/job-details/hooks/useJobHandlers.ts` - Current handlers (to be refactored)
- `src/hooks/useImmediateSave.ts` - High-frequency save hook (to be integrated)
- `src/entrypoints/job-details/App.tsx` - Main consumer of these hooks
