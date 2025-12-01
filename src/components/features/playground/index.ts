/**
 * Prompt Playground Components
 *
 * Re-exports all playground-related components and types.
 */

export { TaskPanel } from './TaskPanel';
export type { TaskPanelProps, TaskPanelHandle } from './TaskPanel';

export { FreeformTaskPanel } from './FreeformTaskPanel';
export type { FreeformTaskPanelProps } from './FreeformTaskPanel';

export { LLMSettingsPanel } from './LLMSettingsPanel';

export { LLMParametersPanel } from './LLMParametersPanel';
export type { LLMParametersPanelProps } from './LLMParametersPanel';

export {
  TaskErrorDisplay,
  TaskStatsDisplay,
  TaskOutputDisplay,
} from './OutputDisplay';
export type {
  TaskErrorDisplayProps,
  TaskStatsDisplayProps,
  TaskOutputDisplayProps,
} from './OutputDisplay';

export type {
  TaskDefinition,
  ParseResult,
  RunStats,
  SynthesisContext,
  ContextField,
} from './types';

export { isValidJobData, isValidProfileData } from './validation';

// Color configuration exports
export {
  systemTabColor,
  contextFieldColors,
  getContextFieldColor,
  conversationRoleColors,
  synthesisTabConfigs,
  getSynthesisTabConfig,
  extractionTabConfigs,
  getExtractionTabConfig,
} from './colors';
export type {
  TabColorConfig,
  SynthesisTabId,
  SynthesisTabConfig,
  ExtractionTabId,
  ExtractionTabConfig,
} from './colors';
