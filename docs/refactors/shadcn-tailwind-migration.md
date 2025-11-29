# shadcn/ui + Tailwind CSS Migration Plan

## Overview

Migrate from hand-rolled CSS components to shadcn/ui + Tailwind CSS for:

- Consistent styling without CSS specificity conflicts
- Accessible, well-tested primitives (Radix UI)
- Reduced maintenance burden
- Better developer experience with utility classes

**Principle:** Prefer shadcn/ui components over hand-rolled solutions wherever possible. New features must use shadcn primitives. Maintainability > custom code.

## Current Status: ⏳ Phase 7 Pending

**Completed:**

- All CSS files deleted (~5500 lines removed)
- All components converted to Tailwind utilities
- shadcn primitives integrated (Button, Dialog, Dropdown, Sidebar, Sheet, Tooltip, AlertDialog, etc.)
- Lucide icons replaced custom SVG icons
- Color palette system with semantic tokens
- Unified JobSidebar with responsive behavior
- Phase 6.5: Raw HTML elements replaced with shadcn components
- Phase 6.6: Arbitrary CSS values replaced with Tailwind defaults

**Next:**

- Phase 7: Update documentation (COMPONENTS_REFERENCE.md, STYLE_GUIDE.md)
- Manual testing across entrypoints

## Original Scope

- **28 CSS files** (~5500 lines) to delete ✅
- **25+ component TSX files** to convert ✅
- **4 entrypoints** to update (popup, sidepanel, job-details, profile) ✅

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

- [x] Move domain components from `ui/` to `features/` (13 components)
- [x] Update imports for moved components

### Setup

- [x] Install Tailwind + shadcn dependencies
- [x] Configure wxt.config.ts with Tailwind plugin
- [x] Create src/styles/globals.css with CSS variables (light + dark)
- [x] Create src/lib/utils.ts with cn()
- [x] Run `npx shadcn@latest init`
- [x] Update all entrypoint main.tsx files

### shadcn Components

- [x] Add and integrate `button` (CVA + Radix Slot, kept our variant names)
- [x] Add and integrate `dialog` (Radix Dialog + backward-compatible Modal wrapper)
- [x] Add and integrate `dropdown-menu` (Radix + backward-compatible Dropdown wrapper)
- [x] Add and integrate `collapsible` (Radix Collapsible)
- [x] Add and integrate `tabs` (kept custom TabBar, converted to Tailwind)
- [x] ~~Add and integrate `progress`~~ (ProgressBar was deprecated, deleted)
- [x] Migrate 16 custom icons to Lucide (icons.tsx deleted)

### Domain Components (CSS → Tailwind)

- [x] JobSelector
- [x] JobViewRouter
- [x] JobViewOverlay
- [x] JobHeader
- [x] JobFooter
- [x] EditorHeader
- [x] EditorFooter
- [x] EditorContentPanel
- [x] EditorToolbar
- [x] SidepanelHeader
- [x] NavigationButtons
- [x] StatusFilterDots
- [x] SortIconButtons
- [x] SynthesisFooter
- [x] ValidationPanel
- [x] NewDocumentModal
- [x] DuplicateJobModal
- [x] TabBar

### Views (CSS → Tailwind)

- [x] DraftingView
- [x] ResearchingView
- [x] checklist

### Entrypoints (CSS → Tailwind)

- [x] job-details App + styles
- [x] sidepanel App + styles
- [x] popup App + styles
- [x] profile App + styles

### Custom Components

- [x] Create StreamingTextarea
- [x] Create StatusBadge

### Additional Refactors (Post-Migration)

- [x] Centralize status configuration with derived helpers (`src/config.ts`)
- [x] Migrate status colors to CSS variables for theming
- [x] Add color palettes system (`src/styles/palettes.css`)
- [x] Add warning semantic color token
- [x] Replace JobSelector with unified JobSidebar using shadcn Sidebar primitives
- [x] Remove redundant JobSidebarOverlay (shadcn Sidebar handles responsive behavior)
- [x] Unify ValidationPanel for job and profile validation
- [x] Extract useJobFilters hook and JobCard component

### Cleanup

- [x] Delete all .css files (all component + entrypoint CSS deleted)
- [x] Delete `src/components/ui/icons.tsx` (replaced by Lucide)
- [x] Delete `src/components/ui/ProgressBar.tsx` (deprecated, removed)
- [x] Keep Button/Modal/Dropdown/TabBar (converted to Tailwind/Radix, not deleted)
- [x] Replace hardcoded colors with shadcn theme tokens
- [x] Update AGENTS.md (condensed with links to reference docs)

### Testing

- [x] Build production bundle (verified - no errors)
- [ ] Test popup entrypoint (manual)
- [ ] Test sidepanel entrypoint (manual)
- [ ] Test job-details entrypoint (manual)
- [ ] Test profile entrypoint (manual)
- [ ] Verify all button variants work (manual)
- [ ] Verify modals open/close correctly (manual)
- [ ] Verify dropdowns position correctly (manual)
- [ ] Test in Chrome (manual)
- [ ] Test in Firefox (manual, if applicable)

---

## Rollback Plan

If issues arise:

1. Git revert the migration PR
2. All old CSS files will be restored
3. No runtime dependencies changed (shadcn copies code, doesn't add deps)

---

## Estimated Effort

| Phase                        | Time            | Status     |
| ---------------------------- | --------------- | ---------- |
| Phase 0: Pre-migration       | 30 min          | ✅ Done    |
| Phase 1: Setup               | 30 min          | ✅ Done    |
| Phase 2: shadcn primitives   | 2-3 hours       | ✅ Done    |
| Phase 3: Domain components   | 3-4 hours       | ✅ Done    |
| Phase 4: Custom components   | 1 hour          | ✅ Done    |
| Phase 5: Cleanup             | 30 min          | ✅ Done    |
| Phase 6: shadcn adoption     | 3-4 hours       | ⏳ Pending |
| Phase 6.5: Raw HTML → shadcn | 2-3 hours       | ⏳ Pending |
| Phase 6.6: Arbitrary CSS     | 1-2 hours       | ⏳ Pending |
| Phase 7: Documentation       | 1 hour          | ⏳ Pending |
| Testing                      | 1-2 hours       | ⏳ Pending |
| **Total**                    | **16-22 hours** |            |

---

## Design Decisions (Resolved)

1. **Dark mode:** YES - Include in migration. Add `.dark` class CSS variables to globals.css.
2. **Icons:** YES - Replace all 16 custom SVG icons in `icons.tsx` with Lucide equivalents.
3. **Animations:** Use Tailwind animate classes (`animate-spin`, `animate-pulse`, etc.). Added `tw-animate-css` for sidebar animations.
4. **Directory structure:** Keep `ui/` and `features/` separate, but reorganize misplaced components.
5. **Sidebar:** Use shadcn Sidebar primitives for responsive behavior (desktop sidebar → mobile Sheet at <768px).
6. **Color theming:** Implemented palettes system (`src/styles/palettes.css`) with semantic color tokens.

---

## Phase 6: Replace Remaining Hand-Rolled Components

Replace all remaining custom implementations with shadcn equivalents for consistency, accessibility, and maintainability.

### 6.1 CollapsiblePanel → Collapsible (High Priority)

**Current:** `src/components/ui/CollapsiblePanel.tsx`

- Manual state management and CSS transitions
- Missing keyboard support (Enter/Space to toggle)
- No ARIA attributes

**Target:** shadcn `Collapsible` (Radix primitive)

```bash
npx shadcn@latest add collapsible
```

**Migration:**

```tsx
// Before
<CollapsiblePanel isCollapsed={collapsed} onToggle={toggle} header={<span>Header</span>}>
  {content}
</CollapsiblePanel>

// After
<Collapsible open={!collapsed} onOpenChange={toggle}>
  <CollapsibleTrigger>{header}</CollapsibleTrigger>
  <CollapsibleContent>{content}</CollapsibleContent>
</Collapsible>
```

**Files to update:**

- `src/components/features/ValidationPanel.tsx`
- `src/entrypoints/job-details/components/JobTemplatePanel.tsx`

**Cleanup:** Delete `src/components/ui/CollapsiblePanel.tsx`

---

### 6.2 TabBar → Tabs (High Priority)

**Current:** `src/components/ui/TabBar.tsx`

- Custom browser-style tabs with add/delete functionality
- Missing arrow key navigation
- No roving tabindex

**Target:** shadcn `Tabs` (Radix primitive)

```bash
npx shadcn@latest add tabs
```

**Note:** TabBar has custom features (add tab, delete tab, browser-style design). Options:

1. Extend shadcn Tabs with custom trigger that includes add/delete buttons
2. Keep visual design but use Radix Tabs primitives internally for accessibility

**Files to update:**

- `src/entrypoints/job-details/App.tsx`
- `src/entrypoints/sidepanel/App.tsx`

---

### 6.3 StatusFilterDots → ToggleGroup (High Priority)

**Current:** `src/components/features/StatusFilterDots.tsx`

- Custom toggle buttons for multi-select status filtering
- Basic click handling, no keyboard support

**Target:** shadcn `ToggleGroup` with `type="multiple"`

```bash
npx shadcn@latest add toggle toggle-group
```

**Migration:**

```tsx
// Before
<StatusFilterDots activeStatuses={active} onToggle={handleToggle} />

// After
<ToggleGroup type="multiple" value={active} onValueChange={setActive}>
  {statuses.map(status => (
    <ToggleGroupItem key={status} value={status} style={{ backgroundColor: statusColor }}>
      <span className="sr-only">{status}</span>
    </ToggleGroupItem>
  ))}
</ToggleGroup>
```

**Files to update:**

- `src/components/features/StatusFilterDots.tsx` (refactor in place)
- Consumers in sidepanel/job-details

---

### 6.4 SortIconButtons → ToggleGroup (Medium Priority)

**Current:** `src/components/features/SortIconButtons.tsx:68-96`

- Custom icon buttons for mutually exclusive sort options
- Manual active state tracking

**Target:** shadcn `ToggleGroup` with `type="single"`

**Migration:** Similar to StatusFilterDots but with `type="single"` for mutual exclusion.

---

### 6.5 Checklist → Accordion + Checkbox (Medium Priority)

**Current:** `src/entrypoints/job-details/components/checklist.tsx:24-54`

- Custom expandable checklist with ~60 lines of animation logic
- Manual animation states ('expanding', 'collapsing', 'idle')
- Custom ref handling for height calculations

**Target:** shadcn `Accordion` + `Checkbox`

```bash
npx shadcn@latest add accordion checkbox
```

**Benefits:** Eliminates custom animation code, proper ARIA for expandable regions.

---

### 6.6 Alert States → Alert (Medium Priority)

**Current:** Multiple components with custom alert/message styling:

- `src/components/features/ValidationPanel.tsx:106-128` - Error/warning/info messages
- `src/components/features/EmptyState.tsx:15-35` - Empty state messaging
- `src/components/features/ErrorState.tsx:23-48` - Error state messaging

**Target:** shadcn `Alert` with variants

```bash
npx shadcn@latest add alert
```

**Variants needed:**

- `destructive` - errors
- `warning` - warnings (custom variant to add)
- `default` - info/neutral

---

### 6.7 Card Components → Card (Medium Priority)

**Current:** Multiple components with card-like styling:

- `src/components/features/JobCard.tsx:58-99` - Job list cards
- `src/components/features/NewDocumentModal.tsx:25-26` - Template selection cards

**Target:** shadcn `Card`

```bash
npx shadcn@latest add card
```

**Migration:**

```tsx
// Before (JobCard)
<div className="rounded-lg border p-4 hover:bg-muted/50">...</div>

// After
<Card className="hover:bg-muted/50">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

---

### 6.8 Popup Select → Select (Medium Priority)

**Current:** `src/entrypoints/popup/App.tsx:119-139`

- Native `<select>` element with custom styling
- Limited keyboard navigation
- Inconsistent with rest of UI

**Target:** shadcn `Select`

```bash
npx shadcn@latest add select
```

---

### 6.9 Form Inputs → Form Components (Low Priority)

**Current:** Various form inputs with inconsistent styling

**Target:** Complete form system

```bash
npx shadcn@latest add form label textarea
```

**Note:** Already have `input.tsx`. Add Form wrapper for validation integration if needed.

---

### Phase 6 Checklist

#### High Priority

- [ ] Replace CollapsiblePanel with Collapsible
- [ ] Replace/extend TabBar with Tabs primitives
- [ ] Replace StatusFilterDots with ToggleGroup

#### Medium Priority

- [ ] Replace SortIconButtons with ToggleGroup
- [ ] Replace checklist accordion with Accordion + Checkbox
- [ ] Add Alert component for ValidationPanel, EmptyState, ErrorState
- [ ] Add Card component for JobCard, NewDocumentModal
- [ ] Replace popup select with Select

#### Low Priority

- [ ] Add Form components for validation (if needed)

#### Cleanup

- [ ] Delete CollapsiblePanel.tsx after migration

---

## Phase 7: Documentation

Update documentation after all component APIs are finalized.

- [ ] Update docs/COMPONENTS_REFERENCE.md with new shadcn components
- [ ] Update docs/STYLE_GUIDE.md with shadcn usage patterns
- [ ] Review and update any outdated component examples

---

### Installation Commands (All Phase 6)

```bash
# High priority
npx shadcn@latest add collapsible
npx shadcn@latest add tabs
npx shadcn@latest add toggle toggle-group

# Medium priority
npx shadcn@latest add accordion checkbox
npx shadcn@latest add alert
npx shadcn@latest add card
npx shadcn@latest add select

# Low priority (if needed)
npx shadcn@latest add form label textarea
```

### Expected Impact

- **~200-300 lines** of custom code eliminated
- **Accessibility**: Full keyboard navigation, proper ARIA attributes, screen reader support
- **Consistency**: All interactive components use Radix primitives
- **Animations**: Smooth, consistent animations via Radix
- **Maintainability**: Less custom code, leveraging well-tested library code

---

## Phase 6.5: Replace Raw HTML Elements with shadcn Components (NEW)

Analysis revealed significant usage of raw HTML elements (`<input>`, `<textarea>`, styled `<a>`) that bypass existing shadcn components. This creates inconsistent styling, duplicated CSS classes (~3000 chars), and missing accessibility features.

### 6.5.1 Raw `<input>` → Input Component (High Priority)

**Current:** 11 instances of raw `<input>` elements with duplicated styling

| File                                          | Lines                                                       | Count | Description                                         |
| --------------------------------------------- | ----------------------------------------------------------- | ----- | --------------------------------------------------- |
| `src/entrypoints/popup/App.tsx`               | 76-82, 107-114, 177-190, 199-212, 233-246, 255-268, 342-349 | 7     | Server URL, API key, max tokens, temperature inputs |
| `src/components/features/SynthesisFooter.tsx` | 76-84                                                       | 1     | Tone input                                          |
| `src/components/features/JobSelector.tsx`     | 188-200                                                     | 1     | Search input                                        |

**Example of current duplication:**

```tsx
// ❌ CURRENT - repeated 11 times with ~100 chars each
<input
  type="text"
  className="flex-1 px-2 py-2 border border-border rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
/>;

// ✅ SHOULD BE
import { Input } from '@/components/ui/input';
<Input type="text" className="flex-1" />;
```

**Estimated savings:** ~1100 characters of duplicate CSS

---

### 6.5.2 Raw `<textarea>` → StreamingTextarea (High Priority)

**Current:** 2 instances of raw `<textarea>` that should use existing StreamingTextarea

| File                                                               | Lines | Description                      |
| ------------------------------------------------------------------ | ----- | -------------------------------- |
| `src/entrypoints/job-details/components/ExtractionLoadingView.tsx` | 37-44 | Readonly streaming display       |
| `src/entrypoints/job-details/components/ExtractionErrorView.tsx`   | 51-57 | Editable error recovery textarea |

**Migration:**

```tsx
// ❌ CURRENT
<textarea
  className="w-full min-h-[200px] p-3 font-mono text-sm border border-border rounded resize-y focus:outline-none focus:border-primary"
  value={editorContent}
  onChange={onEditorChange}
/>;

// ✅ SHOULD BE
import { StreamingTextarea } from '@/components/ui/StreamingTextarea';
<StreamingTextarea
  value={editorContent}
  onChange={(value) => onEditorChange({ target: { value } })}
  minHeight="200px"
/>;
```

---

### 6.5.3 Styled `<a>` → Button asChild (High Priority)

**Current:** 2 instances of `<a>` tags styled to look like buttons

| File                                                             | Lines | Description                             |
| ---------------------------------------------------------------- | ----- | --------------------------------------- |
| `src/entrypoints/job-details/components/MigrationPromptView.tsx` | 31    | "Re-Extract from Original Posting" link |
| `src/entrypoints/job-details/components/ExtractionErrorView.tsx` | 64    | Similar re-extract link                 |

**Migration:**

```tsx
// ❌ CURRENT
<a
  href={jobUrl}
  className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded font-semibold text-sm hover:bg-primary/90 transition-colors"
  target="_blank"
>
  Re-Extract ↗
</a>;

// ✅ SHOULD BE - uses Radix Slot pattern
import { Button } from '@/components/ui/Button';
<Button variant="primary" asChild>
  <a href={jobUrl} target="_blank" rel="noopener noreferrer">
    Re-Extract ↗
  </a>
</Button>;
```

---

### 6.5.4 Card-like Divs → Card Component (Medium Priority)

**Current:** 4 instances of div elements styled as cards

| File                                                             | Lines    | Description                 |
| ---------------------------------------------------------------- | -------- | --------------------------- |
| `src/entrypoints/popup/App.tsx`                                  | 160, 289 | Settings section containers |
| `src/entrypoints/job-details/components/ExtractionErrorView.tsx` | 31       | Error content container     |
| `src/entrypoints/job-details/components/MigrationPromptView.tsx` | 18       | Migration prompt container  |

**Migration:**

```tsx
// ❌ CURRENT
<div className="bg-muted border border-border rounded p-3 mt-1">{content}</div>;

// ✅ SHOULD BE
import { Card, CardContent } from '@/components/ui/card';
<Card className="mt-1">
  <CardContent className="p-3">{content}</CardContent>
</Card>;
```

---

### 6.5.5 Over-styled Button Components (Medium Priority)

**Current:** 7 instances where Button component is used but variant is overridden with extensive className

| File                                  | Lines                   | Count | Description                                           |
| ------------------------------------- | ----------------------- | ----- | ----------------------------------------------------- |
| `src/entrypoints/profile/App.tsx`     | 714, 739, 747, 755, 763 | 5     | Header buttons with ~150 chars of manual styling each |
| `src/entrypoints/job-details/App.tsx` | 398, 414                | 2     | Icon buttons with manual sizing                       |

**Example:**

```tsx
// ❌ CURRENT - variant="ghost" then overrides everything
<Button
  variant="ghost"
  className="border border-border rounded px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted/80 hover:border-border hover:text-foreground active:bg-muted flex items-center justify-center gap-1.5 shrink-0 transition-all duration-200"
>

// ✅ SHOULD BE - use appropriate variant
<Button variant="secondary" size="sm" className="gap-1.5">

// ✅ OR for icon buttons
<Button variant="ghost" size="icon">
```

**Options:**

1. Use existing variants properly (`secondary`, `ghost`, `size="icon"`)
2. Create new CVA variant if this pattern is intentional and reused

---

### 6.5.6 Native alert()/confirm() → AlertDialog (Medium Priority)

**Current:** 7 instances of native browser dialogs in `src/entrypoints/job-details/App.tsx`

| Lines                   | Type        | Usage                            |
| ----------------------- | ----------- | -------------------------------- |
| 202, 238, 246, 272, 276 | `alert()`   | Success/error messages           |
| 231-234, 260-267        | `confirm()` | Destructive action confirmations |

**Target:** shadcn `AlertDialog` for confirmations, Toast/Sonner for notifications

```bash
npx shadcn@latest add alert-dialog
npx shadcn@latest add sonner  # or toast
```

**Migration:**

```tsx
// ❌ CURRENT
const confirmed = confirm(
  'This will overwrite all current data. Are you sure?'
);

// ✅ SHOULD BE
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Restore Backup</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This will overwrite all current data.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleRestore}>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>;
```

---

### 6.5.7 Placeholder Toast → Sonner/Toast (Low Priority)

**Current:** `src/entrypoints/job-details/views/DraftingView.tsx:80-92`

```tsx
// ❌ CURRENT - placeholder that just logs
const showToast = (
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
) => {
  if (type === 'error') {
    console.error(message);
  } else {
    console.info(message);
  }
};
```

**Target:** shadcn Sonner (recommended) or Toast

```bash
npx shadcn@latest add sonner
```

---

### Phase 6.5 Checklist

#### High Priority

- [x] Replace 7 raw `<input>` in popup/App.tsx with Input component
- [x] Replace 1 raw `<input>` in SynthesisFooter.tsx with Input component
- [x] Replace 1 raw `<input>` in JobSelector.tsx with Input component
- [x] Replace 2 raw `<textarea>` with StreamingTextarea/Textarea
- [x] Replace 2 styled `<a>` with Button asChild pattern

#### Medium Priority

- [x] Replace 4 card-like divs with Card component
- [x] Refactor 5 over-styled buttons in profile/App.tsx
- [x] Refactor 2 over-styled buttons in job-details/App.tsx
- [x] Replace native alert()/confirm() with AlertDialog (useConfirmDialog hook + useAlertDialog hook)

---

## Phase 6.6: Replace Arbitrary CSS Values with Tailwind Defaults (NEW)

Analysis found 31 instances of arbitrary values in Tailwind classes. Replace with Tailwind's default scale for consistency and smaller bundle size.

### 6.6.1 Direct Replacements (High Priority)

These have exact Tailwind equivalents:

| File                                                   | Line | Current         | Replace With |
| ------------------------------------------------------ | ---- | --------------- | ------------ |
| `src/components/ui/sidebar.tsx`                        | 311  | `w-[2px]`       | `w-0.5`      |
| `src/entrypoints/job-details/components/checklist.tsx` | 129  | `max-w-[320px]` | `max-w-xs`   |
| `src/components/features/JobFooter.tsx`                | 200  | `max-w-[80px]`  | `max-w-20`   |
| `src/components/ui/select.tsx`                         | 76   | `min-w-[8rem]`  | `min-w-32`   |
| `src/components/ui/Dropdown.tsx`                       | 45   | `min-w-[8rem]`  | `min-w-32`   |

---

### 6.6.2 Close Replacements (Medium Priority)

These are close to Tailwind defaults - pick nearest value:

| File                                                             | Line   | Current         | Options                                   |
| ---------------------------------------------------------------- | ------ | --------------- | ----------------------------------------- |
| `src/components/ui/Modal.tsx`                                    | 37     | `max-w-[600px]` | `max-w-xl` (576px) or `max-w-2xl` (672px) |
| `src/components/ui/Dropdown.tsx`                                 | 63     | `min-w-[200px]` | `min-w-52` (208px) or `min-w-48` (192px)  |
| `src/components/features/SynthesisFooter.tsx`                    | 79     | `min-w-[150px]` | `min-w-36` (144px) or `min-w-40` (160px)  |
| `src/components/features/JobViewRouter.tsx`                      | 142    | `min-h-[300px]` | `min-h-72` (288px) or `min-h-80` (320px)  |
| `src/entrypoints/job-details/components/checklist.tsx`           | 129    | `min-w-[280px]` | `min-w-72` (288px)                        |
| `src/entrypoints/job-details/components/checklist.tsx`           | 136    | `max-h-[300px]` | `max-h-72` (288px) or `max-h-80` (320px)  |
| `src/entrypoints/job-details/components/ExtractionErrorView.tsx` | 53     | `min-h-[200px]` | `min-h-48` (192px) or `min-h-52` (208px)  |
| `src/components/features/NavigationButtons.tsx`                  | 45, 92 | `max-w-[100px]` | `max-w-24` (96px) or `max-w-28` (112px)   |
| `src/components/features/JobFooter.tsx`                          | 73     | `max-w-[400px]` | `max-w-sm` (384px) or `max-w-md` (448px)  |
| `src/components/features/JobFooter.tsx`                          | 73     | `min-w-[280px]` | `min-w-72` (288px)                        |
| `src/components/features/JobFooter.tsx`                          | 142    | `max-w-[140px]` | `max-w-36` (144px)                        |

---

### 6.6.3 Z-Index Standardization (Medium Priority)

Consider extending Tailwind theme or using standard scale:

| File                                      | Line     | Current     | Recommendation                                             |
| ----------------------------------------- | -------- | ----------- | ---------------------------------------------------------- |
| `src/components/ui/Modal.tsx`             | 20, 37   | `z-[10000]` | Extend theme: `z-modal: 10000` or use `z-50` if sufficient |
| `src/components/features/JobSelector.tsx` | 146, 159 | `z-[100]`   | Use `z-50` or extend theme                                 |
| `src/components/ui/TabBar.tsx`            | 48       | `z-[1]`     | Use `z-10`                                                 |

**Recommended theme extension:**

```js
// tailwind.config.js (or CSS variables)
theme: {
  extend: {
    zIndex: {
      'modal': '10000',
      'dropdown': '100',
    }
  }
}
```

---

### 6.6.4 Shadow Standardization (Low Priority)

Replace arbitrary shadows with Tailwind defaults:

| File                                            | Line    | Current                                | Replace With |
| ----------------------------------------------- | ------- | -------------------------------------- | ------------ |
| `src/components/ui/Dropdown.tsx`                | 63      | `shadow-[0_4px_12px_rgba(0,0,0,0.15)]` | `shadow-lg`  |
| `src/components/features/NavigationButtons.tsx` | 53-54   | `shadow-[0_2px_8px_rgba(0,0,0,0.1)]`   | `shadow-md`  |
| `src/components/features/NavigationButtons.tsx` | 100-101 | `shadow-[0_4px_12px_rgba(0,0,0,0.3)]`  | `shadow-lg`  |

**Note:** Some shadows have specific directions (upward shadows on TabBar, JobFooter). These may need to stay as arbitrary values or be added as custom utilities.

---

### 6.6.5 Acceptable Arbitrary Values (No Change Needed)

These are intentional and appropriate:

| File                    | Value                         | Reason                                    |
| ----------------------- | ----------------------------- | ----------------------------------------- |
| `Modal.tsx`             | `w-[90%]`, `max-h-[90vh]`     | Viewport-relative, no Tailwind equivalent |
| `NavigationButtons.tsx` | `text-[var(--nav-color,...)]` | CSS variable reference                    |
| `NewDocumentModal.tsx`  | `max-h-[70vh]`                | Viewport-relative                         |
| `JobFooter.tsx`         | `border-l-[6px]` etc.         | CSS triangle technique                    |
| `StatusBadge.tsx`       | `text-[10px]`                 | Intentionally smaller than `text-xs`      |

---

### Phase 6.6 Checklist

#### High Priority

- [x] Replace `w-[2px]` → `w-0.5` in sidebar.tsx
- [x] Replace `max-w-[320px]` → `max-w-xs` in checklist.tsx
- [x] Replace `max-w-[80px]` → `max-w-20` in JobFooter.tsx
- [x] Replace `min-w-[8rem]` → `min-w-32` in select.tsx and Dropdown.tsx
- [x] Replace `max-w-[400px] min-w-[280px]` → `max-w-sm min-w-72` in JobFooter.tsx
- [x] Replace `max-w-[140px]` → `max-w-36` in JobFooter.tsx
- [x] Replace `min-w-[200px]` → `min-w-52` in Dropdown.tsx
- [x] Replace `max-w-[100px]` → `max-w-24` in NavigationButtons.tsx

#### Medium Priority

- [x] Replace remaining arbitrary sizing values with nearest Tailwind default
- [x] Standardize z-index values (kept intentional high z-index for modals in browser extension context)
- [x] Replace arbitrary shadows with `shadow-md`, `shadow-lg` (Dropdown, NavigationButtons)

#### Low Priority

- [ ] Document intentional arbitrary values in STYLE_GUIDE.md
- [x] Kept custom upward shadows where needed (JobFooter, TabBar) - no Tailwind equivalent

---

## Installation Commands (All New Phases)

```bash
# Phase 6.5 - New shadcn components
npx shadcn@latest add alert-dialog
npx shadcn@latest add sonner

# Note: Input, Card, StreamingTextarea already exist
```

---

## Updated Estimated Effort

| Phase                            | Time            | Status     |
| -------------------------------- | --------------- | ---------- |
| Phase 0: Pre-migration           | 30 min          | ✅ Done    |
| Phase 1: Setup                   | 30 min          | ✅ Done    |
| Phase 2: shadcn primitives       | 2-3 hours       | ✅ Done    |
| Phase 3: Domain components       | 3-4 hours       | ✅ Done    |
| Phase 4: Custom components       | 1 hour          | ✅ Done    |
| Phase 5: Cleanup                 | 30 min          | ✅ Done    |
| Phase 6: shadcn adoption         | 3-4 hours       | ✅ Done    |
| **Phase 6.5: Raw HTML → shadcn** | **2-3 hours**   | ✅ Done    |
| **Phase 6.6: Arbitrary CSS**     | **1-2 hours**   | ✅ Done    |
| Phase 7: Documentation           | 1 hour          | ⏳ Pending |
| Testing                          | 1-2 hours       | ⏳ Pending |
| **Total**                        | **16-22 hours** |            |

---

## Summary of New Work Discovered

| Category                  | Count         | Estimated Savings   |
| ------------------------- | ------------- | ------------------- |
| Raw `<input>` elements    | 11            | ~1100 chars CSS     |
| Raw `<textarea>` elements | 2             | ~300 chars CSS      |
| Styled `<a>` as buttons   | 2             | ~300 chars CSS      |
| Card-like divs            | 4             | ~250 chars CSS      |
| Over-styled Buttons       | 7             | ~1050 chars CSS     |
| Native alert/confirm      | 7             | Better UX/a11y      |
| Arbitrary CSS values      | 31            | Consistency         |
| **Total**                 | **64 issues** | **~3000 chars CSS** |
