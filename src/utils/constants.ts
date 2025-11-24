/**
 * Application-wide constants
 * Centralized location for magic numbers and configuration values
 */

// ===== Timeout Constants =====

/**
 * LLM API request timeout in milliseconds (60 seconds)
 */
export const LLM_API_TIMEOUT_MS = 60000;

/**
 * Service worker keepalive interval in milliseconds (20 seconds)
 * Chrome terminates inactive service workers after ~30 seconds
 */
export const SERVICE_WORKER_KEEPALIVE_INTERVAL_MS = 20000;

/**
 * UI update interval in milliseconds (1 minute)
 */
export const UI_UPDATE_INTERVAL_MS = 60000;

// ===== Retry Configuration =====

/**
 * Maximum number of retries for sending messages to sidepanel
 */
export const MESSAGE_RETRY_MAX_ATTEMPTS = 5;

/**
 * Delay between message retry attempts in milliseconds
 */
export const MESSAGE_RETRY_DELAY_MS = 200;

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
