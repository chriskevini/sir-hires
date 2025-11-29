# Components Reference

Complete reference for all reusable components in the project. For quick lookup, see `docs/QUICK_REFERENCE.md`.

---

## 🎨 UI Components (`src/components/ui/`)

### 1. Button

**File:** `src/components/ui/Button.tsx`

**Purpose:** Unified button component using CVA (class-variance-authority) and Radix Slot for composability.

**When to Use:**

- **ALWAYS** use this for any clickable button in the app
- Supports `asChild` prop to render as a different element (e.g., link)
- Supports ref forwarding for positioning (e.g., dropdowns)

**Props:**

```typescript
type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'subtle'
  | 'link'
  | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; // Default: 'primary'
  size?: ButtonSize; // Default: 'md'
  asChild?: boolean; // Use Radix Slot to render as child element
  children: React.ReactNode;
}
```

**Variants (Tailwind classes via CVA):**

| Variant     | Use Case                      | Tailwind Classes                                                     |
| ----------- | ----------------------------- | -------------------------------------------------------------------- |
| `primary`   | Main CTA (Save, Submit)       | `bg-primary text-primary-foreground hover:bg-primary/90`             |
| `secondary` | Cancel, Back                  | `bg-secondary text-secondary-foreground hover:bg-secondary/80`       |
| `danger`    | Delete, destructive actions   | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |
| `subtle`    | Dismiss, close                | `bg-muted text-muted-foreground hover:bg-muted/80`                   |
| `link`      | Inline actions                | `text-primary underline-offset-4 hover:underline`                    |
| `ghost`     | Toolbar buttons, icon buttons | `hover:bg-accent hover:text-accent-foreground`                       |

**Real Usage Examples:**

```typescript
import { Button } from '@/components/ui/Button';

// Primary CTA
<Button variant="primary" onClick={handleSave}>Save Changes</Button>

// Secondary action
<Button variant="secondary" onClick={handleCancel}>Cancel</Button>

// Danger action
<Button variant="danger" onClick={handleDelete}>Delete</Button>

// Small size
<Button variant="primary" size="sm">Small Button</Button>

// Ghost variant for toolbar buttons
<Button variant="ghost" size="sm">
  <Settings className="h-4 w-4" />
</Button>

// As link using Radix Slot
<Button variant="link" asChild>
  <a href="/docs">Read Documentation</a>
</Button>

// With additional Tailwind classes
<Button variant="primary" className="w-full">Full Width</Button>
```

**Key Features:**

- ✅ Built with CVA for type-safe variants
- ✅ Uses `cn()` utility for class merging
- ✅ `asChild` prop via Radix Slot for polymorphism
- ✅ Supports `forwardRef` for ref-based positioning
- ✅ All standard button attributes (`disabled`, `type`, `onClick`, etc.)
- ✅ Accepts additional `className` for custom Tailwind utilities

**Anti-Pattern:**

❌ Using raw `<button>` with inline styles or ad-hoc classes  
✅ Always use `<Button variant="...">` for consistency

---

### 2. Modal

**File:** `src/components/ui/Modal.tsx`

**Purpose:** Accessible modal dialog built on **Radix Dialog** primitives with Tailwind styling.

**When to Use:**

- Confirmation dialogs
- Forms that need focus (synthesis settings, export options)
- Content that should overlay everything

**Exports:**

The Modal component exports both a simple wrapper and Radix primitives:

```typescript
// Simple wrapper (recommended for most cases)
import { Modal } from '@/components/ui/Modal';

// Radix primitives (for advanced customization)
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Modal';
```

**Simple Wrapper Props:**

```typescript
interface ModalProps {
  isOpen: boolean; // Controls visibility
  onClose: () => void; // Called on escape/overlay click
  title?: string; // Optional header title
  children: React.ReactNode; // Modal content
  className?: string; // Additional Tailwind classes
}
```

**Real Usage Example (Simple Wrapper):**

```typescript
import { Modal } from '@/components/ui/Modal';

const [isSynthesisModalOpen, setIsSynthesisModalOpen] = useState(false);

<Modal
  isOpen={isSynthesisModalOpen}
  onClose={() => setIsSynthesisModalOpen(false)}
  title="Synthesize with LLM"
>
  <SynthesisForm
    documents={documents}
    onSynthesize={handleSynthesize}
    onClose={() => setIsSynthesisModalOpen(false)}
  />
</Modal>
```

**Real Usage Example (Radix Primitives):**

```typescript
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="secondary">Cancel</Button>
      </DialogClose>
      <Button variant="danger" onClick={handleConfirm}>
        Confirm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Key Features:**

- ✅ Built on Radix Dialog (accessible, focus-trapped)
- ✅ Escape key closes modal
- ✅ Click outside closes modal
- ✅ Styled with Tailwind CSS
- ✅ Supports both controlled (simple wrapper) and uncontrolled (primitives) usage
- ✅ Animations via Tailwind `animate-in`/`animate-out`

**Anti-Pattern:**

❌ Building custom modal with manual focus management  
✅ Use `Modal` component or Radix Dialog primitives

---

### 3. AlertDialog

**File:** `src/components/ui/alert-dialog.tsx`

**Purpose:** Accessible confirmation dialog built on **Radix AlertDialog** for destructive actions that require explicit user confirmation.

**When to Use:**

- Destructive actions (delete, overwrite, restore)
- Actions that cannot be undone
- Any action that requires explicit confirmation before proceeding

**Exports:**

```typescript
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
```

**Real Usage Example:**

```typescript
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/Button';

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="danger">Delete All Jobs</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete all jobs. This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDeleteAll}>
        Delete All
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**For programmatic confirm dialogs, use `useConfirmDialog` hook:**

```typescript
import { useConfirmDialog, ConfirmDialog } from '@/hooks/useConfirmDialog';

const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmDialog();

// In event handler
const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Delete Job',
    description: 'Are you sure you want to delete this job?',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger',
  });
  if (confirmed) {
    // perform delete
  }
};

// In JSX
<ConfirmDialog
  state={dialogState}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

**Key Features:**

- ✅ Built on Radix AlertDialog (accessible, focus-trapped)
- ✅ Requires explicit action (no click-outside to dismiss)
- ✅ Escape key cancels the dialog
- ✅ Styled with Tailwind CSS
- ✅ Supports both declarative (trigger-based) and imperative (Promise-based) usage

**Anti-Pattern:**

❌ Using native `window.confirm()` or `window.alert()`  
✅ Use `AlertDialog` or `useConfirmDialog` hook for consistent UX

---

### 4. CollapsiblePanel

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
// From: src/entrypoints/job-details/views/ResearchingView.tsx:136
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
// From: src/entrypoints/job-details/views/ResearchingView.tsx:156
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
// From: src/entrypoints/job-details/views/DraftingView.tsx:198
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

**File:** `src/components/ui/Dropdown.tsx`

**Purpose:** Accessible dropdown menu built on **Radix DropdownMenu** with Tailwind styling and **Lucide** icons.

**When to Use:**

- Export menus
- Action menus
- Overflow menus (icon-only trigger)
- Settings menus

**Exports:**

The Dropdown component exports both a simple wrapper and Radix primitives:

```typescript
// Simple wrapper (recommended for most cases)
import { Dropdown } from '@/components/ui/Dropdown';

// Radix primitives (for advanced customization)
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/Dropdown';
```

**Simple Wrapper Props:**

```typescript
interface DropdownItem {
  label: string;
  icon?: LucideIcon; // Lucide icon component
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface DropdownProps {
  buttonLabel: string;
  buttonIcon?: LucideIcon; // Lucide icon component
  iconOnly?: boolean; // When true, only shows icon (no label)
  items: DropdownItem[];
  className?: string;
}
```

**Real Usage Example (Simple Wrapper):**

```typescript
import { Dropdown } from '@/components/ui/Dropdown';
import { Download, FileText, FileImage } from 'lucide-react';

<Dropdown
  buttonLabel="Export"
  buttonIcon={Download}
  items={[
    {
      label: 'Export as Markdown',
      icon: FileText,
      onClick: () => handleExport('md'),
    },
    {
      label: 'Export as PDF',
      icon: FileImage,
      onClick: () => handleExport('pdf'),
    },
  ]}
/>

// Icon-only overflow menu
import { MoreVertical, Trash2 } from 'lucide-react';

<Dropdown
  buttonLabel="More options"
  buttonIcon={MoreVertical}
  iconOnly={true}
  items={[
    { label: 'Create Backup', onClick: handleCreateBackup },
    { label: 'Restore Backup', onClick: handleRestoreBackup },
    { label: 'Delete All', icon: Trash2, onClick: handleDeleteAll, variant: 'danger' },
  ]}
/>
```

**Real Usage Example (Radix Primitives):**

```typescript
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { Settings, LogOut, User } from 'lucide-react';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm">
      <Settings className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <User className="mr-2 h-4 w-4" />
      Profile
    </DropdownMenuItem>
    <DropdownMenuItem className="text-destructive">
      <LogOut className="mr-2 h-4 w-4" />
      Log out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Key Features:**

- ✅ Built on Radix DropdownMenu (accessible, keyboard navigable)
- ✅ Styled with Tailwind CSS
- ✅ Lucide icons integration
- ✅ Automatic positioning and collision detection
- ✅ Danger variant for destructive actions (red text)
- ✅ Animations via Tailwind `animate-in`/`animate-out`

**Icons:**

This component uses **Lucide React** icons. Import icons from `lucide-react`:

```typescript
import { Download, Trash2, MoreVertical, Settings } from 'lucide-react';
```

**Anti-Pattern:**

❌ Building custom dropdown with manual positioning  
✅ Use `Dropdown` component or Radix DropdownMenu primitives

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
// From: src/entrypoints/job-details/views/ResearchingView.tsx:163
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
// From: src/entrypoints/job-details/views/ResearchingView.tsx:155
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

### 10. JobFooter

**File:** `src/components/ui/JobFooter.tsx:27`

**Purpose:** Compact footer with status navigation buttons and expandable checklist drawer.

**When to Use:**

- Bottom of job views (ResearchingView, DraftingView)
- When you need navigation between statuses with checklist access

**Props:**

```typescript
interface JobFooterProps {
  status: string;
  checklist?: Record<string, ChecklistItem[]>;
  jobId: string;
  isChecklistExpanded: boolean;
  onNavigate: (targetStatus: string) => void;
  onToggleChecklist: (isExpanded: boolean) => void;
  onToggleChecklistItem: (jobId: string, itemId: string) => void;
  className?: string;
}
```

**Real Usage Example:**

```typescript
// From: src/components/features/JobViewRouter.tsx
import { JobFooter } from '@/components/ui/JobFooter';

<JobFooter
  status={job.applicationStatus}
  checklist={job.checklist}
  jobId={job.id}
  isChecklistExpanded={isChecklistExpanded}
  onNavigate={(targetStatus) => onSaveField(index, 'applicationStatus', targetStatus)}
  onToggleChecklist={(expanded) => onToggleChecklistExpand(index, expanded)}
  onToggleChecklistItem={(_, itemId) => onToggleChecklistItem(index, itemId)}
/>
```

**Key Features:**

- ✅ Back/Forward navigation buttons with status colors
- ✅ Expandable checklist drawer (expands upward)
- ✅ Dot indicators showing checklist progress
- ✅ Uses `progressConfig` for consistent status colors

**Layout:**

```
┌─────────────────────────────────────────┐
│  [← Back]     ○ ● ● ○ ○     [Forward →] │
└─────────────────────────────────────────┘
      ↑              ↑              ↑
   Left nav    Checklist dots   Right nav
```

---

### 11. StatusFilterDots

**File:** `src/components/ui/StatusFilterDots.tsx:19`

**Purpose:** Row of colored dots for filtering jobs by application status.

**When to Use:**

- Job list filtering controls
- Anywhere you need compact status filtering

**Props:**

```typescript
interface StatusFilterDotsProps {
  /** Array of selected statuses. Empty array = all statuses shown */
  selectedStatuses: string[];
  /** Callback when selection changes */
  onChange: (statuses: string[]) => void;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/job-details/App.tsx
import { StatusFilterDots } from '@/components/ui/StatusFilterDots';

const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

<StatusFilterDots
  selectedStatuses={selectedStatuses}
  onChange={setSelectedStatuses}
/>
```

**Key Features:**

- ✅ All dots filled = show all (no filter)
- ✅ Click dot to filter to that status only
- ✅ Click more dots to add to selection
- ✅ Click selected dot to deselect
- ✅ Uses `statusOrder` and `progressConfig` for colors
- ✅ Accessible with ARIA attributes

**Behavior:**

| State                     | Visual               | Meaning            |
| ------------------------- | -------------------- | ------------------ |
| Empty array               | All filled           | Show all jobs      |
| `['Drafting']`            | Only Drafting filled | Show only Drafting |
| `['Drafting', 'Applied']` | Two filled           | Show both statuses |

---

### 12. SortIconButtons

**File:** `src/components/ui/SortIconButtons.tsx:168`

**Purpose:** Icon-based sort controls for date, company, and title sorting.

**When to Use:**

- Job list sorting controls
- Compact sort UI without dropdown

**Props:**

```typescript
type SortField = 'date' | 'company' | 'title';
type SortDirection = 'asc' | 'desc';

interface SortIconButtonsProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onChange: (field: SortField, direction: SortDirection) => void;
}
```

**Real Usage Example:**

```typescript
// From: src/entrypoints/job-details/App.tsx
import { SortIconButtons, SortField, SortDirection } from '@/components/ui/SortIconButtons';

const [sortField, setSortField] = useState<SortField>('date');
const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

<SortIconButtons
  sortField={sortField}
  sortDirection={sortDirection}
  onChange={(field, direction) => {
    setSortField(field);
    setSortDirection(direction);
  }}
/>
```

**Key Features:**

- ✅ Click icon to sort by that field
- ✅ Click same icon again to reverse direction
- ✅ Active sort shows direction arrow (▲/▼)
- ✅ Smart defaults: date → descending, text → ascending
- ✅ Inline SVG icons for consistent rendering
- ✅ Accessible with ARIA attributes

**Icons:**

| Field     | Icon | Description   |
| --------- | ---- | ------------- |
| `date`    | 📅   | Calendar icon |
| `company` | 🏢   | Building icon |
| `title`   | 📄   | Document icon |

---

### 13. EditorContentPanel

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
// From: src/entrypoints/job-details/views/DraftingView.tsx:245
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

### 14. EditorFooter

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
// From: src/entrypoints/job-details/views/ResearchingView.tsx:180
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
// From: src/entrypoints/job-details/views/ResearchingView.tsx:177
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

## 🔗 Related Documentation

- **📘 Quick Reference:** `docs/QUICK_REFERENCE.md`
- **📗 Hooks Reference:** `docs/HOOKS_REFERENCE.md`
- **📕 MarkdownDB Reference:** `docs/MARKDOWN_DB_REFERENCE.md`
- **📙 Architecture Guide:** `AGENTS.md`
