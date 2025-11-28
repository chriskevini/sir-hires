# shadcn/ui + Tailwind CSS Migration Plan

## Overview

Migrate from hand-rolled CSS components to shadcn/ui + Tailwind CSS for:

- Consistent styling without CSS specificity conflicts
- Accessible, well-tested primitives (Radix UI)
- Reduced maintenance burden
- Better developer experience with utility classes

## Scope

- **28 CSS files** (~5500 lines) to delete
- **25+ component TSX files** to convert
- **4 entrypoints** to update (popup, sidepanel, job-details, profile)

---

## Phase 0: Pre-Migration Cleanup

### 0.1 Component Directory Reorganization

The current `ui/` directory contains domain-specific components that should be in `features/`. Reorganize before migration so shadcn components have a clean home.

**Directory principles:**

- **`ui/`** = Generic, reusable primitives (could be used in any project)
- **`features/`** = Domain-specific components (job tracking, synthesis, etc.)

**Components to move from `ui/` → `features/`:**

| Component            | Reason                  |
| -------------------- | ----------------------- |
| `EditorContentPanel` | Job editor specific     |
| `EditorFooter`       | Job editor specific     |
| `EditorHeader`       | Job editor specific     |
| `EditorToolbar`      | Job editor specific     |
| `JobFooter`          | Job-specific            |
| `JobHeader`          | Job-specific            |
| `NavigationButtons`  | Job navigation specific |
| `NewDocumentModal`   | Job document specific   |
| `SidepanelHeader`    | Sidepanel specific      |
| `SortIconButtons`    | Job list specific       |
| `StatusFilterDots`   | Job status specific     |
| `SynthesisFooter`    | Synthesis specific      |
| `ValidationPanel`    | Validation specific     |

**Components staying in `ui/` (true primitives):**

- `Button` → replaced by shadcn
- `Modal` → replaced by shadcn dialog
- `Dropdown` → replaced by shadcn dropdown-menu
- `CollapsiblePanel` → replaced by shadcn collapsible
- `TabBar` → custom, but generic enough
- `ProgressBar` → deprecated, delete
- `icons` → replaced by Lucide

**Migration commands:**

```bash
# Move domain components to features/
mv src/components/ui/EditorContentPanel.tsx src/components/features/
mv src/components/ui/EditorContentPanel.css src/components/features/
mv src/components/ui/EditorFooter.tsx src/components/features/
mv src/components/ui/EditorFooter.css src/components/features/
mv src/components/ui/EditorHeader.tsx src/components/features/
mv src/components/ui/EditorHeader.css src/components/features/
mv src/components/ui/EditorToolbar.tsx src/components/features/
mv src/components/ui/EditorToolbar.css src/components/features/
mv src/components/ui/JobFooter.tsx src/components/features/
mv src/components/ui/JobFooter.css src/components/features/
mv src/components/ui/JobHeader.tsx src/components/features/
mv src/components/ui/JobHeader.css src/components/features/
mv src/components/ui/NavigationButtons.tsx src/components/features/
mv src/components/ui/NavigationButtons.css src/components/features/
mv src/components/ui/NewDocumentModal.tsx src/components/features/
mv src/components/ui/NewDocumentModal.css src/components/features/
mv src/components/ui/SidepanelHeader.tsx src/components/features/
mv src/components/ui/SidepanelHeader.css src/components/features/
mv src/components/ui/SortIconButtons.tsx src/components/features/
mv src/components/ui/SortIconButtons.css src/components/features/
mv src/components/ui/StatusFilterDots.tsx src/components/features/
mv src/components/ui/StatusFilterDots.css src/components/features/
mv src/components/ui/SynthesisFooter.tsx src/components/features/
mv src/components/ui/SynthesisFooter.css src/components/features/
mv src/components/ui/ValidationPanel.tsx src/components/features/
mv src/components/ui/ValidationPanel.css src/components/features/
```

**Update imports:** Search and replace `@/components/ui/` → `@/components/features/` for moved components.

---

## Phase 1: Setup Infrastructure

### 1.1 Install Dependencies

```bash
# Tailwind CSS (Vite plugin)
npm install tailwindcss @tailwindcss/vite

# shadcn/ui dependencies
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install -D @types/node
```

### 1.2 Configure WXT for Tailwind

**wxt.config.ts:**

```typescript
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  outDir: '.output',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  // ... manifest config
});
```

### 1.3 Create Global CSS

**src/styles/globals.css:**

```css
@import 'tailwindcss';

/* shadcn/ui CSS variables for theming */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 262 83% 58%; /* Purple accent from current design */
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 262 83% 58%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 262 83% 58%;
    --primary-foreground: 210 40% 98%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 262 83% 58%;
  }
}
```

### 1.4 Add cn() Utility

**src/lib/utils.ts:**

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 1.5 Initialize shadcn

```bash
npx shadcn@latest init
```

Configure:

- Style: Default
- Base color: Neutral
- CSS variables: Yes
- Components directory: src/components/ui

### 1.6 Update Entrypoints

Import globals.css in each entrypoint's main.tsx:

- `src/entrypoints/popup/main.tsx`
- `src/entrypoints/sidepanel/main.tsx`
- `src/entrypoints/job-details/main.tsx`
- `src/entrypoints/profile/main.tsx`

---

## Phase 2: Replace UI Primitives with shadcn

### 2.1 Button (shadcn replacement)

**Current:** `src/components/ui/Button.tsx` + `Button.css`

```bash
npx shadcn@latest add button
```

**Variants mapping:**
| Current | shadcn |
|---------|--------|
| `primary` | `default` |
| `secondary` | `secondary` |
| `danger` | `destructive` |
| `subtle` | `ghost` |
| `link` | `link` |
| `ghost` | `ghost` |

**Additional:** Add `size="icon"` for icon-only buttons (fixes the JobSelector delete button issue permanently).

**Files to update:**

- All components importing `Button` from `@/components/ui/Button`

---

### 2.2 Dialog (replaces Modal)

**Current:** `src/components/ui/Modal.tsx` + `Modal.css`

```bash
npx shadcn@latest add dialog
```

**Migration pattern:**

```tsx
// Before
<Modal isOpen={open} onClose={onClose} title="Title">
  {children}
</Modal>

// After
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {children}
  </DialogContent>
</Dialog>
```

**Components using Modal:**

- `NewDocumentModal.tsx`
- `DuplicateJobModal.tsx`

---

### 2.3 DropdownMenu (replaces Dropdown)

**Current:** `src/components/ui/Dropdown.tsx` + `Dropdown.css`

```bash
npx shadcn@latest add dropdown-menu
```

**Migration pattern:**

```tsx
// Before
<Dropdown
  buttonLabel="Actions"
  buttonIcon="⚡"
  items={[
    { label: 'Edit', onClick: handleEdit },
    { label: 'Delete', onClick: handleDelete, variant: 'danger' },
  ]}
/>

// After
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="secondary">⚡ Actions <ChevronDown /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Components using Dropdown:**

- `EditorToolbar.tsx`
- `SidepanelHeader.tsx`

---

### 2.4 Collapsible (replaces CollapsiblePanel)

**Current:** `src/components/ui/CollapsiblePanel.tsx` (no dedicated CSS)

```bash
npx shadcn@latest add collapsible
```

**Migration pattern:**

```tsx
// Before
<CollapsiblePanel
  isCollapsed={collapsed}
  onToggle={toggle}
  header={<span>Header</span>}
>
  {content}
</CollapsiblePanel>

// After
<Collapsible open={!collapsed} onOpenChange={() => toggle()}>
  <CollapsibleTrigger>Header</CollapsibleTrigger>
  <CollapsibleContent>{content}</CollapsibleContent>
</Collapsible>
```

**Components using CollapsiblePanel:**

- `ValidationPanel.tsx`
- `JobTemplatePanel.tsx`

---

### 2.5 Tabs (replaces TabBar)

**Current:** `src/components/ui/TabBar.tsx` + `TabBar.css`

```bash
npx shadcn@latest add tabs
```

**Note:** Our TabBar has add/delete functionality. Keep as custom component but restyle with Tailwind, or extend shadcn Tabs.

---

### 2.6 Progress (replaces ProgressBar)

**Current:** `src/components/ui/ProgressBar.tsx` + `ProgressBar.css`

```bash
npx shadcn@latest add progress
```

**Note:** ProgressBar is marked `@deprecated` - verify if still used. May just delete.

---

### 2.7 Additional shadcn Components

```bash
npx shadcn@latest add input textarea badge separator tooltip scroll-area
```

---

### 2.8 Icon Migration (Lucide)

**Current:** `src/components/ui/icons.tsx` (16 custom SVG icons)

Lucide is installed as a shadcn dependency. Replace all custom icons:

| Current Icon       | Lucide Equivalent | Notes                         |
| ------------------ | ----------------- | ----------------------------- |
| `ChevronLeftIcon`  | `ChevronLeft`     |                               |
| `ChevronRightIcon` | `ChevronRight`    |                               |
| `ChevronUpIcon`    | `ChevronUp`       |                               |
| `ChevronDownIcon`  | `ChevronDown`     |                               |
| `ArrowUpIcon`      | `ArrowUp`         |                               |
| `ArrowDownIcon`    | `ArrowDown`       |                               |
| `ExtractIcon`      | `Download`        | Download tray with arrow      |
| `SpinnerIcon`      | `Loader2`         | Use with `animate-spin`       |
| `CloseIcon`        | `X`               |                               |
| `TrashIcon`        | `Trash2`          |                               |
| `MaximizeIcon`     | `Maximize2`       | Or `ExternalLink` for new tab |
| `CalendarIcon`     | `Calendar`        |                               |
| `BuildingIcon`     | `Building2`       |                               |
| `DocumentIcon`     | `FileText`        |                               |
| `ProfileIcon`      | `User`            |                               |
| `ArrowUpLeftIcon`  | `ArrowUpLeft`     |                               |

**Migration pattern:**

```tsx
// Before
import { TrashIcon, ChevronDownIcon } from '@/components/ui/icons';
<button>{TrashIcon}</button>;

// After
import { Trash2, ChevronDown } from 'lucide-react';
<button>
  <Trash2 className="h-4 w-4" />
</button>;
```

**Spinner with animation:**

```tsx
// Before (requires CSS animation)
<span className="spinner">{SpinnerIcon}</span>

// After (built-in Tailwind animation)
<Loader2 className="h-4 w-4 animate-spin" />
```

**Files to update:** Search for `from '@/components/ui/icons'` and update all imports.

**Cleanup:** Delete `src/components/ui/icons.tsx` after migration.

---

## Phase 3: Convert Domain Components to Tailwind

These components are domain-specific and won't be replaced by shadcn, but need CSS-to-Tailwind conversion.

### 3.1 Components to Convert

| Component                | CSS File                 | Complexity |
| ------------------------ | ------------------------ | ---------- |
| `JobSelector.tsx`        | `JobSelector.css`        | Medium     |
| `JobViewRouter.tsx`      | `JobViewRouter.css`      | Low        |
| `JobViewOverlay.tsx`     | `JobViewOverlay.css`     | Medium     |
| `JobHeader.tsx`          | `JobHeader.css`          | Medium     |
| `JobFooter.tsx`          | `JobFooter.css`          | Low        |
| `EditorHeader.tsx`       | `EditorHeader.css`       | Low        |
| `EditorFooter.tsx`       | `EditorFooter.css`       | Low        |
| `EditorContentPanel.tsx` | `EditorContentPanel.css` | Medium     |
| `EditorToolbar.tsx`      | `EditorToolbar.css`      | Medium     |
| `SidepanelHeader.tsx`    | `SidepanelHeader.css`    | Medium     |
| `NavigationButtons.tsx`  | `NavigationButtons.css`  | Low        |
| `StatusFilterDots.tsx`   | `StatusFilterDots.css`   | Low        |
| `SortIconButtons.tsx`    | `SortIconButtons.css`    | Low        |
| `SynthesisFooter.tsx`    | `SynthesisFooter.css`    | Low        |
| `ValidationPanel.tsx`    | `ValidationPanel.css`    | Medium     |

### 3.2 View Components

| Component             | CSS File              | Complexity |
| --------------------- | --------------------- | ---------- |
| `DraftingView.tsx`    | `DraftingView.css`    | High       |
| `ResearchingView.tsx` | `ResearchingView.css` | High       |
| `checklist.tsx`       | `checklist.css`       | Medium     |

### 3.3 Entrypoint Styles

| File                     | Complexity |
| ------------------------ | ---------- |
| `job-details/styles.css` | High       |
| `sidepanel/styles.css`   | High       |
| `popup/styles.css`       | Medium     |
| `profile/styles.css`     | Medium     |

---

## Phase 4: Custom Extended Components

### 4.1 StreamingTextarea

Extend shadcn Textarea for LLM streaming + MarkdownDB validation:

```tsx
// src/components/ui/streaming-textarea.tsx
interface StreamingTextareaProps extends TextareaProps {
  isStreaming?: boolean;
  validationErrors?: ValidationError[];
  onValidate?: (content: string) => void;
}

export const StreamingTextarea = forwardRef<
  HTMLTextAreaElement,
  StreamingTextareaProps
>(({ isStreaming, validationErrors, className, ...props }, ref) => {
  return (
    <div className="relative">
      <Textarea
        ref={ref}
        className={cn(
          isStreaming && 'border-primary animate-pulse',
          validationErrors?.length && 'border-destructive',
          className
        )}
        {...props}
      />
      {validationErrors?.map((err, i) => (
        <p key={i} className="text-sm text-destructive mt-1">
          {err.message}
        </p>
      ))}
    </div>
  );
});
```

### 4.2 StatusBadge

Custom badge with status colors from config:

```tsx
// src/components/ui/status-badge.tsx
export function StatusBadge({ status }: { status: string }) {
  const styles = statusStyles[status] || statusStyles['Researching'];
  return (
    <Badge style={{ backgroundColor: styles.color }} className="text-white">
      {status}
    </Badge>
  );
}
```

---

## Phase 5: Cleanup

### 5.1 Delete Old CSS Files

```bash
rm src/components/ui/*.css
rm src/components/features/*.css
rm src/entrypoints/job-details/components/*.css
rm src/entrypoints/job-details/views/*.css
rm src/entrypoints/job-details/styles.css
rm src/entrypoints/popup/styles.css
rm src/entrypoints/profile/styles.css
rm src/entrypoints/sidepanel/styles.css
```

### 5.2 Delete Replaced Components

```bash
rm src/components/ui/Button.tsx      # replaced by shadcn
rm src/components/ui/Modal.tsx       # replaced by shadcn dialog
rm src/components/ui/Dropdown.tsx    # replaced by shadcn dropdown-menu
rm src/components/ui/ProgressBar.tsx # deprecated, remove
rm src/components/ui/icons.tsx       # replaced by lucide-react
```

### 5.3 Update Documentation

- Update `AGENTS.md` with Tailwind/shadcn patterns
- Update `docs/COMPONENTS_REFERENCE.md`
- Update `docs/STYLE_GUIDE.md`

---

## Migration Checklist

### Phase 0: Pre-Migration Cleanup

- [ ] Move domain components from `ui/` to `features/` (13 components)
- [ ] Update imports for moved components

### Setup

- [ ] Install Tailwind + shadcn dependencies
- [ ] Configure wxt.config.ts with Tailwind plugin
- [ ] Create src/styles/globals.css with CSS variables (light + dark)
- [ ] Create src/lib/utils.ts with cn()
- [ ] Run `npx shadcn@latest init`
- [ ] Update all entrypoint main.tsx files

### shadcn Components

- [ ] Add and integrate `button`
- [ ] Add and integrate `dialog` (replace Modal)
- [ ] Add and integrate `dropdown-menu` (replace Dropdown)
- [ ] Add and integrate `collapsible` (replace CollapsiblePanel)
- [ ] Add and integrate `tabs`
- [ ] Add and integrate `progress`
- [ ] Add `input`, `textarea`, `badge`, `separator`, `tooltip`, `scroll-area`
- [ ] Migrate 16 custom icons to Lucide (see 2.8)

### Domain Components (CSS → Tailwind)

- [ ] JobSelector
- [ ] JobViewRouter
- [ ] JobViewOverlay
- [ ] JobHeader
- [ ] JobFooter
- [ ] EditorHeader
- [ ] EditorFooter
- [ ] EditorContentPanel
- [ ] EditorToolbar
- [ ] SidepanelHeader
- [ ] NavigationButtons
- [ ] StatusFilterDots
- [ ] SortIconButtons
- [ ] SynthesisFooter
- [ ] ValidationPanel
- [ ] NewDocumentModal
- [ ] DuplicateJobModal
- [ ] TabBar

### Views (CSS → Tailwind)

- [ ] DraftingView
- [ ] ResearchingView
- [ ] checklist

### Entrypoints (CSS → Tailwind)

- [ ] job-details App + styles
- [ ] sidepanel App + styles
- [ ] popup App + styles
- [ ] profile App + styles

### Custom Components

- [ ] Create StreamingTextarea
- [ ] Create StatusBadge

### Cleanup

- [ ] Delete all .css files
- [ ] Delete replaced component files (Button, Modal, Dropdown, ProgressBar)
- [ ] Delete `src/components/ui/icons.tsx` (replaced by Lucide)
- [ ] Update AGENTS.md
- [ ] Update docs/COMPONENTS_REFERENCE.md
- [ ] Update docs/STYLE_GUIDE.md

### Testing

- [ ] Test popup entrypoint
- [ ] Test sidepanel entrypoint
- [ ] Test job-details entrypoint
- [ ] Test profile entrypoint
- [ ] Verify all button variants work
- [ ] Verify modals open/close correctly
- [ ] Verify dropdowns position correctly
- [ ] Verify streaming textarea works
- [ ] Verify validation displays correctly
- [ ] Build production bundle
- [ ] Test in Chrome
- [ ] Test in Firefox (if applicable)

---

## Rollback Plan

If issues arise:

1. Git revert the migration PR
2. All old CSS files will be restored
3. No runtime dependencies changed (shadcn copies code, doesn't add deps)

---

## Estimated Effort

| Phase                      | Time           |
| -------------------------- | -------------- |
| Phase 0: Pre-migration     | 30 min         |
| Phase 1: Setup             | 30 min         |
| Phase 2: shadcn primitives | 2-3 hours      |
| Phase 3: Domain components | 3-4 hours      |
| Phase 4: Custom components | 1 hour         |
| Phase 5: Cleanup + docs    | 1 hour         |
| Testing                    | 1-2 hours      |
| **Total**                  | **9-13 hours** |

---

## Design Decisions (Resolved)

1. **Dark mode:** YES - Include in migration. Add `.dark` class CSS variables to globals.css.
2. **Icons:** YES - Replace all 16 custom SVG icons in `icons.tsx` with Lucide equivalents.
3. **Animations:** Use Tailwind animate classes (`animate-spin`, `animate-pulse`, etc.).
4. **Directory structure:** Keep `ui/` and `features/` separate, but reorganize misplaced components.
