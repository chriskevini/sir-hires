# AGENTS.md: WXT + React Development Guide

## 1. Introduction

**WXT** (Web Extension Tools) framework for cross-browser web extensions with **React** UI.

**Core Philosophy:**

- Use `browser` global (not `chrome.*`) for cross-browser compatibility
- File-system routing via `entrypoints/` directory
- React Functional Components (`.tsx`) for all UI
- Manifest V3 by default

## 2. Project Structure

```text
src/
├── components/           # Shared React Components
│   ├── ui/               # Generic UI (Button, Modal, Dropdown)
│   └── features/         # Feature components (JobCard, ValidationPanel)
├── hooks/                # Custom React Hooks
├── utils/                # Shared utilities
├── lib/                  # Third-party utilities (cn())
├── tasks/                # LLM task definitions
├── styles/               # Global CSS (globals.css)
└── entrypoints/          # Maps to manifest.json
    ├── background.ts     # Service Worker
    ├── content.ts        # Content scripts
    ├── popup/            # Popup UI (index.html + main.tsx + App.tsx)
    ├── sidepanel/        # Sidepanel UI
    ├── job-details/      # Job Details page
    └── profile/          # Profile page
```

**Critical Rules:**

- UI entrypoints use folder pattern: `entrypoints/<name>/index.html` + `main.tsx`
- **NEVER** put shared code in `entrypoints/` - WXT treats every file as a separate entrypoint
- Shared components go in `src/components/`, hooks in `src/hooks/`

## 3. Reference Documentation

Before creating new components or hooks, **always check existing patterns:**

| Document                                                         | Purpose                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| [docs/QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md)             | Decision trees, quick lookups                            |
| [docs/COMPONENTS_REFERENCE.md](./docs/COMPONENTS_REFERENCE.md)   | UI components (Modal, Button, Dropdown, ValidationPanel) |
| [docs/HOOKS_REFERENCE.md](./docs/HOOKS_REFERENCE.md)             | Custom hooks (useJobStore, useToggleState, useParsedJob) |
| [docs/MARKDOWN_DB_REFERENCE.md](./docs/MARKDOWN_DB_REFERENCE.md) | MarkdownDB templates, storage patterns                   |
| [docs/STYLE_GUIDE.md](./docs/STYLE_GUIDE.md)                     | Code conventions, formatting rules                       |

## 4. Key Patterns

### Styling: Tailwind CSS + shadcn/ui

```typescript
import { cn } from '@/lib/utils';

// Always use cn() for combining classes
<div className={cn(
  'flex items-center gap-2',           // Base
  isActive && 'bg-primary text-white', // Conditional
  className                            // Props override
)} />
```

- Use semantic colors: `bg-primary`, `text-muted-foreground`, `bg-destructive`
- Use CVA for component variants (see `src/components/ui/Button.tsx`)
- Import `@/styles/globals.css` once per entrypoint in `main.tsx`

### MarkdownDB Storage

Store raw templates, parse on-read:

```typescript
// ✅ Store raw MarkdownDB in content field
interface Job {
  id: string;
  content?: string; // Raw template (single source of truth)
  url: string;
}

// ✅ Parse with memoization
const parsed = useMemo(
  () => parseJobTemplate(job.content || ''),
  [job.content]
);
```

**See:** [docs/MARKDOWN_DB_REFERENCE.md](./docs/MARKDOWN_DB_REFERENCE.md)

### State Management Decision Tree

```
Is this an LLM operation?
├─ YES → Use runTask() in component (src/utils/llm-task-runner.ts)
└─ NO → Is state shared across tabs/components?
    ├─ YES → Send message to background.ts
    └─ NO → Direct storage write
```

**Examples:**

- LLM extraction → `runTask()` with streaming
- Edit job field → Direct `storage.saveJob()`
- Change jobInFocus → `browser.runtime.sendMessage({ action: 'setJobInFocus' })`

### LLM Tasks

Tasks defined in `src/tasks/`, executed via `runTask()`:

```typescript
import { runTask, startKeepalive } from '@/utils/llm-task-runner';
import { jobExtractionConfig } from '@/tasks';

const stopKeepalive = startKeepalive(); // Prevent service worker termination
try {
  const result = await runTask({
    config: jobExtractionConfig,
    context: { rawText: pageContent },
    llmClient,
    onChunk: (delta) => setContent((prev) => prev + delta),
  });
} finally {
  stopKeepalive();
}
```

## 5. Code Quality

### Automated (Pre-Commit Hooks)

Husky + lint-staged runs automatically on commit:

- ESLint + Prettier on staged files
- Blocks commits with errors
- Bypass: `git commit --no-verify` (emergency only)

### Manual Scripts

```bash
npm run lint        # Check errors
npm run lint:fix    # Auto-fix
npm run format      # Format all
npm run validate    # Lint + format check
```

### Rules

- TypeScript required (`.ts`, `.tsx`)
- Use `browser.*` API, never `chrome.*`
- Avoid `any` - use proper types
- Use `console.warn/error/info`, not `console.log`
- Prefix unused variables with `_`

## 6. Agent Guidelines

**Before writing code:**

1. **Check reference docs** for existing components/hooks
2. **Follow file placement** rules (no shared code in `entrypoints/`)
3. **Use existing patterns** - don't reinvent

**Code patterns:**

- Wrap background scripts in `defineBackground`
- Wrap content scripts in `defineContentScript`
- Use `export default` for entrypoints
- Use ES modules (`import`/`export`)

**GitHub templates:**

- PRs: Follow `.github/PULL_REQUEST_TEMPLATE.md`
- Issues: Use `.github/ISSUE_TEMPLATE/*.yml`

**Common errors:**

| Error                     | Fix                                                         |
| ------------------------- | ----------------------------------------------------------- |
| RollupError               | Move shared components from `entrypoints/` to `components/` |
| "is not exported by"      | Use ES module exports, not CommonJS                         |
| Shadow DOM styles missing | Set `cssInjectionMode: 'ui'`                                |

## 7. Development

```bash
npm run dev          # Start dev server (Chrome)
wxt -b firefox       # Target Firefox
npm run build        # Production build
```
