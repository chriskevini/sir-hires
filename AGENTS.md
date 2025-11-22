# AGENTS.md: WXT + React Development Guide

## 1. Introduction

**WXT** (Web Extension Tools) is a next-generation framework for building cross-browser web extensions. This project utilizes **React** for all UI elements.

**Core Philosophy:**

- **Write Once, Run Everywhere:** Use the `browser` global (polyfill) instead of `chrome`.
- **File-System Routing:** The `entrypoints/` directory dictates the extension structure.
- **React-First:** All UI logic resides in React Functional Components (`.tsx`).
- **Manifest V3 Default:** The project targets MV3 by default.

## 2. Project Structure

The project follows the standard WXT directory layout. We use the **"Folder per Entrypoint"** pattern for UI pages to keep React files organized.

```text
my-extension/
├── .wxt/                   # [DO NOT TOUCH] Generated types and config
├── .output/                # [DO NOT TOUCH] Build artifacts
├── assets/                 # Static assets (processed by Vite)
├── public/                 # Public assets (copied as-is)
├── src/                    # Source code root (configure in wxt.config.ts)
│   ├── components/         # Shared React Components
│   │   ├── ui/             # Generic UI kit (buttons, inputs)
│   │   └── features/       # Feature-specific components
│   ├── hooks/              # Custom React Hooks
│   ├── utils/              # Shared utility functions
│   ├── assets/             # Source-specific assets (images, styles)
│   ├── entrypoints/        # VITAL: Maps directly to manifest.json
│   │   ├── background.ts   # Background script (Service Worker)
│   │   ├── content.ts      # Content scripts (Headless)
│   │   ├── popup/          # Popup UI Entrypoint
│   │   │   ├── index.html  # Entry HTML
│   │   │   ├── main.tsx    # Mounts React Root
│   │   │   └── App.tsx     # Main Popup Component
│   │   └── options/        # Options UI Entrypoint
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   └── App.tsx
├── wxt.config.ts           # WXT Configuration
├── package.json
├── tsconfig.json
└── .gitignore
```

### Critical Rules for `entrypoints/`

- **UI Entrypoints:** For React pages (Popup, Options), always use a directory: `entrypoints/<name>/`.
  - Must contain an `index.html` (the entrypoint).
  - Must contain a `main.tsx` (to mount the React app).
- **No Shared Code:** **NEVER** put shared components, utils, or styles inside `entrypoints/`. WXT treats _every_ file in this directory as a separate entrypoint. Move shared code to `src/components/` or `src/hooks/`.

## 3. Best Practices & Conventions

### React & Coding Style

- **Language:** TypeScript (`.ts`, `.tsx`) is mandatory.
- **Components:** Use Functional Components with Hooks.
- **Styling:** Import CSS/SCSS modules or Tailwind classes directly in `.tsx` files.
- **Browser API:** Always use the `browser` global (e.g., `browser.runtime.sendMessage`). **Do not use `chrome.*`.**

### State Management

- **Persistence:** Use **`@wxt-dev/storage`** for persisting data.
- **React Integration:** Create a hook to consume storage reactively if needed, or use `useEffect` to sync state on mount.

  ```typescript
  // src/utils/storage.ts
  import { storage } from 'wxt/utils/storage';

  export const themeItem = storage.defineItem<string>('local:theme', {
    defaultValue: 'light',
  });

  // Example usage in React component
  // const theme = await themeItem.getValue();
  ```

  **Note:** WXT has auto-imports enabled, so `storage` is available globally without explicit import in most files. However, for explicit imports, use `'wxt/utils/storage'`.

### MarkdownDB Storage Pattern

Store structured data as raw MarkdownDB templates in a `content` field. Parse on-read in components.

```typescript
// ✅ CORRECT - Store only content, no parsed fields
interface Job {
  id: string;
  content?: string;  // Raw MarkdownDB template (source of truth)
  url: string;
  applicationStatus: string;
  // ... metadata only
}

// ❌ WRONG - Do not add parsed fields like jobTitle, company
interface Job {
  jobTitle: string;   // ❌ Parse from content instead
  company: string;    // ❌ Parse from content instead
}

// ❌ WRONG - Do not store parsed fields
await storage.update({ jobTitle: 'Engineer', company: 'Acme' });

// ✅ CORRECT - Store only raw MarkdownDB
await storage.update({ content: '<JOB>\nTITLE: Engineer\nCOMPANY: Acme...' });

// ✅ CORRECT - Parse in components with useMemo
function JobView({ job }: { job: Job }) {
  const parsed = useMemo(
    () => parseJobTemplate(job.content || ''),
    [job.content]
  );
  return <h1>{parsed.jobTitle}</h1>;
}
```

**Why:** Single source of truth, no sync issues, LLM-streamable, human-editable.

**References:** `docs/refactors/markdown-db.md`, `src/utils/job-parser.ts`, `src/utils/profile-parser.ts`

### Modal Components & Portals

- **React Portals:** Use `ReactDOM.createPortal(element, document.body)` to render modals, tooltips, and dropdowns outside the parent DOM hierarchy while maintaining React component tree relationships.
- **Why Portals:** They allow components to escape parent CSS constraints (overflow, z-index, position) and always render on top without z-index conflicts.
- **Generic Wrapper Pattern:** Create a reusable `Modal` component in `src/components/ui/Modal.tsx` that handles overlay, close functionality, and portal rendering.
- **Content Separation:** Extract modal content into separate components (e.g., `SynthesisForm.tsx`) for maximum flexibility - these can be used as modals OR inline in other views.
- **When to Use This Pattern:**
  - Building 3+ modals with similar structure (create generic wrapper)
  - Component needs to be displayed as modal AND inline in different contexts
  - Need to avoid z-index/overflow issues with parent containers
- **File Placement:**
  - Generic modal wrapper: `src/components/ui/Modal.tsx`
  - Modal content components: `src/components/features/` or `src/entrypoints/<page>/components/`

### Content Script UIs (React)

To inject a React App into a webpage using Shadow DOM (isolated styles):

1.  Define the content script with `export default defineContentScript`.
2.  Set `cssInjectionMode: 'ui'` (Crucial for Shadow DOM).
3.  Use `createShadowRootUi`.
4.  Mount the React root inside the `onMount` callback.

```typescript
// src/entrypoints/overlay.content.tsx
import ReactDOM from 'react-dom/client';
import OverlayApp from '@/components/features/OverlayApp';
// Import styles so WXT bundles them for injection
import './overlay.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui', // REQUIRED for Shadow Root
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'react-overlay',
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

### Configuration (`wxt.config.ts`)

- **Modules:** Use `@wxt-dev/module-react` for auto-configuration.
- **Manifest:** Define permissions and other manifest settings here. MV3 is the default target.

  ```typescript
  // wxt.config.ts
  import { defineConfig } from 'wxt';

  export default defineConfig({
    srcDir: 'src',
    modules: ['@wxt-dev/module-react'],
    manifest: {
      permissions: ['storage', 'tabs'],
      action: {
        default_title: 'My Extension',
      },
    },
  });
  ```

### Code Quality & Linting

This project uses **ESLint** and **Prettier** to enforce code quality and consistent formatting, with **automated enforcement via pre-commit hooks**.

#### Automated Code Quality (Pre-Commit Hooks)

- **Husky + lint-staged:** Automatically runs on every commit
  - **Fast:** Only checks staged files (not entire codebase)
  - **Auto-fix:** Runs `eslint --fix` and `prettier --write` automatically
  - **Blocks bad commits:** Prevents commits with linting errors
  - **Zero config:** Installs automatically with `npm install`

- **What happens on commit:**
  1. Stage files: `git add src/myfile.ts`
  2. Commit: `git commit -m "feat: new feature"`
  3. Husky intercepts → lint-staged runs ESLint + Prettier
  4. If errors: commit blocked with error messages
  5. If warnings: auto-formats and commits successfully

- **Bypass (emergency only):** `git commit --no-verify`
  - Local hook bypassed, but CI/CD will still validate

#### Configuration Details

- **ESLint Configuration:** `eslint.config.js` (Flat config format)
  - Enforces TypeScript best practices
  - React hooks rules (rules-of-hooks, exhaustive-deps)
  - Warns on unused variables (prefix with `_` to ignore)
  - Warns on `any` types
  - Console statements allowed: `console.warn`, `console.error`, `console.info`

- **Prettier Configuration:** `.prettierrc`
  - Semicolons: required
  - Quotes: single quotes
  - Tab width: 2 spaces
  - Trailing commas: ES5
  - Print width: 80 characters
  - Arrow function parens: always

- **lint-staged Configuration:** `package.json`
  - `*.{ts,tsx}` → ESLint + Prettier
  - `*.{json,css,scss,md}` → Prettier only

#### Manual Scripts (Optional)

- `npm run lint` - Check for linting errors
- `npm run lint:fix` - Auto-fix linting errors
- `npm run format` - Format all code with Prettier
- `npm run format:check` - Check if code is formatted
- `npm run validate` - Run both lint and format checks

**Note:** Manual scripts are optional since pre-commit hooks handle this automatically. Use them for bulk fixes or CI/CD validation.

## 4. Workflow & CI/CD

### Development

- **Start Dev Server:** `wxt` (or `npm run dev`).
- **Target Browsers:** `wxt -b firefox` or `wxt -b chrome`.
- **Mocking:** Use `@webext-core/fake-browser` for logic testing.

### Testing (Vitest + React Testing Library)

1.  **Unit Tests:** Use `vitest` for logic/utils.
2.  **Component Tests:** Use `@testing-library/react` for UI components.

    ```typescript
    // Example Component Test
    import { render, screen } from '@testing-library/react';
    import MyComponent from './MyComponent';

    test('renders button', () => {
      render(<MyComponent />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
    ```

### CI/CD (GitHub Actions)

#### Lint Validation Workflow

**File:** `.github/workflows/lint.yml`

Automatically validates code quality on every push/PR:

- **Triggers:** Push to `main`, `develop`, `migrate/*` branches; PRs to `main`/`develop`
- **Checks:** Runs `npm run lint` and `npm run format:check`
- **Purpose:** Safety net for bypassed pre-commit hooks (`--no-verify`)

#### Deployment

Use `wxt submit` for automated publishing.

**`.github/workflows/publish.yml` Snippet:**

```yaml
- run: pnpm install
- run: pnpm build
- name: Submit
  run: pnpm wxt submit --chrome-zip .output/*-chrome.zip --firefox-zip .output/*-firefox.zip
  env:
    # Secrets configuration...
```

## 5. Agent Guidelines (Instructions for AI)

When generating code for this project, strictly adhere to these rules:

1.  **React Structure:**
    - UI Entrypoints must use the folder pattern: `entrypoints/<name>/index.html` + `main.tsx`.
    - Mounting logic goes in `main.tsx`. Component logic goes in `App.tsx`.
    - Reusable UI goes in `src/components/`.

2.  **File Placement:**
    - **Background:** `src/entrypoints/background.ts`
    - **Content Script:** `src/entrypoints/<name>.content.ts` (or `.tsx` if it has UI).
    - **Utils:** `src/utils/`.

3.  **Code Patterns:**
    - **WRAP** background script logic in `defineBackground`.
    - **WRAP** content script logic in `defineContentScript`.
    - **ALWAYS** use `export default` for entrypoint definitions.
    - **ALWAYS** use `browser.*` API, never `chrome.*`.
    - **USE** React Functional Components.
    - **USE** ES modules (`export`/`import`) instead of CommonJS (`module.exports`/`require`).

4.  **Code Quality:**
    - Follow the Prettier formatting rules (2 spaces, single quotes, semicolons, 80 char width).
    - Avoid `any` types where possible - use proper TypeScript types.
    - Prefix unused variables with `_` if they're intentionally unused.
    - Use `console.warn`, `console.error`, or `console.info` for logging (not `console.log`).
    - **Pre-commit hooks handle linting/formatting automatically** - no manual action needed.
    - If you need to fix issues in bulk: `npm run lint:fix && npm run format`.

5.  **Debugging:**
    - If "RollupError" occurs, check if shared React components were accidentally placed inside `entrypoints/`. Move them to `components/`.
    - Ensure `cssInjectionMode: 'ui'` is set if using `createShadowRootUi`.
    - If you see "is not exported by" errors, verify the file uses ES module exports, not CommonJS.
