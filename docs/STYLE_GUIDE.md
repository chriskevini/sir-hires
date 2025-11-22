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

// 6. Types
import type { Job } from '@/types';

// 7. Styles
import './MyComponent.css';
```

**Use `@/` path alias** for absolute imports (configured in `tsconfig.json`).

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

## 11. Testing Conventions

### Component Tests
```tsx
// src/components/JobCard.test.tsx
import { render, screen } from '@testing-library/react';
import { JobCard } from './JobCard';

describe('JobCard', () => {
  it('renders job title', () => {
    render(<JobCard title="Software Engineer" jobId="123" onSelect={jest.fn()} />);
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const handleSelect = jest.fn();
    render(<JobCard title="Software Engineer" jobId="123" onSelect={handleSelect} />);
    screen.getByRole('button').click();
    expect(handleSelect).toHaveBeenCalledWith('123');
  });
});
```

---

## 12. Migration-Specific Guidelines

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

## 13. Common Pitfalls

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

## 14. Pre-Commit Checklist

Before committing:
- [ ] Run `npm run lint` (fix critical errors)
- [ ] Run `npm run format` (auto-format code)
- [ ] Remove `console.log` statements (keep `error`, `warn`, `info` if needed)
- [ ] Verify all imports use `browser.*` not `chrome.*`
- [ ] Check that new components are in `src/components/`, not `src/entrypoints/`
- [ ] Ensure TypeScript compiles without errors (`npm run build`)

---

## 15. Modal & Overlay Patterns

### Understanding React Portals

**Portals are NOT a UI element type** - they're a **rendering technique** that allows components to render outside their parent's DOM hierarchy while staying in the React component tree.

```tsx
// Component stays in React tree (props/state flow normally)
<Sidebar>
  <Modal />  
</Sidebar>

// But DOM renders at document.body (escapes parent constraints)
ReactDOM.createPortal(<div>Modal</div>, document.body)
```

**When to Use Portals:**
- Modals and dialogs
- Tooltips and popovers
- Toast notifications
- Dropdown menus
- Context menus
- Any UI that needs to "break out" of parent container constraints

**Benefits:**
- Escape parent CSS constraints (overflow: hidden, z-index, position)
- Always render on top without z-index wars
- Event bubbling still works through React tree (not DOM tree)
- Maintains proper component communication via props/callbacks

---

### Pattern 1: Generic Modal Wrapper with Portal

Create a reusable `Modal` component that handles common modal concerns:

```tsx
// src/components/ui/Modal.tsx
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className = '' }: ModalProps) {
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render modal at document.body using Portal
  return ReactDOM.createPortal(
    <div 
      className={`modal-overlay ${isOpen ? 'visible' : ''}`}
      onClick={(e) => {
        // Close on overlay click (not content click)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`modal-content ${className}`}>
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="modal-close-btn" onClick={onClose}>
              &times;
            </button>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body // Render at document.body, not in parent component
  );
}
```

**Key Features:**
- ✅ Uses `createPortal()` to render at `document.body`
- ✅ Handles Escape key to close
- ✅ Closes on overlay click (not content click)
- ✅ Accepts custom className for styling
- ✅ Reusable across all modals

---

### Pattern 2: Separating Modal Content for Reusability

Extract business logic and UI into separate content components:

```tsx
// src/entrypoints/job-details/components/SynthesisForm.tsx
import React, { useState } from 'react';
import type { Job } from '../hooks';

interface SynthesisFormProps {
  job: Job;
  onGenerate: (result: { content: string }) => void;
  onCancel?: () => void;
}

export function SynthesisForm({ job, onGenerate, onCancel }: SynthesisFormProps) {
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [maxTokens, setMaxTokens] = useState(2000);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async () => {
    setIsGenerating(true);
    try {
      // Generation logic...
      const result = { content: '...' };
      onGenerate(result);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="synthesis-form">
      <div className="form-group">
        <label>Model:</label>
        <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
          <option value="gpt-4">GPT-4</option>
          <option value="claude-3">Claude 3</option>
        </select>
      </div>

      <div className="form-group">
        <label>Max Tokens:</label>
        <input 
          type="number" 
          value={maxTokens} 
          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
        />
      </div>

      <div className="form-actions">
        {onCancel && (
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
        <button onClick={handleSubmit} disabled={isGenerating} className="btn-primary">
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  );
}
```

**Benefits:**
- ✅ No modal-specific code (overlay, portals, etc.)
- ✅ Can be used in modal OR inline in sidepanel
- ✅ Easier to test (just test the form logic)
- ✅ Follows Single Responsibility Principle

---

### Pattern 3: Composing Modal with Content

**Usage as Modal:**
```tsx
// src/entrypoints/job-details/App.tsx
import { Modal } from '@/components/ui/Modal';
import { SynthesisForm } from './components/SynthesisForm';

function JobDetailsApp() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [job, setJob] = useState<Job>(...);

  const handleGenerate = (result: { content: string }) => {
    // Save generated content
    console.info('Generated:', result.content);
    setIsModalOpen(false);
  };

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>
        Synthesize Document
      </button>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Synthesize Document with LLM"
      >
        <SynthesisForm 
          job={job} 
          onGenerate={handleGenerate}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
```

**Usage Inline (No Modal):**
```tsx
// src/entrypoints/sidepanel/App.tsx
import { SynthesisForm } from '@/entrypoints/job-details/components/SynthesisForm';

function SidePanelApp() {
  const [job, setJob] = useState<Job>(...);

  const handleGenerate = (result: { content: string }) => {
    console.info('Generated:', result.content);
  };

  return (
    <div className="sidepanel">
      <h2>Quick Synthesis</h2>
      
      {/* Same component, used inline without modal wrapper */}
      <SynthesisForm 
        job={job} 
        onGenerate={handleGenerate}
      />
    </div>
  );
}
```

**Key Insight:** The `SynthesisForm` component doesn't know (or care) if it's rendered in a modal or inline. This is maximum flexibility.

---

### When to Extract Content Components

**Extract content when:**
- ✅ Building 3+ modals with similar structure (create generic `Modal` wrapper)
- ✅ Component will be used as modal AND inline in different contexts
- ✅ You want to test business logic separately from modal behavior
- ✅ Team is building multiple features that need modals

**Keep self-contained when:**
- ✅ Only 1-2 modals in the entire app
- ✅ Modal logic is simple and won't be reused
- ✅ Component is only ever used as a modal (never inline)

**Project Implementation:**
All modals in this project follow the generic wrapper + content separation pattern for consistency and maximum flexibility

---

### Best Practices

1. **Portal Rendering Location:** Always render modals/tooltips at `document.body`, not arbitrary DOM nodes
2. **Event Handling:** Remember that React event bubbling works through component tree, not DOM tree
3. **Focus Management:** Consider trapping focus within modal when open (accessibility)
4. **Body Scroll Lock:** Add `overflow: hidden` to `<body>` when modal is open to prevent background scrolling
5. **Animation:** Use CSS transitions on overlay/content, not on portal mount/unmount
6. **Z-Index:** Portals eliminate most z-index issues, but define a consistent z-index scale in your CSS

```css
/* Example CSS for generic modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: 0;
  transition: opacity 0.2s;
}

.modal-overlay.visible {
  opacity: 1;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

---

## 16. Resources

- [WXT Documentation](https://wxt.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API)

---

**Last Updated:** November 21, 2024  
**Maintained By:** Sir Hires Development Team
