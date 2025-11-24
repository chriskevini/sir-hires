# Reusable Hooks Reference

> **For AI Agents:** Before creating custom state management, **search this document** for existing hooks. Most common patterns are already implemented.

## Quick Navigation

- [Simple State Hooks](#simple-state-hooks) - `useToggleState`, `useEditorState`, `useJobState`
- [Validation Hooks](#validation-hooks) - `useJobValidation`, `useProfileValidation`
- [Auto-Save Hooks](#auto-save-hooks) - `useSimpleAutoSave`
- [Business Logic Hooks](#business-logic-hooks) - `useJobExtraction`, `useBackupRestore`, `useParsedJob`
- [Utility Hooks](#utility-hooks) - `useDebounce`, `useInterval`
- [Complete State Management](#complete-state-management) - `useJobService`, `useJobHandlers`, `useDocumentManager`, `useNavigation`, `useJobStorage`
- [Anti-Patterns](#-anti-patterns-what-not-to-do)

---

## Simple State Hooks

### useToggleState

**Purpose:** Manage boolean toggle state with explicit set function.

**Location:** `src/entrypoints/job-details/hooks/useToggleState.ts`

**Returns:** `[state: boolean, toggle: () => void, setValue: (value: boolean) => void]`

**Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/ResearchingView.tsx:49
import { useToggleState } from '../hooks';

const [isTemplateVisible, toggleTemplateVisible, setTemplateVisible] =
  useToggleState(false);

// Toggle
<button onClick={toggleTemplateVisible}>Show Template</button>

// Explicit set
<button onClick={() => setTemplateVisible(true)}>Always Show</button>
```

**When to Use:**

- Collapse/expand panels
- Show/hide modals
- Any boolean flag that needs toggling

**Anti-Pattern:** Managing toggle state manually with separate functions (see [Anti-Pattern 3](#-anti-pattern-3-managing-toggle-state-manually))

---

### useEditorState

**Purpose:** Manage textarea state with change/blur handlers and optional debouncing.

**Location:** `src/entrypoints/job-details/hooks/useEditorState.ts`

**Parameters:**

```typescript
interface UseEditorStateOptions {
  initialContent: string;
  onChange?: (content: string) => void; // Optional debounced callback
  onBlur?: (content: string) => void;
  debounceDelay?: number;
}
```

**Returns:**

```typescript
{
  content: string;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleBlur: () => void;
  setContent: (content: string) => void;
}
```

**Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/ResearchingView.tsx:54
import { useEditorState } from '../hooks';

const { content: editorContent, handleChange: handleEditorChange } =
  useEditorState({
    initialContent: job.content || '',
  });

<textarea
  value={editorContent}
  onChange={handleEditorChange}
  placeholder="Job template content..."
/>
```

**Key Features:**

- ✅ Syncs with external content changes
- ✅ Optional debouncing for onChange
- ✅ Separate blur handler for save triggers
- ✅ Manual `setContent` for external updates

**Anti-Pattern:** Manual textarea state management with debouncing (see [Anti-Pattern 4](#-anti-pattern-4-manual-textarea-state-management))

---

### useJobState

**Purpose:** Complete job state management (jobs list, filters, current job).

**Location:** `src/entrypoints/job-details/hooks/useJobState.ts`

**Returns:** Full job state object with jobs array, current job, and filter settings.

**When to Use:** Building full job management interfaces (like `job-details` entrypoint).

**See Also:** [Complete State Management](#complete-state-management) section.

---

## Validation Hooks

### useJobValidation

**Purpose:** Validate job template content with debouncing.

**Location:** `src/entrypoints/job-details/hooks/useJobValidation.ts`

**Parameters:**

```typescript
interface UseJobValidationOptions {
  content: string;
  isExtracting?: boolean;
  hasError?: boolean;
  debounceMs?: number; // Default: 500ms
}
```

**Returns:** `ValidationResult | null`

```typescript
interface ValidationResult {
  valid: boolean;
  errors: Array<{ message: string }>;
  warnings: Array<{ message: string }>;
  info: Array<{ message: string }>;
}
```

**Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/ResearchingView.tsx:70
import { useJobValidation } from '../hooks';

const validation = useJobValidation({
  content: editorContent,
  isExtracting: job.isExtracting,
  hasError: !!job.extractionError,
});

// Use with ValidationPanel component
<ValidationPanel
  isValid={validation?.valid || null}
  errorCount={validation?.errors.length || 0}
  warningCount={validation?.warnings.length || 0}
  infoCount={validation?.info.length || 0}
  messages={[
    ...(validation?.errors || []),
    ...(validation?.warnings || []),
    ...(validation?.info || []),
  ]}
/>
```

**Key Features:**

- ✅ Debounced validation (500ms default) to avoid thrashing
- ✅ Skips validation during extraction or error states
- ✅ Initializes on mount for immediate feedback
- ✅ Pairs perfectly with `ValidationPanel` component

**Related Components:** `ValidationPanel` (see [Components Reference](./COMPONENTS_REFERENCE.md#validationpanel))

---

### useProfileValidation

**Purpose:** Validate profile template content (similar to `useJobValidation` but for profiles).

**Location:** `src/entrypoints/profile/hooks/useProfileValidation.ts`

**Usage:** Same pattern as `useJobValidation`, but uses `parseProfileTemplate` and `validateProfileTemplate`.

**Parameters:**

```typescript
interface UseProfileValidationOptions {
  content: string;
  debounceMs?: number; // Default: 500ms
}
```

**Returns:** Same `ValidationResult` structure as `useJobValidation`.

---

## Auto-Save Hooks

### useSimpleAutoSave

**Purpose:** Auto-save edited content with debouncing (no dirty state tracking).

**Location:** `src/entrypoints/job-details/hooks/useSimpleAutoSave.ts`

**Parameters:**

```typescript
interface UseSimpleAutoSaveOptions {
  currentValue: string;
  savedValue: string;
  isExtracting?: boolean;
  hasError?: boolean;
  onSave: (value: string) => void;
  debounceMs?: number; // Default: 1000ms
}
```

**Returns:** `void` (side effect only)

**Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/ResearchingView.tsx:77
import { useSimpleAutoSave } from '../hooks';

useSimpleAutoSave({
  currentValue: editorContent,
  savedValue: job.content || '',
  isExtracting: job.isExtracting,
  hasError: !!job.extractionError,
  onSave: (value) => onSaveField(index, 'content', value),
});
```

**Key Features:**

- ✅ Debounced save (1s default) to avoid excessive writes
- ✅ Skips save during extraction or error states
- ✅ Compares current vs. saved to avoid unnecessary saves
- ✅ No UI state needed - just pass callback

**When to Use:**

- Text editors with auto-save behavior
- Forms where you want to save changes after user stops typing
- Any input that should persist automatically

**When NOT to Use:**

- If you need explicit "Save" button feedback
- If you need to track dirty/pristine state in UI
- If save operation is expensive (consider explicit save instead)

---

## Business Logic Hooks

### useJobExtraction

**Purpose:** Handle job extraction from active tab with streaming events.

**Location:** `src/entrypoints/sidepanel/hooks/useJobExtraction.ts`

**Parameters:**

```typescript
interface JobStorage {
  getAllJobs: () => Promise<Job[]>;
  saveAllJobs: (jobs: Job[]) => Promise<void>;
  initializeAllChecklists: () => Job['checklist'];
}

useJobExtraction(
  storage: JobStorage,
  loadJobInFocus: () => Promise<void>
)
```

**Returns:**

```typescript
{
  extracting: boolean;
  extractingJob: ExtractingJob | null;
  error: string | null;
  handleExtractJob: () => Promise<void>;
}
```

**Usage Example:**

```typescript
// From: src/entrypoints/sidepanel/App.tsx:89
import { useJobExtraction } from './hooks';

const {
  extracting,
  extractingJob,
  error,
  handleExtractJob,
} = useJobExtraction(storage, loadJobInFocus);

<button onClick={handleExtractJob}>Extract Job</button>

{extracting && extractingJob && (
  <div>Extracting... {extractingJob.chunks.length} chunks</div>
)}
```

**Key Features:**

- ✅ Detects active tab
- ✅ Coordinates with background script (Rule 1: Multi-step async)
- ✅ Listens to extraction events (started, chunk, complete, error)
- ✅ Ephemeral state for live progress (not persisted)
- ✅ Watches for context menu trigger via storage
- ✅ Sets `jobInFocus` only after extraction completes (prevents race condition)

**Why This Hook Exists:**

Extraction involves multiple async steps (check tab → request extraction → stream chunks → save → set focus). Coordinating this manually is error-prone. This hook encapsulates the entire workflow.

**Event-Driven Architecture:** This hook follows Rule 1 (Multi-Step Async Operations → Background Coordinates). See `AGENTS.md` for details.

---

### useBackupRestore

**Purpose:** Import and export job backups as JSON files.

**Location:** `src/entrypoints/sidepanel/hooks/useBackupRestore.ts`

**Returns:**

```typescript
{
  handleImport: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleExport: () => Promise<void>;
}
```

**Usage Example:**

```typescript
// From: src/entrypoints/sidepanel/App.tsx:95
import { useBackupRestore } from './hooks';

const { handleImport, handleExport } = useBackupRestore(
  storage,
  loadJobInFocus
);

<input type="file" onChange={handleImport} />
<button onClick={handleExport}>Export Backup</button>
```

**Key Features:**

- ✅ File parsing and validation
- ✅ Automatic backup file naming (`jobs-backup-YYYY-MM-DD.json`)
- ✅ Error handling for invalid JSON
- ✅ Reloads job after import

---

### useParsedJob

**Purpose:** Access parsed job data from `ParsedJobProvider` context.

**Location:** `src/components/features/ParsedJobProvider.tsx`

**Parameters:** `jobId: string | null`

**Returns:** `JobTemplateData | null`

```typescript
interface JobTemplateData {
  topLevelFields: Record<string, string>; // e.g., { TITLE: 'Engineer', COMPANY: 'Acme' }
  sections: Record<string, string[]>; // e.g., { REQUIREMENTS: ['React', 'TypeScript'] }
}
```

**Usage Example:**

```typescript
// Must be inside ParsedJobProvider tree
import { useParsedJob } from '@/components/features/ParsedJobProvider';

const parsed = useParsedJob(job.id);
const jobTitle = parsed?.topLevelFields['TITLE'] || 'Untitled';
const requirements = parsed?.sections['REQUIREMENTS'] || [];
```

**Key Features:**

- ✅ Returns cached parsed data (no re-parsing)
- ✅ Returns `null` if job not found or has no content
- ✅ Memoized for performance

**Required Setup:**

You must wrap your component tree with `ParsedJobProvider`:

```typescript
import { ParsedJobProvider } from '@/components/features/ParsedJobProvider';

<ParsedJobProvider jobs={allJobs}>
  <YourComponent />
</ParsedJobProvider>
```

**Anti-Pattern:** Parsing job templates on every render (see [Anti-Pattern 2](#-anti-pattern-2-not-using-parsedjobprovider))

**Related:** See **[MARKDOWN_DB_REFERENCE.md](./MARKDOWN_DB_REFERENCE.md)** for complete MarkdownDB syntax, templates, and patterns.

---

## Utility Hooks

### useDebounce

**Purpose:** Debounce callback execution (useful for validation, auto-save).

**Location:** `src/entrypoints/job-details/hooks/useDebounce.ts`

**Parameters:**

```typescript
useDebounce(
  callback: () => void,
  delay: number,
  dependencies: React.DependencyList
)
```

**Returns:** `void` (side effect only)

**Usage Example:**

```typescript
import { useDebounce } from '../hooks';

useDebounce(
  () => {
    console.info('Validation triggered');
    performValidation();
  },
  500,
  [editorContent]
);
```

**When to Use:**

- Delaying expensive operations (validation, API calls)
- Triggering actions after user stops typing
- Reducing update frequency for performance

**Note:** Many hooks include built-in debouncing (e.g., `useEditorState`, `useJobValidation`, `useSimpleAutoSave`). Check if your use case is already covered before using this directly.

---

### useInterval

**Purpose:** Run callback on interval with automatic cleanup.

**Location:** `src/entrypoints/job-details/hooks/useInterval.ts`

**Parameters:**

```typescript
useInterval(
  callback: () => void,
  delay: number | null // Pass null to pause interval
)
```

**Usage Example:**

```typescript
import { useInterval } from '../hooks';

// Auto-refresh every 5 seconds
useInterval(() => {
  refreshData();
}, 5000);

// Conditional interval
useInterval(
  () => refreshData(),
  isActive ? 5000 : null // Pauses when isActive is false
);
```

**Key Features:**

- ✅ Automatic cleanup on unmount
- ✅ Pass `null` as delay to pause interval
- ✅ Updates callback reference without restarting interval

---

## Complete State Management

These hooks provide full state management for complex features. They combine multiple concerns (storage, business logic, UI state) into cohesive state management solutions.

**Location:** `src/entrypoints/job-details/hooks/`

**Documentation:** See `src/entrypoints/job-details/hooks/index.ts` for exported types and detailed usage.

### Overview

| Hook                 | Purpose                                    | Use Case                                    |
| -------------------- | ------------------------------------------ | ------------------------------------------- |
| `useJobState`        | Complete job state (list, filters, focus)  | Managing jobs array and current selection   |
| `useJobStorage`      | Job storage CRUD operations                | Save/load/delete jobs from storage          |
| `useJobService`      | Business logic (validation, backup, stats) | Higher-level job operations                 |
| `useNavigation`      | View navigation logic                      | Switching between views (sidebar, statuses) |
| `useDocumentManager` | Document CRUD operations                   | Managing sub-documents within jobs          |
| `useJobHandlers`     | Event handlers for job operations          | Click handlers, form submissions            |

### useJobStorage

**Purpose:** Job storage CRUD operations.

**Returns:**

```typescript
{
  getAllJobs: () => Promise<Job[]>;
  saveAllJobs: (jobs: Job[]) => Promise<void>;
  saveJob: (job: Job) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  updateJobField: (jobId: string, field: string, value: any) => Promise<void>;
  // ... and more
}
```

**When to Use:** When you need direct storage operations without higher-level business logic.

---

### useJobService

**Purpose:** Business logic layer on top of storage (validation, backup, stats).

**Returns:**

```typescript
{
  validateJob: (job: Job) => ValidationResult;
  exportJobsBackup: () => Promise<void>;
  importJobsBackup: (file: File) => Promise<void>;
  getJobStats: () => {
    total: number;
    byStatus: Record<string, number>;
  };
  // ... and more
}
```

**When to Use:** When you need business logic operations that involve multiple storage calls or complex logic.

---

### useNavigation

**Purpose:** View navigation logic (sidebar, status-based routing).

**Returns:**

```typescript
{
  currentView: 'sidebar' | 'researching' | 'drafting' | ...;
  navigateToView: (view: string) => void;
  navigateToStatus: (status: string) => void;
  goBack: () => void;
  // ... and more
}
```

**When to Use:** Building navigation systems within job-details or similar complex entrypoints.

**Related:** See `JobViewRouter` component in [Components Reference](./COMPONENTS_REFERENCE.md#jobviewrouter).

---

### useDocumentManager

**Purpose:** Document CRUD operations (sub-documents within jobs).

**Returns:**

```typescript
{
  documents: Document[];
  activeDocument: Document | null;
  createDocument: (name: string) => Promise<void>;
  updateDocument: (docId: string, content: string) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  setActiveDocument: (docId: string) => void;
  // ... and more
}
```

**When to Use:** Managing multiple documents/files within a job (e.g., cover letter, resume versions).

---

### useJobHandlers

**Purpose:** Event handlers for job operations (click, edit, delete).

**Returns:**

```typescript
{
  handleJobClick: (jobId: string) => void;
  handleJobEdit: (jobId: string, field: string, value: any) => void;
  handleJobDelete: (jobId: string) => void;
  handleStatusChange: (jobId: string, status: string) => void;
  // ... and more
}
```

**When to Use:** Building job management UIs with consistent event handling patterns.

---

## 🚨 Anti-Patterns: What NOT to Do

### ❌ Anti-Pattern 1: Parsing Job Templates on Every Render

**Bad:**

```typescript
// Parsing on every render (expensive)
function JobCard({ job }) {
  const parsed = parseJobTemplate(job.content); // ❌ Re-parses every time
  return <div>{parsed.topLevelFields['TITLE']}</div>;
}
```

**Good:**

```typescript
// Using cached parsed data
function JobCard({ job }) {
  const parsed = useParsedJob(job.id); // ✅ Cached
  return <div>{parsed?.topLevelFields['TITLE']}</div>;
}
```

**Why:** Parsing is expensive (regex, string manipulation). Without caching, you're doing 10-100x more work than necessary.

---

### ❌ Anti-Pattern 2: Not Using ParsedJobProvider

**Bad:**

```typescript
// Every component parses independently
function App() {
  return (
    <>
      <JobTitle job={job} /> {/* Parses here */}
      <JobCompany job={job} /> {/* Parses again */}
      <JobRequirements job={job} /> {/* Parses again */}
    </>
  );
}
```

**Good:**

```typescript
// Parse once, use everywhere
import { ParsedJobProvider } from '@/components/features/ParsedJobProvider';

function App() {
  return (
    <ParsedJobProvider jobs={allJobs}>
      <JobTitle job={job} /> {/* Uses cached parse */}
      <JobCompany job={job} /> {/* Uses cached parse */}
      <JobRequirements job={job} /> {/* Uses cached parse */}
    </ParsedJobProvider>
  );
}
```

**Why:** Parsing once and caching results eliminates redundant work and improves performance dramatically.

---

### ❌ Anti-Pattern 3: Managing Toggle State Manually

**Bad:**

```typescript
const [isOpen, setIsOpen] = useState(false);

const toggle = () => setIsOpen(!isOpen);
const open = () => setIsOpen(true);
const close = () => setIsOpen(false);
```

**Good:**

```typescript
const [isOpen, toggle, setIsOpen] = useToggleState(false);
// Now you have: toggle(), setIsOpen(true), setIsOpen(false)
```

**Why:** Less boilerplate, consistent pattern across codebase.

---

### ❌ Anti-Pattern 4: Manual Textarea State Management

**Bad:**

```typescript
const [content, setContent] = useState('');
const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

const handleChange = (e) => {
  setContent(e.target.value);

  if (timer) clearTimeout(timer);
  setTimer(
    setTimeout(() => {
      // Do something with debounced value
    }, 500)
  );
};

useEffect(() => {
  return () => {
    if (timer) clearTimeout(timer);
  };
}, [timer]);
```

**Good:**

```typescript
const { content, handleChange } = useEditorState({
  initialContent: '',
  onChange: (value) => {
    // Automatically debounced
  },
  debounceDelay: 500,
});
```

**Why:** `useEditorState` handles debouncing, cleanup, and external sync automatically.

---

### ❌ Anti-Pattern 5: Duplicating Validation Logic

**Bad:**

```typescript
// Manual validation in every component
function MyEditor({ content }) {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = parseJobTemplate(content);
      const validation = validateJobTemplate(parsed);
      setErrors(validation.errors);
    }, 500);
    return () => clearTimeout(timer);
  }, [content]);

  return <div>{errors.map(e => <div>{e}</div>)}</div>;
}
```

**Good:**

```typescript
// Using validation hook
import { useJobValidation } from '../hooks';

function MyEditor({ content }) {
  const validation = useJobValidation({ content });

  return <ValidationPanel
    isValid={validation?.valid || null}
    messages={[...(validation?.errors || [])]}
  />;
}
```

**Why:** `useJobValidation` handles debouncing, parsing, validation, and state management. Pair with `ValidationPanel` for complete validation UI.

---

## 🤖 Guidelines for AI Agents

### Before Creating ANY Hook:

1. **🔍 Search this document** for existing hooks
2. **📖 Read the relevant section** to understand usage
3. **💡 Ask yourself:** "Can I use an existing hook instead?"
4. **✅ Only create new hook** if no existing solution fits

### Red Flags That Should Trigger This Document:

- ❗ "I need to toggle something" → Use `useToggleState`
- ❗ "I need to parse job data" → Use `useParsedJob` (wrap tree with `ParsedJobProvider`)
- ❗ "I need validation" → Use `useJobValidation` or `useProfileValidation`
- ❗ "I need auto-save" → Use `useSimpleAutoSave`
- ❗ "I need to manage textarea state" → Use `useEditorState`
- ❗ "I need to debounce something" → Check if hook already has debouncing, else use `useDebounce`
- ❗ "I need to extract jobs" → Use `useJobExtraction`
- ❗ "I need backup/restore" → Use `useBackupRestore`

### When Creating New Hooks:

1. **Place in correct directory:**
   - Generic utilities → `src/hooks/` (e.g., `useDebounce`, `useInterval`)
   - Entrypoint-specific → `src/entrypoints/<name>/hooks/`
   - Feature-specific → `src/components/features/<name>/hooks/`

2. **Add TypeScript types:**
   - Define parameter interfaces
   - Define return type interfaces
   - Export types for consumers

3. **Add JSDoc comments:**
   - Document purpose
   - Document parameters
   - Document return value
   - Add usage example

4. **Update this document:**
   - Add to appropriate category
   - Include usage examples
   - Document when to use vs. when not to use

---

## 📚 Related Documentation

- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick lookup tables and decision trees
- **[COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md)** - Detailed component documentation
- **[MARKDOWN_DB_REFERENCE.md](./MARKDOWN_DB_REFERENCE.md)** - MarkdownDB templates and patterns
- **[AGENTS.md](../AGENTS.md)** - Complete WXT + React development guide
- **[docs/refactors/component-css-architecture.md](./refactors/component-css-architecture.md)** - Component CSS patterns

---

## 🎯 Success Criteria

You're using hooks correctly if:

- ✅ You import existing hooks instead of reimplementing logic
- ✅ You're not duplicating functionality that already exists
- ✅ Your code is shorter and clearer than before
- ✅ Performance is optimized (e.g., using `useParsedJob` instead of parsing directly)
- ✅ Bug fixes in shared hooks automatically benefit your feature

---

**Last Updated:** November 2024 (Split from REUSABLE_COMPONENTS.md for better AI agent usability)
