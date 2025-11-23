# Quick Reference: Components & Hooks

## 🎯 Purpose

**This is your first stop when adding new functionality.** Before writing any UI code or business logic, check if a reusable component or hook already exists that solves your problem.

---

## 📚 Component Quick Lookup

### UI Components (`src/components/ui/`)

| Component            | Purpose                              | Key Props                                              | Location                    |
| -------------------- | ------------------------------------ | ------------------------------------------------------ | --------------------------- |
| `Modal`              | Portal-based modal with overlay      | `isOpen`, `onClose`, `title`, `children`               | `Modal.tsx:12`              |
| `CollapsiblePanel`   | Generic collapsible section          | `isCollapsed`, `onToggle`, `header`, `children`        | `CollapsiblePanel.tsx:15`   |
| `EditorHeader`       | Header with title + action buttons   | `title`, `subtitle`, `actions`                         | `EditorHeader.tsx:14`       |
| `EditorToolbar`      | Composite toolbar with tabs/dropdown | `documentKeys`, `activeTab`, `onTabChange`, `onExport` | `EditorToolbar.tsx:17`      |
| `EditorContentPanel` | Textarea with LLM thinking panel     | `documentKey`, `value`, `onChange`, `onBlur`           | `EditorContentPanel.tsx:15` |
| `EditorFooter`       | Footer with save status + word count | `saveStatus`, `wordCount`                              | `EditorFooter.tsx:8`        |
| `TabBar`             | Tab navigation                       | `tabs`, `activeTab`, `onTabChange`                     | `TabBar.tsx:19`             |
| `Dropdown`           | Dropdown menu with outside-click     | `isOpen`, `onToggle`, `items`                          | `Dropdown.tsx:23`           |
| `StatusSelector`     | Status dropdown with color coding    | `currentStatus`, `onStatusChange`                      | `StatusSelector.tsx:17`     |
| `ValidationPanel`    | Validation messages (collapsible)    | `isValid`, `errorCount`, `messages`                    | `ValidationPanel.tsx:24`    |
| `JobHeader`          | Job title + company + link           | `jobTitle`, `company`, `url`                           | `JobHeader.tsx:15`          |

### Feature Components (`src/components/features/`)

| Component           | Purpose                               | Key Props                                          | Location                   |
| ------------------- | ------------------------------------- | -------------------------------------------------- | -------------------------- |
| `JobViewRouter`     | Routes to view based on status        | `job`, `ResearchingView`, `DraftingView`, handlers | `JobViewRouter.tsx:64`     |
| `ParsedJobProvider` | Context for cached MarkdownDB parsing | `jobs`, `children`                                 | `ParsedJobProvider.tsx:71` |
| `JobViewChecklist`  | Checklist wrapper for job views       | `checklist`, `jobIndex`, `onToggleItem`            | `JobViewChecklist.tsx:17`  |

---

## 🪝 Hook Quick Lookup

### State Management Hooks

| Hook             | Purpose                     | Returns                                 | Location               |
| ---------------- | --------------------------- | --------------------------------------- | ---------------------- |
| `useToggleState` | Boolean toggle state        | `[state, toggle, setValue]`             | `useToggleState.ts:7`  |
| `useEditorState` | Textarea state + auto-reset | `{ content, handleChange, handleBlur }` | `useEditorState.ts:45` |
| `useJobState`    | Complete job state mgmt     | `JobState`                              | `useJobState.ts`       |

### Storage & Persistence Hooks

| Hook                | Purpose                    | Returns                          | Location               |
| ------------------- | -------------------------- | -------------------------------- | ---------------------- |
| `useJobStorage`     | Job storage operations     | Storage methods                  | `useJobStorage.ts`     |
| `useSimpleAutoSave` | Auto-save with debouncing  | `void`                           | `useSimpleAutoSave.ts` |
| `useBackupRestore`  | Import/export backup files | `{ handleImport, handleExport }` | `useBackupRestore.ts`  |

### Validation Hooks

| Hook                   | Purpose                  | Returns                    | Location                  |
| ---------------------- | ------------------------ | -------------------------- | ------------------------- |
| `useJobValidation`     | Debounced job validation | `ValidationResult \| null` | `useJobValidation.ts:33`  |
| `useProfileValidation` | Profile validation logic | Validation result          | `useProfileValidation.ts` |

### Business Logic Hooks

| Hook                 | Purpose                        | Returns                                | Location                    |
| -------------------- | ------------------------------ | -------------------------------------- | --------------------------- |
| `useJobExtraction`   | Job extraction logic + events  | `{ extracting, extractingJob, error }` | `useJobExtraction.ts:40`    |
| `useDocumentManager` | Document CRUD operations       | Document handlers                      | `useDocumentManager.ts`     |
| `useNavigation`      | View navigation logic          | Navigation handlers                    | `useNavigation.ts`          |
| `useParsedJob`       | Access parsed job from context | `JobTemplateData \| null`              | `ParsedJobProvider.tsx:169` |

### Utility Hooks

| Hook          | Purpose                     | Returns | Location         |
| ------------- | --------------------------- | ------- | ---------------- |
| `useDebounce` | Debounce callback execution | `void`  | `useDebounce.ts` |
| `useInterval` | Interval with cleanup       | `void`  | `useInterval.ts` |

---

## 🗺️ Decision Trees

### "I Need to Show..."

```
❓ Modal/Dialog → ✅ Modal.tsx
❓ Validation Messages → ✅ ValidationPanel.tsx
❓ Collapsible Section → ✅ CollapsiblePanel.tsx
❓ Tab Navigation → ✅ TabBar.tsx
❓ Dropdown Menu → ✅ Dropdown.tsx
❓ Status Selector → ✅ StatusSelector.tsx
❓ Job Title + Company → ✅ JobHeader.tsx
❓ Document Editor → ✅ EditorContentPanel.tsx + EditorToolbar.tsx
```

### "I Need to Manage..."

```
❓ Boolean State (toggle) → ✅ useToggleState
❓ Textarea Content → ✅ useEditorState
❓ Auto-Save → ✅ useSimpleAutoSave
❓ Job Validation → ✅ useJobValidation
❓ Job Parsing → ✅ useParsedJob (wrap with ParsedJobProvider)
❓ Job Storage → ✅ useJobStorage
❓ Document State → ✅ useDocumentManager
❓ View Navigation → ✅ useNavigation
❓ Debounced Callback → ✅ useDebounce
```

### "I'm Building a New View..."

```
1. Check if status-based routing is needed → JobViewRouter
2. Need job parsing? → Wrap with ParsedJobProvider + useParsedJob
3. Need validation UI? → ValidationPanel + useJobValidation
4. Need header? → EditorHeader
5. Need document editor? → EditorToolbar + EditorContentPanel + EditorFooter
6. Need checklist? → JobViewChecklist
7. Need auto-save? → useSimpleAutoSave
```

---

## 🚨 Top 5 Anti-Patterns

### ❌ 1. Duplicating Components

**Don't:** Copy-paste existing component logic into new files  
**Do:** Import and reuse `src/components/ui/*` components

### ❌ 2. Not Using ParsedJobProvider

**Don't:** Call `parseJobTemplate()` directly in components (re-parses every render)  
**Do:** Use `useParsedJob(jobId)` for cached parsing

### ❌ 3. Manual Toggle State

**Don't:** `useState` + manual `setIsOpen(!isOpen)` logic  
**Do:** Use `useToggleState(false)` → `[isOpen, toggle, setIsOpen]`

### ❌ 4. Manual Textarea Debouncing

**Don't:** `useState` + `setTimeout` + manual cleanup  
**Do:** Use `useEditorState()` for textarea state management

### ❌ 5. Component CSS in Page Files

**Don't:** Put shared component styles in `entrypoints/*/styles.css`  
**Do:** Import CSS directly in component file (see Component CSS Architecture)

---

## 🔗 Detailed Documentation

For complete usage examples, props, and implementation details:

- **📘 Components:** See `docs/COMPONENTS_REFERENCE.md`
- **📗 Hooks:** See `docs/HOOKS_REFERENCE.md`
- **📙 Architecture:** See `AGENTS.md`

---

## 🤖 AI Agent Quick Rules

### Before Creating ANY Component/Hook:

1. **🔍 Search this file** for existing components/hooks
2. **📖 Read detailed docs** (`COMPONENTS_REFERENCE.md` or `HOOKS_REFERENCE.md`)
3. **💡 Ask:** "Can I compose existing components instead?"
4. **✅ Only create new code** if no existing solution fits

### Red Flags That Trigger Reuse:

- ❗ "I need a modal" → `Modal` component
- ❗ "I need validation UI" → `ValidationPanel` + `useJobValidation`
- ❗ "I need collapsible section" → `CollapsiblePanel`
- ❗ "I need to toggle something" → `useToggleState`
- ❗ "I need to parse job data" → `useParsedJob` (wrap with `ParsedJobProvider`)
- ❗ "I need auto-save" → `useSimpleAutoSave`
- ❗ "I need to route based on status" → `JobViewRouter`

---

## Why Component Reuse Matters

### Cost of Duplication ❌

- Technical debt compounds over time
- Bug fixes must be applied in multiple places (high risk of missing one)
- UX becomes inconsistent across different parts of the app
- Code reviews take longer
- Refactoring becomes exponentially harder

### Benefits of Reuse ✅

- Bugs are fixed once, everywhere automatically benefits
- UX stays consistent across all entrypoints (popup, sidepanel, job-details)
- New features ship faster with battle-tested components
- Code reviews focus on business logic instead of reimplementing UI
- Refactoring is surgical - change in one place, propagates everywhere
- Codebase stays maintainable as complexity grows
