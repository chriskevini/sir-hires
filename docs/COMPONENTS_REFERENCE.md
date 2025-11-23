# Components Reference

Complete reference for all reusable components in the project. For quick lookup, see `docs/QUICK_REFERENCE.md`.

---

## 🎨 UI Components (`src/components/ui/`)

### 1. Modal

**File:** `src/components/ui/Modal.tsx:12`

**Purpose:** Display content in a portal-based modal overlay with escape key and outside-click handling.

**When to Use:**

- Confirmation dialogs
- Forms that need focus (synthesis settings, export options)
- Content that should overlay everything (z-index issues)

**Props:**

```typescript
interface ModalProps {
  isOpen: boolean; // Controls visibility
  onClose: () => void; // Called on escape/overlay click
  title?: string; // Optional header title
  children: React.ReactNode; // Modal content
  className?: string; // Custom styling
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/drafting-view.tsx:293
import { Modal } from '@/components/ui/Modal';

const [isSynthesisModalOpen, setIsSynthesisModalOpen] = useState(false);

<Modal
  isOpen={isSynthesisModalOpen}
  onClose={() => setIsSynthesisModalOpen(false)}
  title="✨ Synthesize with LLM"
>
  <SynthesisForm
    documents={documents}
    onSynthesize={handleSynthesize}
    onClose={() => setIsSynthesisModalOpen(false)}
  />
</Modal>
```

**Key Features:**

- ✅ React Portal (renders to `document.body`)
- ✅ Escape key handling
- ✅ Outside-click closes modal
- ✅ Prevents z-index issues with parent containers

**Anti-Pattern:**

❌ Rendering modals in parent DOM tree → overflow/z-index issues  
✅ Always use `Modal` component with React Portal

---

### 2. CollapsiblePanel

**File:** `src/components/ui/CollapsiblePanel.tsx:15`

**Purpose:** Generic collapsible section with toggle functionality.

**When to Use:**

- Validation panels
- Template panels
- Any section that should be collapsible to save screen space

**Props:**

```typescript
interface CollapsiblePanelProps {
  isCollapsed: boolean; // Collapse state
  onToggle: () => void; // Toggle handler
  header: React.ReactNode; // Header content (can include status, icons)
  children: React.ReactNode; // Panel content
  className?: string;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/job-details/components/JobTemplatePanel.tsx:35
import { CollapsiblePanel } from '@/components/ui/CollapsiblePanel';

const [isCollapsed, toggleCollapsed] = useToggleState(true);

<CollapsiblePanel
  isCollapsed={isCollapsed}
  onToggle={toggleCollapsed}
  header={
    <>
      <span>📋 Job Template</span>
      <span className="template-hint">Copy & paste to start editing</span>
    </>
  }
>
  <pre className="template-code">{jobTemplate}</pre>
</CollapsiblePanel>
```

**Key Features:**

- ✅ Controlled component (you manage state)
- ✅ Custom header content (icons, badges, counts)
- ✅ Animated collapse/expand with CSS
- ✅ Works with `useToggleState` hook

---

### 3. ValidationPanel

**File:** `src/components/ui/ValidationPanel.tsx:24`

**Purpose:** Displays validation status and messages (errors, warnings, info) in a collapsible panel.

**When to Use:**

- Job template validation
- Profile validation
- Form validation with multiple messages

**Props:**

```typescript
interface ValidationPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isValid: boolean | null; // null = validating
  errorCount: number;
  warningCount: number;
  infoCount: number;
  messages: ValidationMessage[];
  className?: string;
}

interface ValidationMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/researching-view.tsx:136
import { ValidationPanel } from '@/components/ui/ValidationPanel';
import { useJobValidation } from '../hooks';

const validation = useJobValidation({
  content: editorContent,
  isExtracting: job.isExtracting,
  hasError: !!job.extractionError,
});

<ValidationPanel
  isCollapsed={isValidationCollapsed}
  onToggle={toggleValidationCollapsed}
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

- ✅ Built on top of `CollapsiblePanel`
- ✅ Automatic status icons (⏳ validating, ✓ valid, ✗ invalid)
- ✅ Color-coded message counts
- ✅ Pairs perfectly with `useJobValidation` hook

---

### 4. EditorHeader

**File:** `src/components/ui/EditorHeader.tsx:14`

**Purpose:** Standard header layout with title, subtitle, and action buttons.

**When to Use:**

- Top of editor views (ResearchingView, DraftingView)
- Any section that needs a title + actions

**Props:**

```typescript
interface EditorHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode; // Action buttons
  className?: string;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/researching-view.tsx:156
import { EditorHeader } from '@/components/ui/EditorHeader';
import { StatusSelector } from '@/components/ui/StatusSelector';

<EditorHeader
  title={parsedJob.jobTitle || 'Untitled Position'}
  subtitle={`at ${parsedJob.company || 'Unknown Company'}`}
  actions={
    <StatusSelector
      currentStatus={job.applicationStatus}
      onStatusChange={(newStatus) =>
        onSaveField(index, 'applicationStatus', newStatus)
      }
    />
  }
/>
```

**Key Features:**

- ✅ Consistent header layout across all views
- ✅ Optional subtitle for context
- ✅ Flexible action area (buttons, dropdowns, status selectors)
- ✅ CSS handles responsive layout

---

### 5. EditorToolbar

**File:** `src/components/ui/EditorToolbar.tsx:17`

**Purpose:** Composite toolbar combining `TabBar` and `Dropdown` for document navigation and export.

**When to Use:**

- DraftingView with multiple documents
- Any multi-tab editor with export functionality

**Props:**

```typescript
interface EditorToolbarProps {
  documentKeys: string[];
  documentLabels: Record<string, string>;
  activeTab: string;
  exportDropdownOpen: boolean;
  onTabChange: (key: string) => void;
  onToggleExportDropdown: () => void;
  onCloseExportDropdown: () => void;
  onExport: (type: 'md' | 'pdf') => void;
  onSynthesizeClick: () => void;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/drafting-view.tsx:198
import { EditorToolbar } from '@/components/ui/EditorToolbar';

<EditorToolbar
  documentKeys={documentKeys}
  documentLabels={documentLabels}
  activeTab={activeTab}
  exportDropdownOpen={isExportDropdownOpen}
  onTabChange={setActiveTab}
  onToggleExportDropdown={() => setIsExportDropdownOpen((prev) => !prev)}
  onCloseExportDropdown={() => setIsExportDropdownOpen(false)}
  onExport={handleExport}
  onSynthesizeClick={handleOpenSynthesisModal}
/>
```

**Key Features:**

- ✅ Combines `TabBar` + `Dropdown` in standard layout
- ✅ Export to Markdown/PDF built-in
- ✅ LLM synthesis button included
- ✅ Reduces boilerplate in view components

---

### 6. TabBar

**File:** `src/components/ui/TabBar.tsx:19`

**Purpose:** Tab navigation for switching between multiple views/documents.

**When to Use:**

- Document navigation (cover letter, resume, etc.)
- Multi-view interfaces

**Props:**

```typescript
interface Tab {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  className?: string;
}
```

**Real Usage Example:**

```typescript
// From: src/components/ui/EditorToolbar.tsx:30
import { TabBar } from '@/components/ui/TabBar';

<TabBar
  tabs={documentKeys.map((key) => ({
    key,
    label: documentLabels[key] || key,
  }))}
  activeTab={activeTab}
  onTabChange={onTabChange}
/>
```

**Key Features:**

- ✅ Keyboard-accessible tabs
- ✅ Active state styling
- ✅ Generic key/label structure

---

### 7. Dropdown

**File:** `src/components/ui/Dropdown.tsx:23`

**Purpose:** Dropdown menu with toggle button, outside-click detection, and keyboard handling.

**When to Use:**

- Export menus
- Action menus
- Status selectors (though `StatusSelector` is more specialized)

**Props:**

```typescript
interface DropdownItem {
  label: string;
  icon?: string;
  onClick: () => void;
}

interface DropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  buttonLabel: string;
  buttonIcon?: string;
  items: DropdownItem[];
  className?: string;
}
```

**Real Usage Example:**

```typescript
// From: src/components/ui/EditorToolbar.tsx:46
import { Dropdown } from '@/components/ui/Dropdown';

<Dropdown
  isOpen={exportDropdownOpen}
  onToggle={onToggleExportDropdown}
  onClose={onCloseExportDropdown}
  buttonLabel="Export"
  buttonIcon="📥"
  items={[
    {
      label: 'Export as Markdown (.md)',
      icon: '📄',
      onClick: () => onExport('md'),
    },
    {
      label: 'Export as PDF (.pdf)',
      icon: '📑',
      onClick: () => onExport('pdf'),
    },
  ]}
  className="export-dropdown"
/>
```

**Key Features:**

- ✅ Outside-click detection with `useRef`
- ✅ Controlled open/close state
- ✅ Automatic menu positioning (CSS)
- ✅ Icon support for button and items

---

### 8. StatusSelector

**File:** `src/components/ui/StatusSelector.tsx:17`

**Purpose:** Specialized dropdown for changing job application status with color coding.

**When to Use:**

- Job status changes (Researching → Drafting → Applied, etc.)

**Props:**

```typescript
interface StatusSelectorProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  className?: string;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/researching-view.tsx:163
import { StatusSelector } from '@/components/ui/StatusSelector';

<StatusSelector
  currentStatus={job.applicationStatus}
  onStatusChange={(newStatus) =>
    onSaveField(index, 'applicationStatus', newStatus)
  }
/>
```

**Key Features:**

- ✅ Uses `statusOrder` and `statusColors` from config
- ✅ Color-coded select element (matches status badge colors)
- ✅ Simple controlled component

---

### 9. JobHeader

**File:** `src/components/ui/JobHeader.tsx:15`

**Purpose:** Displays job title, company name, and link to original posting.

**When to Use:**

- Top of job cards/views
- Anywhere you need to show job identity

**Props:**

```typescript
interface JobHeaderProps {
  jobTitle: string;
  company: string;
  url: string;
  className?: string;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/researching-view.tsx:155
import { JobHeader } from '@/components/ui/JobHeader';

<JobHeader
  jobTitle={parsedJob.jobTitle || 'Untitled Position'}
  company={parsedJob.company || 'Unknown Company'}
  url={job.url}
/>
```

**Key Features:**

- ✅ Automatic HTML escaping for security
- ✅ "View Job Posting" badge link
- ✅ Consistent layout across views

---

### 10. EditorContentPanel

**File:** `src/components/ui/EditorContentPanel.tsx:15`

**Purpose:** Textarea editor with collapsible "AI Thinking Process" panel for LLM streaming.

**When to Use:**

- Document editors in DraftingView
- Any textarea that streams LLM content

**Props:**

```typescript
interface EditorContentPanelProps {
  documentKey: string;
  isActive: boolean;
  value: string;
  placeholder: string;
  textareaRef: ((el: HTMLTextAreaElement | null) => void) | null;
  onChange: (value: string) => void;
  onBlur: () => void;
  index: number;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/drafting-view.tsx:245
import { EditorContentPanel } from '@/components/ui/EditorContentPanel';

{documentKeys.map((key) => (
  <EditorContentPanel
    key={key}
    documentKey={key}
    isActive={key === activeTab}
    value={documents[key]?.text || ''}
    placeholder={getDocumentPlaceholder(key)}
    textareaRef={key === activeTab ? textareaRef : null}
    onChange={(value) =>
      handleDocumentContentChange(key, {
        title: documents[key]?.title || documentLabels[key],
        text: value,
      })
    }
    onBlur={handleBlur}
    index={index}
  />
))}
```

**Key Features:**

- ✅ Includes thinking panel for LLM streaming (initially hidden)
- ✅ Active/inactive state for tab switching
- ✅ Auto-resize textareas with CSS
- ✅ Placeholder support

---

### 11. EditorFooter

**File:** `src/components/ui/EditorFooter.tsx:8`

**Purpose:** Footer displaying save status and word count.

**When to Use:**

- Bottom of editor views for status feedback

**Props:**

```typescript
interface EditorFooterProps {
  saveStatus: string;
  wordCount: number;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/researching-view.tsx:180
import { EditorFooter } from '@/components/ui/EditorFooter';

<EditorFooter
  saveStatus={saveStatus}
  wordCount={editorContent.split(/\s+/).filter(Boolean).length}
/>
```

**Key Features:**

- ✅ Simple, unobtrusive status indicator
- ✅ Word count display
- ✅ CSS-animated save status

---

## 🧩 Feature Components (`src/components/features/`)

### 1. JobViewRouter

**File:** `src/components/features/JobViewRouter.tsx:64`

**Purpose:** Eliminates duplication between job-details and sidepanel by routing to appropriate view based on job status.

**When to Use:**

- **ALWAYS** when rendering job views based on status
- Both job-details and sidepanel entrypoints

**Props:**

```typescript
interface JobViewRouterProps {
  job: Job | null;
  index: number;
  isChecklistExpanded: boolean;
  ResearchingView: React.ComponentType<ViewComponentProps>;
  DraftingView: React.ComponentType<ViewComponentProps>;
  onDeleteJob: (index: number) => void;
  onSaveField: (index: number, fieldName: string, value: string) => void;
  onSaveDocument: (index: number, key: string, data: Document) => void;
  onInitializeDocuments: (index: number) => void;
  onToggleChecklistExpand: (index: number, isExpanded: boolean) => void;
  onToggleChecklistItem: (index: number, itemId: string) => void;
  emptyStateMessage?: string;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/sidepanel/App.tsx:189
import { JobViewRouter } from '@/components/features/JobViewRouter';
import { ResearchingView } from '@/entrypoints/job-details/views/researching-view';
import { DraftingView } from '@/entrypoints/job-details/views/drafting-view';

<JobViewRouter
  job={currentJob}
  index={0}
  isChecklistExpanded={isChecklistExpanded}
  ResearchingView={ResearchingView}
  DraftingView={DraftingView}
  onDeleteJob={handleDeleteJob}
  onSaveField={handleSaveField}
  onSaveDocument={handleSaveDocument}
  onInitializeDocuments={handleInitializeDocuments}
  onToggleChecklistExpand={() => setIsChecklistExpanded((prev) => !prev)}
  onToggleChecklistItem={handleToggleChecklistItem}
  emptyStateMessage="No job selected. Extract a job from the button above."
/>
```

**Key Features:**

- ✅ Centralized view routing logic
- ✅ Eliminates switch statement duplication
- ✅ Provides WIP view for unimplemented statuses (Applied, Interviewing, etc.)
- ✅ Works with `ParsedJobProvider` for cached parsing

**Why This Component Exists:**

Before `JobViewRouter`, both job-details and sidepanel had identical switch statements for routing to views. Any change to routing logic required updating two places. Now it's DRY (Don't Repeat Yourself).

---

### 2. ParsedJobProvider

**File:** `src/components/features/ParsedJobProvider.tsx:71`

**Purpose:** Context provider that caches parsed MarkdownDB job data to avoid re-parsing on every render.

**When to Use:**

- **ALWAYS** wrap your app tree with this provider
- Access parsed data with `useParsedJob(jobId)` hook

**Props:**

```typescript
interface ParsedJobProviderProps {
  jobs: Job[]; // All jobs to make available
  children: React.ReactNode;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/sidepanel/App.tsx:176
import { ParsedJobProvider } from '@/components/features/ParsedJobProvider';

<ParsedJobProvider jobs={currentJob ? [currentJob] : []}>
  <JobViewRouter {...props} />
</ParsedJobProvider>

// In a child component (ResearchingView):
import { useParsedJob } from '@/components/features/ParsedJobProvider';

const parsed = useParsedJob(job.id);
const jobTitle = parsed?.topLevelFields['TITLE'] || 'Untitled';
const company = parsed?.topLevelFields['COMPANY'] || 'Unknown';
```

**Key Features:**

- ✅ **Lazy Parsing:** Only parses when requested (not on mount)
- ✅ **Content-Based Invalidation:** Re-parses when job content changes
- ✅ **Automatic Pruning:** Removes cache entries for deleted jobs
- ✅ **Performance Monitoring:** Logs cache stats (hit rate, size)
- ✅ **Persistent Cache:** Survives re-renders via `useRef`

**Cache Lifecycle:**

1. First access: Parse and store (cache miss)
2. Subsequent access: Return cached data (cache hit)
3. Content change: Detect via hash, re-parse (invalidation)
4. Job deletion: Remove from cache (pruning)

**Performance Impact:**

Without this provider, parsing happens on every render of every job view component. With this provider, parsing happens once per content change. **This is a 10-100x performance improvement for large job lists.**

---

### 3. JobViewChecklist

**File:** `src/components/features/JobViewChecklist.tsx:17`

**Purpose:** Wrapper for `Checklist` component that standardizes checklist rendering in job views.

**When to Use:**

- Inside ResearchingView and DraftingView
- Anywhere you need to display a job checklist

**Props:**

```typescript
interface JobViewChecklistProps {
  checklist: any;
  applicationStatus: string;
  jobIndex: number;
  isExpanded?: boolean;
  onToggleExpand: (index: number, isExpanded: boolean) => void;
  onToggleItem: (index: number, itemId: string) => void;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/job-details/views/researching-view.tsx:177
import { JobViewChecklist } from '@/components/features/JobViewChecklist';

<JobViewChecklist
  checklist={job.checklist}
  applicationStatus={job.applicationStatus}
  jobIndex={index}
  isExpanded={isChecklistExpanded}
  onToggleExpand={onToggleChecklistExpand}
  onToggleItem={onToggleChecklistItem}
/>
```

**Key Features:**

- ✅ Wraps low-level `Checklist` component
- ✅ Standardizes prop mapping (jobIndex, status, etc.)
- ✅ Sets `animate={false}` for performance

---

## 📐 Component CSS Architecture

**Critical Rule:** Shared components must import their own CSS.

### File Structure

- **Page-level CSS** (e.g., `entrypoints/popup/styles.css`):
  - Layout, typography, global variables
  - Page-specific classes (not used by shared components)
  - Imported in `main.tsx` or `App.tsx`

- **Component-level CSS** (e.g., `components/MyButton.css` or `views/my-view.css`):
  - Component-specific classes
  - Imported directly in component file: `import './MyButton.css'`
  - Ensures component works across all entrypoints

### Anti-pattern

❌ Shared component relies on page-level CSS → Missing styles when reused

### Correct pattern

✅ Shared component imports own CSS → Works everywhere

### Example

```typescript
// src/entrypoints/job-details/views/researching-view.tsx
import './researching-view.css'; // ✅ Component imports its own styles

export function ResearchingView({ job }: Props) {
  return <div className="researching-editor">...</div>;
}
```

**Why:** When components are shared across multiple entrypoints (e.g., sidepanel and job-details), they must bring their styles with them. Page-level CSS only affects that specific entrypoint.

**Reference:** `docs/refactors/component-css-architecture.md`

---

## 🔗 Related Documentation

- **📘 Quick Reference:** `docs/QUICK_REFERENCE.md`
- **📗 Hooks Reference:** `docs/HOOKS_REFERENCE.md`
- **📕 MarkdownDB Reference:** `docs/MARKDOWN_DB_REFERENCE.md`
- **📙 Architecture Guide:** `AGENTS.md`
- **📚 Component CSS:** `docs/refactors/component-css-architecture.md`
