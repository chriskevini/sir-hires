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

// =============================================================================
// SYNTHESIS TAB COLORS
// =============================================================================

export type SynthesisTabId =
  | 'system'
  | 'profile'
  | 'job'
  | 'template'
  | 'task'
  | 'tone';

/**
 * Full tab configuration for synthesis tabs
 */
export interface SynthesisTabConfig extends TabColorConfig {
  id: SynthesisTabId;
  label: string;
  /** Unselected tab colors (hover states) */
  color: string;
  /** Selected tab colors */
  selectedColor: string;
}

/**
 * Complete tab configurations for synthesis task inputs.
 * Each tab has semantic coloring that helps users identify
 * different parts of the synthesis context.
 */
export const synthesisTabConfigs: readonly SynthesisTabConfig[] = [
  {
    id: 'system',
    label: 'System',
    color:
      'border-slate-500/50 text-slate-600 dark:text-slate-400 hover:bg-slate-500/10',
    selectedColor:
      'bg-slate-500/20 border-slate-500/50 text-slate-700 dark:text-slate-300',
    panelBg: 'bg-slate-500/5',
    panelBorder: 'border-slate-500/50',
  },
  {
    id: 'profile',
    label: 'Profile',
    color:
      'border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10',
    selectedColor:
      'bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-300',
    panelBg: 'bg-blue-500/5',
    panelBorder: 'border-blue-500/50',
  },
  {
    id: 'job',
    label: 'Job',
    color:
      'border-green-500/50 text-green-600 dark:text-green-400 hover:bg-green-500/10',
    selectedColor:
      'bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-300',
    panelBg: 'bg-green-500/5',
    panelBorder: 'border-green-500/50',
  },
  {
    id: 'template',
    label: 'Template',
    color:
      'border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10',
    selectedColor:
      'bg-purple-500/20 border-purple-500/50 text-purple-700 dark:text-purple-300',
    panelBg: 'bg-purple-500/5',
    panelBorder: 'border-purple-500/50',
  },
  {
    id: 'task',
    label: 'Task',
    color:
      'border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10',
    selectedColor:
      'bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300',
    panelBg: 'bg-amber-500/5',
    panelBorder: 'border-amber-500/50',
  },
  {
    id: 'tone',
    label: 'Tone',
    color:
      'border-pink-500/50 text-pink-600 dark:text-pink-400 hover:bg-pink-500/10',
    selectedColor:
      'bg-pink-500/20 border-pink-500/50 text-pink-700 dark:text-pink-300',
    panelBg: 'bg-pink-500/5',
    panelBorder: 'border-pink-500/50',
  },
] as const;

/**
 * Get synthesis tab config by ID
 */
export function getSynthesisTabConfig(id: SynthesisTabId): SynthesisTabConfig {
  return synthesisTabConfigs.find((t) => t.id === id) ?? synthesisTabConfigs[0];
}

// =============================================================================
// EXTRACTION TAB COLORS
// =============================================================================

export type ExtractionTabId = 'system' | 'input';

/**
 * Full tab configuration for extraction tabs
 */
export interface ExtractionTabConfig extends TabColorConfig {
  id: ExtractionTabId;
  label: string;
  /** Unselected tab colors (hover states) */
  color: string;
  /** Selected tab colors */
  selectedColor: string;
}

/**
 * Tab configurations for extraction task inputs (job/profile extraction).
 */
export const extractionTabConfigs: readonly ExtractionTabConfig[] = [
  {
    id: 'system',
    label: 'System',
    color:
      'border-slate-500/50 text-slate-600 dark:text-slate-400 hover:bg-slate-500/10',
    selectedColor:
      'bg-slate-500/20 border-slate-500/50 text-slate-700 dark:text-slate-300',
    panelBg: 'bg-slate-500/5',
    panelBorder: 'border-slate-500/50',
  },
  {
    id: 'input',
    label: 'Raw Input',
    color:
      'border-cyan-500/50 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10',
    selectedColor:
      'bg-cyan-500/20 border-cyan-500/50 text-cyan-700 dark:text-cyan-300',
    panelBg: 'bg-cyan-500/5',
    panelBorder: 'border-cyan-500/50',
  },
] as const;

/**
 * Get extraction tab config by ID
 */
export function getExtractionTabConfig(
  id: ExtractionTabId
): ExtractionTabConfig {
  return (
    extractionTabConfigs.find((t) => t.id === id) ?? extractionTabConfigs[0]
  );
}
