# Sir Hires - React + TypeScript Style Guide

This style guide establishes coding conventions for the Sir Hires WXT + React migration. Follow these patterns to ensure consistency across the codebase.

---

## 1. File Naming Conventions

### React Components

- **Format:** `PascalCase.tsx`
- **Examples:** `EditableField.tsx`, `SynthesisModal.tsx`, `JobDetailsView.tsx`
- **Rule:** All React component files must use `.tsx` extension and PascalCase naming

### Custom Hooks

- **Format:** `use[Name].ts`
- **Examples:** `useJobStorage.ts`, `useNavigation.ts`, `useTheme.ts`
- **Rule:** All hooks start with `use` prefix and use camelCase

### Utilities & Services

- **Format:** `kebab-case.ts`
- **Examples:** `job-parser.ts`, `llm-client.ts`, `profile-validator.ts`
- **Rule:** Non-component, non-hook files use kebab-case

### Type Definitions

- **Format:** `types.ts` or `[domain].types.ts`
- **Examples:** `types.ts`, `job.types.ts`, `navigation.types.ts`
- **Rule:** Place shared types in dedicated files, not inline in components

---

## 2. Component Structure

### Functional Components

All components must be functional components using React Hooks. **No class components.**

```tsx
// ✅ GOOD: Functional component with TypeScript
interface JobCardProps {
  jobId: string;
  title: string;
  onSelect: (id: string) => void;
}

export function JobCard({ jobId, title, onSelect }: JobCardProps) {
  const [isSelected, setIsSelected] = useState(false);

  const handleClick = () => {
    setIsSelected(true);
    onSelect(jobId);
  };

  return (
    <div onClick={handleClick} className={isSelected ? 'selected' : ''}>
      <h3>{title}</h3>
    </div>
  );
}

// ❌ BAD: Class component
class JobCard extends React.Component {
  // ...
}
```

### Component File Organization

```tsx
// 1. Imports (external, then internal)
import { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';

// 2. Type/Interface definitions
interface MyComponentProps {
  // ...
}

// 3. Component definition
export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // Hooks first
  const [state, setState] = useState();
  useEffect(() => {}, []);

  // Event handlers
  const handleClick = () => {};

  // Render
  return <div>...</div>;
}

// 4. Helper functions (if not extracted to utils)
function helperFunction() {}
```

---

## 3. Import Order

Follow this strict import order (enforced by ESLint in the future):

```tsx
// 1. External libraries
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// 2. WXT imports
import { browser } from 'wxt/browser';
import { storage } from 'wxt/storage';

// 3. Internal components
import { JobCard } from '@/components/JobCard';
import { Button } from '@/components/ui/Button';

// 4. Hooks
import { useJobStorage } from '@/hooks/useJobStorage';

// 5. Utils and services
import { parseJob } from '@/utils/job-parser';
import { cn } from '@/lib/utils';

// 6. Types
import type { Job } from '@/types';
```

**Use `@/` path alias** for absolute imports (configured in `tsconfig.json`).

**Note:** With Tailwind CSS, styles are applied via className attributes rather than imported CSS files.

---

## 4. Browser API Usage

**Critical Rule:** Always use the `browser.*` API, **NEVER** `chrome.*`.

```tsx
// ✅ GOOD: Cross-browser compatible
browser.runtime.sendMessage({ type: 'ACTION' });
browser.storage.local.get('key');
browser.tabs.query({ active: true });

// ❌ BAD: Chrome-specific
chrome.runtime.sendMessage({ type: 'ACTION' });
chrome.storage.local.get('key');
```

**Rationale:** WXT provides a `browser` polyfill that works across Chrome, Firefox, Safari, and Edge. Using `chrome.*` breaks cross-browser compatibility.

---

## 5. TypeScript Best Practices

### Avoid `any`

```tsx
// ✅ GOOD: Typed properly
interface MessagePayload {
  type: string;
  data: unknown; // Use unknown if truly dynamic
}

function handleMessage(message: MessagePayload) {}

// ❌ BAD: Using any
function handleMessage(message: any) {}
```

### Use Type Inference

```tsx
// ✅ GOOD: Let TypeScript infer
const [count, setCount] = useState(0); // Inferred as number

// ❌ BAD: Unnecessary explicit type
const [count, setCount] = useState<number>(0);
```

### Prefer `interface` over `type` for objects

```tsx
// ✅ GOOD: Interface for object shapes
interface User {
  id: string;
  name: string;
}

// ✅ ACCEPTABLE: Type for unions/primitives
type Status = 'idle' | 'loading' | 'success' | 'error';

// ❌ BAD: Type for simple objects (prefer interface)
type User = {
  id: string;
  name: string;
};
```

---

## 6. State Management

### WXT Storage for Persistence

Use `@wxt-dev/storage` for all persistent state (replaces `browser.storage` directly):

```tsx
// Define storage items in a central location (e.g., utils/storage.ts)
import { storage } from 'wxt/storage';

export const jobsStorage = storage.defineItem<Job[]>('local:jobs', {
  defaultValue: [],
});

// Use in components
import { jobsStorage } from '@/utils/storage';

function MyComponent() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    jobsStorage.getValue().then(setJobs);
  }, []);

  const addJob = async (job: Job) => {
    const updated = [...jobs, job];
    await jobsStorage.setValue(updated);
    setJobs(updated);
  };
}
```

### React State for UI-Only State

```tsx
// ✅ GOOD: Use useState for local UI state
const [isOpen, setIsOpen] = useState(false);
const [selectedTab, setSelectedTab] = useState('overview');

// ❌ BAD: Don't persist UI-only state unless explicitly needed
await storage.setValue('isModalOpen', true); // Unnecessary
```

---

## 7. Event Handlers

### Naming Convention

- **Pattern:** `handle[Event]` or `on[Event]`
- **Examples:** `handleClick`, `handleSubmit`, `onClose`, `onSelectJob`

```tsx
// ✅ GOOD: Clear handler names
function JobCard({ onSelect }: JobCardProps) {
  const handleClick = () => {
    onSelect(jobId);
  };

  return <div onClick={handleClick}>...</div>;
}

// ❌ BAD: Vague names
function JobCard() {
  const action = () => {}; // Unclear
  const click = () => {}; // Too generic
}
```

### Inline vs. Extracted Handlers

```tsx
// ✅ GOOD: Extract complex logic
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // Complex logic...
};

// ✅ ACCEPTABLE: Simple inline handlers
<button onClick={() => setCount(count + 1)}>Increment</button>

// ❌ BAD: Complex inline logic
<button onClick={(e) => {
  e.preventDefault();
  // 10 lines of logic...
}}>
```

---

## 8. WXT Entrypoint Patterns

### Background Scripts

```tsx
// src/entrypoints/background.ts
export default defineBackground(() => {
  // Service worker logic
  browser.runtime.onMessage.addListener((message) => {
    // Handle messages
  });
});
```

### Content Scripts (Headless)

```tsx
// src/entrypoints/content.ts
export default defineContentScript({
  matches: ['*://*.linkedin.com/*'],
  main() {
    // DOM manipulation logic
    console.log('Content script loaded');
  },
});
```

### Content Scripts (React UI)

```tsx
// src/entrypoints/overlay.content.tsx
import ReactDOM from 'react-dom/client';
import OverlayApp from '@/components/OverlayApp';
import './overlay.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui', // REQUIRED for Shadow DOM
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'my-overlay',
      position: 'inline',
      onMount: (container) => {
        const root = ReactDOM.createRoot(container);
        root.render(<OverlayApp />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });
    ui.mount();
  },
});
```

### UI Entrypoints (Popup, Options, etc.)

```tsx
// src/entrypoints/popup/index.html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Popup</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>

// src/entrypoints/popup/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// src/entrypoints/popup/App.tsx
export function App() {
  return <div>Popup Content</div>;
}
```

---

## 9. Console Logging

ESLint warns about `console.log`. Use these patterns:

```tsx
// ✅ ALLOWED: Error, warning, info
console.error('Failed to load job:', error);
console.warn('API key not configured');
console.info('Migration completed');

// ❌ DISCOURAGED: Debug logs in production code
console.log('Debug:', data); // Use browser DevTools or remove before commit
```

**During development:** It's acceptable to use `console.log` temporarily, but clean it up before committing.

---

## 10. Formatting Rules

Prettier enforces these automatically:

- **Semicolons:** Always use `;`
- **Quotes:** Single quotes `'` for strings (except JSX attributes use `"`)
- **Indent:** 2 spaces
- **Trailing Commas:** ES5 style (in arrays, objects)
- **Print Width:** 80 characters
- **Arrow Functions:** Always use parentheses around arguments

**Before committing:** Run `npm run format` to auto-format all files.

---

## 11. Styling with Tailwind CSS

This project uses **Tailwind CSS v4** with **shadcn/ui** components for styling.

### Core Tools

- **Tailwind CSS v4:** Utility-first CSS framework
- **shadcn/ui:** Radix UI primitives with Tailwind styling
- **CVA (class-variance-authority):** Type-safe component variants
- **cn() utility:** Merge Tailwind classes with conflict resolution

### The `cn()` Utility

Always use `cn()` from `@/lib/utils` to combine classes:

```tsx
import { cn } from '@/lib/utils';

// Merge base + conditional + prop classes
<div
  className={cn(
    'flex items-center gap-2', // Base classes
    isActive && 'bg-primary text-white', // Conditional
    className // Allow override from props
  )}
/>;
```

**Why `cn()`?** It uses `tailwind-merge` to resolve conflicts:

```tsx
cn('px-4', 'px-2'); // → 'px-2' (last wins, no duplicates)
```

### Component Variants with CVA

Use CVA for components with multiple variants:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  className?: string;
}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

### CSS Variables for Theming

Define theme colors as CSS variables in `globals.css`:

```css
@theme {
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.145 0 0);
  --color-primary: oklch(0.205 0 0);
  --color-primary-foreground: oklch(0.985 0 0);
}
```

Use in Tailwind classes:

```tsx
<div className="bg-background text-foreground" />
<button className="bg-primary text-primary-foreground" />
```

### Best Practices

1. **Use semantic color names:** `bg-primary` not `bg-blue-500`
2. **Always accept className prop:** Allow consumers to override styles
3. **Use CVA for variants:** Don't write manual conditional class logic
4. **Prefer Tailwind over custom CSS:** Only use custom CSS for complex animations
5. **Import globals.css once:** In each entrypoint's `main.tsx`
6. **Prefer Tailwind defaults over arbitrary values:** Use standard spacing/sizing

```tsx
// src/entrypoints/popup/main.tsx
import '@/styles/globals.css'; // Import once per entrypoint
```

### Intentional Arbitrary Values

Some arbitrary values are intentional for specific design requirements:

| Pattern                          | Reason                                          |
| -------------------------------- | ----------------------------------------------- |
| `z-[10000]`                      | High z-index for modals to overlay extension UI |
| `w-[90%]`, `max-h-[90vh]`        | Viewport-relative sizing for responsive modals  |
| `shadow-[0_-2px_8px_...]`        | Upward shadows for sticky footers/headers       |
| `border-[8px_solid_transparent]` | CSS triangles for dropdown carets               |

**Do NOT replace these** - they serve specific design purposes. Only replace arbitrary values that have close Tailwind equivalents (e.g., `max-w-[400px]` → `max-w-sm`).

---

## 12. Testing Conventions (PLACEHOLDER)

_Testing setup is pending. This section will be updated when testing infrastructure is added._

---

## 13. Migration-Specific Guidelines

### During Conversion from Vanilla to React

1. **Keep legacy code for reference:** The `chrome-extension/` directory stays until all features are converted
2. **Convert incrementally:** One entrypoint at a time (e.g., popup, then sidepanel, then job-details)
3. **Extract reusable components:** Move shared logic to `src/components/`
4. **Type everything:** Don't carry over `any` types from the old code
5. **Test as you go:** Ensure each converted feature works before moving to the next

### Deleting Legacy Code

Once a feature is fully converted and tested:

- Remove corresponding files from `chrome-extension/`
- Update PR description with migration status
- Final commit: Delete entire `chrome-extension/` directory

---

## 14. Common Pitfalls

### ❌ Don't Put Shared Code in `entrypoints/`

```
src/
  entrypoints/
    popup/
      App.tsx ✅
      Button.tsx ❌ (Move to src/components/ui/)
```

WXT treats every file in `entrypoints/` as a separate entrypoint. Shared components cause build errors.

### ❌ Don't Mix React and DOM Manipulation

```tsx
// ❌ BAD: Direct DOM manipulation in React
function MyComponent() {
  useEffect(() => {
    document.getElementById('root')!.innerHTML = '<div>Hello</div>';
  }, []);
}

// ✅ GOOD: Use React state and JSX
function MyComponent() {
  const [message, setMessage] = useState('Hello');
  return <div>{message}</div>;
}
```

### ❌ Don't Forget `cssInjectionMode: 'ui'`

When using Shadow DOM in content scripts, always set this option:

```tsx
export default defineContentScript({
  cssInjectionMode: 'ui', // REQUIRED
  // ...
});
```

---

## 15. Pre-Commit Checklist

Before committing:

- [ ] Run `npm run lint` (fix critical errors)
- [ ] Run `npm run format` (auto-format code)
- [ ] Remove `console.log` statements (keep `error`, `warn`, `info` if needed)
- [ ] Verify all imports use `browser.*` not `chrome.*`
- [ ] Check that new components are in `src/components/`, not `src/entrypoints/`
- [ ] Ensure TypeScript compiles without errors (`npm run build`)

---

## 16. Modal & Overlay Patterns (Radix UI + Tailwind)

This project uses **Radix UI primitives** with **Tailwind CSS** for modals and overlays. See `docs/COMPONENTS_REFERENCE.md` for the full `Modal` component API.

### Quick Usage

```tsx
import { Modal } from '@/components/ui/Modal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>

      <Modal
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Modal Title"
        description="Optional description text"
      >
        <p>Modal content goes here</p>
        <Button onClick={() => setIsOpen(false)}>Close</Button>
      </Modal>
    </>
  );
}
```

### Key Features (via Radix Dialog)

- **Accessibility:** Focus trapping, Escape key, ARIA attributes built-in
- **Portal rendering:** Automatically renders at document.body
- **Body scroll lock:** Prevents background scrolling when open
- **Overlay click:** Closes on backdrop click by default

### Advanced: Using Radix Primitives Directly

For complex modals, use the exported primitives:

```tsx
import {
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/Modal';

<DialogRoot>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogPortal>
    <DialogOverlay className="fixed inset-0 bg-black/50" />
    <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg">
      <DialogTitle>Custom Modal</DialogTitle>
      <DialogDescription>With full control over styling</DialogDescription>
      <DialogClose asChild>
        <Button variant="ghost">Close</Button>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</DialogRoot>;
```

### Dropdown Menus

Use the `Dropdown` component for context menus:

```tsx
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';

<Dropdown
  trigger={<Button variant="ghost">Actions</Button>}
  items={[
    { label: 'Edit', onClick: handleEdit },
    { label: 'Delete', onClick: handleDelete, variant: 'danger' },
  ]}
/>;
```

### Confirmation Dialogs (AlertDialog)

Use `AlertDialog` for confirmations instead of native `window.confirm()`:

```tsx
// Imperative pattern with useConfirmDialog hook
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

function MyComponent() {
  const { dialogState, confirm, closeDialog, handleOpenChange } =
    useConfirmDialog();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Job',
      description: 'This action cannot be undone.',
      variant: 'destructive',
    });
    if (confirmed) {
      await deleteJob();
    }
  };

  return (
    <>
      <Button onClick={handleDelete}>Delete</Button>

      <AlertDialog open={dialogState.isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogState.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogState.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>
              {dialogState.cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={dialogState.onConfirm}
              className={
                dialogState.variant === 'destructive' ? 'bg-destructive' : ''
              }
            >
              {dialogState.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

**See:** [COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md#3-alertdialog) and [HOOKS_REFERENCE.md](./HOOKS_REFERENCE.md#useconfirmdialog) for complete API.

### Best Practices

1. **Use the simple wrapper** (`Modal`, `Dropdown`) for standard use cases
2. **Use primitives** only when you need custom layout or behavior
3. **Apply Tailwind classes** directly to primitives for custom styling
4. **Never build modal/dropdown from scratch** - always use Radix primitives
5. **Use AlertDialog with hooks** for confirmation patterns instead of `window.confirm()`

---

## 17. Resources

- [WXT Documentation](https://wxt.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API)

---

**Last Updated:** November 28, 2024 (Added AlertDialog patterns and intentional arbitrary values)
**Maintained By:** Sir Hires Development Team
