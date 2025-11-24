/**
 * Application-wide constants
 *
 * NOTE: User-configurable constants have been moved to src/config.ts
 * This file now re-exports them for backward compatibility.
 * Prefer importing from config.ts for new code.
 */

// ===== Re-exports from config.ts (User-Configurable) =====

export {
  LLM_API_TIMEOUT_MS,
  SERVICE_WORKER_KEEPALIVE_INTERVAL_MS,
  UI_UPDATE_INTERVAL_MS,
  MESSAGE_RETRY_MAX_ATTEMPTS,
  MESSAGE_RETRY_DELAY_MS,
} from '../config';

// ===== Derived Constants =====

/**
 * LLM API request timeout in seconds (for user-facing messages)
 * Automatically derived from LLM_API_TIMEOUT_MS
 */
export const LLM_API_TIMEOUT_SECONDS = 60; // LLM_API_TIMEOUT_MS / 1000

// ===== LLM Configuration Defaults =====

/**
 * Default LLM endpoint URL
 */
export const DEFAULT_LLM_ENDPOINT = 'http://localhost:1234/v1/chat/completions';

/**
 * Default LLM models endpoint URL
 */
export const DEFAULT_LLM_MODELS_ENDPOINT = 'http://localhost:1234/v1/models';

/**
 * Default max tokens for LLM completion
 */
export const DEFAULT_LLM_MAX_TOKENS = 2000;

/**
 * Default temperature for LLM completion
 */
export const DEFAULT_LLM_TEMPERATURE = 0.3;

// ===== Storage Constants =====

/**
 * Storage key prefixes
 */
export const STORAGE_PREFIX = {
  LOCAL: 'local:',
  SESSION: 'session:',
  SYNC: 'sync:',
} as const;
