/**
 * Playground Color Configuration
 *
 * Centralized color definitions for the tabbed interface in playground panels.
 * Colors follow a semantic pattern using Tailwind's color palette with
 * consistent opacity levels for backgrounds and borders.
 *
 * Pattern:
 * - panelBg: 5% opacity for subtle background tint
 * - panelBorder: 50% opacity for visible but not harsh borders
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface TabColorConfig {
  /** Background color for the tab panel (5% opacity) */
  panelBg: string;
  /** Border color for tabs and panels (50% opacity) */
  panelBorder: string;
}

// =============================================================================
// SHARED / COMMON COLORS
// =============================================================================

/**
 * System/default tab color - used for system prompts
 */
export const systemTabColor: TabColorConfig = {
  panelBg: 'bg-slate-500/5',
  panelBorder: 'border-slate-500/50',
};

// =============================================================================
// CONTEXT FIELD COLORS (Cycling)
// =============================================================================

/**
 * Colors for context fields in FreeformTaskPanel.
 * These cycle through for each added context field.
 */
export const contextFieldColors: readonly TabColorConfig[] = [
  { panelBg: 'bg-cyan-500/5', panelBorder: 'border-cyan-500/50' },
  { panelBg: 'bg-green-500/5', panelBorder: 'border-green-500/50' },
  { panelBg: 'bg-purple-500/5', panelBorder: 'border-purple-500/50' },
  { panelBg: 'bg-amber-500/5', panelBorder: 'border-amber-500/50' },
  { panelBg: 'bg-pink-500/5', panelBorder: 'border-pink-500/50' },
  { panelBg: 'bg-blue-500/5', panelBorder: 'border-blue-500/50' },
] as const;

/**
 * Get color config for a context field by index (cycles through colors)
 */
export function getContextFieldColor(index: number): TabColorConfig {
  return contextFieldColors[index % contextFieldColors.length];
}

// =============================================================================
// CONVERSATION MODE COLORS (Role-based)
// =============================================================================

/**
 * Colors for conversation mode message roles
 */
export const conversationRoleColors: Record<
  'system' | 'user' | 'assistant',
  TabColorConfig
> = {
  system: { panelBg: 'bg-blue-500/5', panelBorder: 'border-blue-500/50' },
  user: { panelBg: 'bg-green-500/5', panelBorder: 'border-green-500/50' },
  assistant: {
    panelBg: 'bg-purple-500/5',
    panelBorder: 'border-purple-500/50',
  },
} as const;
