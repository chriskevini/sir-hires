/// <reference types="wxt/vite-builder-env" />
/**
 * Development-mode validators for MarkdownDB pattern enforcement
 * These runtime checks help catch violations during development
 */

/**
 * Prohibited flat fields that should never be stored in Job objects
 * These should only exist as parsed values from the 'content' field
 */
const PROHIBITED_FIELDS = [
  'jobTitle',
  'company',
  'location',
  'salary',
  'jobType',
  'remoteType',
  'postedDate',
  'deadline',
  'rawDescription',
  'aboutJob',
  'aboutCompany',
  'responsibilities',
  'requirements',
  'notes',
  'narrativeStrategy',
  'targetedResume',
];

/**
 * Allowed fields in Job interface (whitelist)
 */
const ALLOWED_JOB_FIELDS = [
  'id',
  'content', // MarkdownDB template - source of truth
  'url',
  'applicationStatus',
  'checklist',
  'documents',
  'updatedAt',
  'createdAt',
  // Transient fields (not persisted)
  'isExtracting',
  'extractionError',
];

/**
 * Check if a Job object contains any prohibited flat fields
 * @param job - Job object to validate
 * @returns Array of violation messages (empty if valid)
 */
export function validateJobObject(job: Record<string, unknown>): string[] {
  const violations: string[] = [];

  for (const field of PROHIBITED_FIELDS) {
    if (field in job) {
      violations.push(
        `[MarkdownDB Pattern Violation] Job object contains prohibited field '${field}'. ` +
          `This field should only exist as a parsed value from 'content', not stored directly.`
      );
    }
  }

  // Check for unknown fields (not in whitelist)
  for (const field of Object.keys(job)) {
    if (!ALLOWED_JOB_FIELDS.includes(field)) {
      violations.push(
        `[MarkdownDB Pattern Warning] Job object contains unknown field '${field}'. ` +
          `This may be a typo or a new field that needs to be added to the whitelist.`
      );
    }
  }

  return violations;
}

/**
 * Storage item interface for WXT storage
 */
interface StorageItem<T> {
  getValue(): Promise<T>;
  setValue(value: T): Promise<void>;
  update?(updates: Partial<T>): Promise<void>;
}

/**
 * Create a proxy wrapper for storage operations that validates Job objects
 * Only active in development mode (import.meta.env.COMMAND === 'serve')
 */
export function createValidatedStorage<T extends Record<string, unknown>>(
  storageItem: StorageItem<T>
): StorageItem<T> {
  // Only validate in development mode
  if (import.meta.env.COMMAND !== 'serve') {
    return storageItem;
  }

  return {
    ...storageItem,

    async setValue(value: T) {
      // Validate each job in the object
      if (typeof value === 'object' && value !== null) {
        for (const [jobId, job] of Object.entries(value)) {
          if (typeof job === 'object' && job !== null) {
            const violations = validateJobObject(
              job as Record<string, unknown>
            );
            if (violations.length > 0) {
              console.error(
                `[MarkdownDB Validator] Violations detected in job ${jobId}:`,
                violations
              );
              console.error('Job object:', job);
              console.warn(
                'To fix: Remove flat fields and store only in "content" field'
              );
              // Log stack trace to help identify the source
              console.error(
                new Error('Stack trace for storage operation').stack
              );
            }
          }
        }
      }

      return storageItem.setValue(value);
    },

    async update(updates: Partial<T>) {
      // Validate updates
      if (typeof updates === 'object' && updates !== null) {
        for (const [jobId, job] of Object.entries(updates)) {
          if (typeof job === 'object' && job !== null) {
            const violations = validateJobObject(job);
            if (violations.length > 0) {
              console.error(
                `[MarkdownDB Validator] Violations detected in job update ${jobId}:`,
                violations
              );
              console.error('Update object:', job);
              console.warn(
                'To fix: Remove flat fields and store only in "content" field'
              );
              console.error(
                new Error('Stack trace for storage operation').stack
              );
            }
          }
        }
      }

      if (storageItem.update) {
        return storageItem.update(updates);
      }
      // Fallback for storage items without update method - merge with current value
      const current = await storageItem.getValue();
      return storageItem.setValue({ ...current, ...updates });
    },
  };
}

/**
 * Validate a single Job object and log violations
 * Use this in hooks/services before persisting data
 */
export function assertValidJob(
  job: Record<string, unknown>,
  context?: string
): void {
  if (import.meta.env.COMMAND !== 'serve') {
    return; // No-op in production
  }

  const violations = validateJobObject(job);
  if (violations.length > 0) {
    const contextStr = context ? ` (${context})` : '';
    console.error(
      `[MarkdownDB Validator] Job validation failed${contextStr}:`,
      violations
    );
    console.error('Job object:', job);
    console.warn(
      'To fix: Remove flat fields and store only in "content" field'
    );
    console.error(new Error('Stack trace for validation').stack);
  }
}

/**
 * Create a warning banner for dev mode if violations are detected
 * Call this on app initialization in dev mode
 */
export function initDevModeValidation() {
  if (import.meta.env.COMMAND !== 'serve') {
    return;
  }

  console.info(
    '%c[MarkdownDB Pattern] Dev-mode validation enabled',
    'background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px;'
  );

  console.info(
    'Storage operations will be validated for MarkdownDB pattern compliance.'
  );
  console.info(
    'Violations will be logged with stack traces to help identify the source.'
  );
}
