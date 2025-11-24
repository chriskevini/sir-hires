/**
 * Application-wide constants
 * Non-configurable constants only - user-configurable values are in src/config.ts
 */

// Storage key prefixes (WXT storage pattern)
export const STORAGE_PREFIX = {
  LOCAL: 'local:',
  SESSION: 'session:',
  SYNC: 'sync:',
} as const;
