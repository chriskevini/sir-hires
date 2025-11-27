/**
 * Shared LLM utility functions
 *
 * These utilities are extracted from popup/App.tsx to be reused across:
 * - Popup (LLM settings configuration)
 * - SynthesisForm (document generation)
 * - Any future LLM-related features
 */

import type { TaskSettings } from './storage';

// ===== Constants =====

export const DEFAULT_ENDPOINT = 'http://localhost:1234';
export const DEFAULT_MODEL = 'qwen/qwen3-4b-2507';

// ===== Types =====

export type ProviderType = 'local' | 'cloud';

/**
 * Task types for per-task LLM settings
 * - synthesis: Resume/cover letter generation (creative, more tokens)
 * - extraction: Job parsing (deterministic, fewer tokens)
 */
export type LLMTask = 'synthesis' | 'extraction';

// ===== Per-Task Default Settings =====

/**
 * Default settings for each task type
 *
 * Synthesis: Higher creativity (temp ~0.7), more tokens (~4000)
 * - Used for resume/cover letter generation where variety is desired
 *
 * Extraction: Low creativity (temp ~0), fewer tokens (~2000)
 * - Used for job parsing where deterministic output is important
 */
export const DEFAULT_TASK_SETTINGS: Record<LLMTask, TaskSettings> = {
  synthesis: {
    maxTokens: 4000,
    temperature: 0.7,
  },
  extraction: {
    maxTokens: 2000,
    temperature: 0,
  },
};

// ===== Utility Functions =====

/**
 * Detects if the URL points to a local server or cloud provider
 *
 * Local indicators:
 * - localhost, 127.0.0.1, 0.0.0.0
 * - RFC 1918 private ranges: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
 * - Hostnames without dots (e.g., "myserver:1234")
 *
 * @param endpoint - The server URL to check
 * @returns 'local' or 'cloud'
 */
export function detectProvider(endpoint: string): ProviderType {
  try {
    // Handle URLs without protocol
    const urlString = endpoint.includes('://')
      ? endpoint
      : `http://${endpoint}`;
    const hostname = new URL(urlString).hostname.toLowerCase();

    // Local indicators
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      !hostname.includes('.') // e.g., "charlie:1234" or just "myserver"
    ) {
      return 'local';
    }

    // Check 172.16.0.0 - 172.31.255.255 (RFC 1918 private range)
    if (hostname.startsWith('172.')) {
      const parts = hostname.split('.');
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) {
        return 'local';
      }
    }

    return 'cloud';
  } catch {
    return 'local'; // Default to local if URL parsing fails
  }
}

/**
 * Normalizes an endpoint URL by ensuring it has a protocol prefix
 * and the correct path for chat completions.
 *
 * @param endpoint - The raw endpoint URL (e.g., "localhost:1234")
 * @returns Fully normalized URL (e.g., "http://localhost:1234/v1/chat/completions")
 */
export function normalizeEndpoint(endpoint: string): string {
  let normalized = endpoint.trim();

  // Add http:// if no protocol specified
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'http://' + normalized;
  }

  // Add /v1/chat/completions if not present
  if (!normalized.includes('/v1/chat/completions')) {
    normalized = normalized.replace(/\/+$/, '');
    normalized += '/v1/chat/completions';
  }

  return normalized;
}

/**
 * Derives the models endpoint from a chat completions endpoint.
 *
 * @param chatEndpoint - The chat completions endpoint URL
 * @returns The models endpoint URL
 */
export function getModelsEndpoint(chatEndpoint: string): string {
  return chatEndpoint.replace('/v1/chat/completions', '/v1/models');
}

/**
 * Extracts the base URL from a chat completions endpoint.
 * Useful for displaying in UI (without /v1/chat/completions suffix).
 *
 * @param endpoint - The full endpoint URL
 * @returns The base URL (e.g., "http://localhost:1234")
 */
export function getBaseUrl(endpoint: string): string {
  return endpoint.replace('/v1/chat/completions', '').replace(/\/+$/, '');
}
